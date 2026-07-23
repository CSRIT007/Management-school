import express from 'express'
import cors from 'cors'
import { db, checkConnection, pool } from './db.js'
import { getLanIp, printAppUrls } from './network.js'
import { signToken, verifyPassword, sanitizeUser } from './auth.js'
import { requireAuth, requireRole } from './middleware/auth.js'
import {
  listUsers,
  listTeachers,
  listStaff,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  setUserPassword,
  touchUserLogin,
  STAFF_ROLES,
  TEACHER_ROLE,
} from './users.js'
import { getFinanceOverview } from './finance.js'
import { writeAuditLog, listAuditLogs } from './auditLog.js'
import { calendarDate, todayCalendarDate } from './calendarDate.js'
import {
  getClassIdsForUser,
  getTeachersByClassIds,
  getTeachersForClass,
  setClassTeachers,
  userHasClass,
  getStudentIdsForTeacher,
  listActiveTeachers,
  assertNoTeacherScheduleConflicts,
} from './userClasses.js'

const app = express()
// Needed so req.ip / X-Forwarded-For are correct behind nginx / Cloudflare.
app.set('trust proxy', 1)
const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'

const ROLE = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin',
  FINANCE: 'finance',
  TEACHER: 'teacher',
}

const FINANCE_VIEW = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN, ROLE.FINANCE]
const FINANCE_EDIT = [ROLE.ADMIN, ROLE.FINANCE]
const STOCK_OPS = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN, ROLE.FINANCE]
const STOCK_MANAGE = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN]
const STUDENT_MANAGE = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN]
const STUDENT_VIEW = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN, ROLE.FINANCE, ROLE.TEACHER]
const CLASS_OPS = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN, ROLE.TEACHER]
const CLASS_MANAGE = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN]

async function attachTeachers(classes) {
  const map = await getTeachersByClassIds(classes.map((c) => c.id))
  return classes.map((cls) => {
    const teachers = map.get(cls.id) || []
    return {
      ...cls,
      teachers,
      teacherIds: teachers.map((t) => t.id),
    }
  })
}

async function assertTeacherClassAccess(req, classId) {
  if (req.user.role !== ROLE.TEACHER) return true
  const ok = await userHasClass(req.user.id, classId)
  if (!ok) {
    const err = new Error('You are not assigned to this class')
    err.status = 403
    throw err
  }
  return true
}

async function filterRowsForTeacher(req, col, rows) {
  if (req.user.role !== ROLE.TEACHER) return rows

  if (col === 'classes') {
    const ids = new Set(await getClassIdsForUser(req.user.id))
    return rows.filter((r) => ids.has(r.id))
  }

  if (col === 'students') {
    const studentIds = new Set(await getStudentIdsForTeacher(req.user.id))
    return rows.filter((r) => studentIds.has(r.id))
  }

  if (col === 'deadlines') {
    const studentIds = new Set(await getStudentIdsForTeacher(req.user.id))
    const students = await db.list('students')
    const names = new Set(
      students.filter((s) => studentIds.has(s.id)).map((s) => s.name)
    )
    return rows.filter((r) =>
      (r.studentId && studentIds.has(r.studentId)) || names.has(r.name)
    )
  }

  if (col === 'bookIssues') {
    const studentIds = new Set(await getStudentIdsForTeacher(req.user.id))
    const students = await db.list('students')
    const names = new Set(
      students.filter((s) => studentIds.has(s.id)).map((s) => s.name)
    )
    return rows.filter((r) => names.has(r.name))
  }

  return rows
}

app.use(cors())
app.use(express.json({ limit: '1mb' }))

function apiPath(req) {
  return (req.originalUrl || req.url || req.path || '').split('?')[0]
}

function apiAuth(req, res, next) {
  const path = apiPath(req)
  if (path === '/api/health' || path === '/api/auth/login') return next()
  if (path.startsWith('/api/')) return requireAuth(req, res, next)
  return next()
}

app.use(apiAuth)

// Health
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await checkConnection()
    res.json({ ok: true, database: 'connected', time: dbStatus.now })
  } catch (e) {
    res.status(503).json({ ok: false, database: 'disconnected', error: e.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const row = await getUserByEmail(email)
    if (!row || row.active === false) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!row.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await verifyPassword(password, row.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    await touchUserLogin(row.id)
    const user = sanitizeUser(row)
    const token = signToken(user)
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role }
    await writeAuditLog(req, {
      action: 'login',
      resourceType: 'auth',
      resourceId: user.id,
      summary: `Signed in as ${user.email}`,
    })
    res.json({ token, user })
  } catch (e) {
    console.error('POST /api/auth/login failed:', e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    if (!user || user.active === false) {
      return res.status(401).json({ error: 'Account is inactive or not found' })
    }
    res.json({ user })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

async function handleListAuditLogs(req, res) {
  try {
    const {
      limit = '50',
      offset = '0',
      resourceType = '',
      action = '',
      actorId = '',
      q = '',
      from = '',
      to = '',
    } = req.query || {}
    res.json(await listAuditLogs({
      limit,
      offset,
      resourceType,
      action,
      actorId,
      q,
      from,
      to,
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Must stay before /api/:col — otherwise "audit-logs" is treated as a collection name.
app.get('/api/admin/audit-logs', requireAuth, requireRole(ROLE.ADMIN), handleListAuditLogs)
app.get('/api/audit-logs', requireAuth, requireRole(ROLE.ADMIN), handleListAuditLogs)

app.get('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    res.json(await listUsers())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, active, phone, address, position, department, hireDate, note } = req.body || {}
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const user = await createUser({
      name, email, password, role, active, phone, address, position, department, hireDate, note,
    })
    await writeAuditLog(req, {
      action: 'create',
      resourceType: 'users',
      resourceId: user.id,
      summary: `Created user ${user.email} (${user.role})`,
      meta: { role: user.role, name: user.name },
    })
    res.status(201).json(user)
  } catch (e) {
    if (e.code === '23505' || e.status === 409) {
      return res.status(409).json({ error: e.message || 'Email already exists' })
    }
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.put('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { password, ...fields } = req.body || {}
    if (id === req.user.id && fields.active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' })
    }
    if (password != null && password !== '' && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const updated = await updateUser(id, fields)
    if (!updated) return res.status(404).json({ error: 'User not found' })
    if (password) {
      await setUserPassword(id, password)
    }
    await writeAuditLog(req, {
      action: password ? 'update_password' : 'update',
      resourceType: 'users',
      resourceId: id,
      summary: password
        ? `Updated user ${updated.email} and reset password`
        : `Updated user ${updated.email}`,
      meta: { role: updated.role, active: updated.active },
    })
    res.json(updated)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.put('/api/users/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body || {}
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const ok = await setUserPassword(req.params.id, password)
    if (!ok) return res.status(404).json({ error: 'User not found' })
    await writeAuditLog(req, {
      action: 'password_reset',
      resourceType: 'users',
      resourceId: req.params.id,
      summary: `Reset password for user ${req.params.id}`,
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PEOPLE_MANAGE = [ROLE.ADMIN, ROLE.SCHOOL_ADMIN]

function assertPeopleWriteAccess(actor, targetRole, nextRole) {
  if (actor.role === ROLE.ADMIN) return
  // School admin cannot create/edit Admin accounts
  if (targetRole === ROLE.ADMIN || nextRole === ROLE.ADMIN) {
    const err = new Error('Only Admin can manage Admin accounts')
    err.status = 403
    throw err
  }
}

app.get('/api/people/teachers', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    res.json(await listTeachers())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/people/teachers', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.name?.trim() || !body.email?.trim() || !body.password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (body.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const user = await createUser({ ...body, role: TEACHER_ROLE })
    await writeAuditLog(req, {
      action: 'create',
      resourceType: 'teachers',
      resourceId: user.id,
      summary: `Created teacher ${user.name} (${user.email})`,
    })
    res.status(201).json(user)
  } catch (e) {
    if (e.code === '23505' || e.status === 409) {
      return res.status(409).json({ error: e.message || 'Email already exists' })
    }
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.put('/api/people/teachers/:id', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    const existing = await getUserById(req.params.id)
    if (!existing || existing.role !== TEACHER_ROLE) {
      return res.status(404).json({ error: 'Teacher not found' })
    }
    const { password, role: _ignoreRole, ...fields } = req.body || {}
    if (req.params.id === req.user.id && fields.active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' })
    }
    if (password != null && password !== '' && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const updated = await updateUser(req.params.id, { ...fields, role: TEACHER_ROLE })
    if (password) await setUserPassword(req.params.id, password)
    await writeAuditLog(req, {
      action: password ? 'update_password' : 'update',
      resourceType: 'teachers',
      resourceId: req.params.id,
      summary: `Updated teacher ${updated?.name || req.params.id}`,
    })
    res.json(updated)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.get('/api/people/staff', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    res.json(await listStaff())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/people/staff', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    const body = req.body || {}
    const role = body.role || ROLE.SCHOOL_ADMIN
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Staff role must be admin, school_admin, or finance' })
    }
    assertPeopleWriteAccess(req.user, null, role)
    if (!body.name?.trim() || !body.email?.trim() || !body.password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (body.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const user = await createUser({ ...body, role })
    await writeAuditLog(req, {
      action: 'create',
      resourceType: 'staff',
      resourceId: user.id,
      summary: `Created staff ${user.name} (${user.role})`,
      meta: { role: user.role },
    })
    res.status(201).json(user)
  } catch (e) {
    if (e.code === '23505' || e.status === 409) {
      return res.status(409).json({ error: e.message || 'Email already exists' })
    }
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.put('/api/people/staff/:id', requireAuth, requireRole(...PEOPLE_MANAGE), async (req, res) => {
  try {
    const existing = await getUserById(req.params.id)
    if (!existing || !STAFF_ROLES.includes(existing.role)) {
      return res.status(404).json({ error: 'Staff member not found' })
    }
    const { password, ...fields } = req.body || {}
    const nextRole = fields.role || existing.role
    if (!STAFF_ROLES.includes(nextRole)) {
      return res.status(400).json({ error: 'Staff role must be admin, school_admin, or finance' })
    }
    assertPeopleWriteAccess(req.user, existing.role, nextRole)
    if (req.params.id === req.user.id && fields.active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' })
    }
    if (password != null && password !== '' && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const updated = await updateUser(req.params.id, { ...fields, role: nextRole })
    if (password) await setUserPassword(req.params.id, password)
    await writeAuditLog(req, {
      action: password ? 'update_password' : 'update',
      resourceType: 'staff',
      resourceId: req.params.id,
      summary: `Updated staff ${updated?.name || req.params.id}`,
      meta: { role: updated?.role },
    })
    res.json(updated)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.get('/api/payments/next-inv-id', requireRole(...FINANCE_VIEW), async (req, res) => {
  try {
    const id = await db.nextInvoiceId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Finance reporting
app.get('/api/finance/overview', requireRole(...FINANCE_VIEW), async (req, res) => {
  try {
    const { dateFrom = '', dateTo = '' } = req.query || {}
    res.json(await getFinanceOverview({ dateFrom, dateTo }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Reports (must be registered before /api/:col routes)
app.get('/api/reports/summary', requireRole(...STOCK_OPS), async (req, res) => {
  const products = await db.list('products')
  const lowStock = products.filter(p => (p.stock ?? 0) <= 3).length
  const today = todayCalendarDate()
  const orders = await db.list('orders')
  const todaySales = orders
    .filter(o => calendarDate(o.date) === today)
    .reduce((s,o) => s + (o.total || 0), 0)
  res.json({ totalProducts: products.length, lowStockItems: lowStock, totalSalesToday: todaySales })
})

app.get('/api/reports/sales-over-time', requireRole(...STOCK_OPS), async (req, res) => {
  const orders = await db.list('orders')
  const map = new Map()
  for (const o of orders) {
    const d = calendarDate(o.date)
    if (!d) continue
    map.set(d, (map.get(d) || 0) + (o.total || 0))
  }
  res.json(Array.from(map, ([date, total]) => ({ date, total })))
})

app.get('/api/reports/top-products', requireRole(...STOCK_OPS), async (req, res) => {
  const orders = await db.list('orders')
  const counts = new Map()
  for (const o of orders) {
    for (const li of o.items || []) {
      counts.set(li.name, (counts.get(li.name) || 0) + li.qty)
    }
  }
  const top = Array.from(counts, ([name, qty]) => ({ name, qty }))
    .sort((a,b) => b.qty - a.qty)
    .slice(0, 10)
  res.json(top)
})

app.get('/api/reports/low-stock', requireRole(...STOCK_OPS), async (req, res) => {
  const products = await db.list('products')
  const low = products.filter(p => (p.stock ?? 0) <= 3)
  res.json(low)
})

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [students, classes, payments, products] = await Promise.all([
      db.list('students'),
      db.list('classes'),
      db.list('payments'),
      db.list('products'),
    ])
    res.json({
      activeStudents: students.length,
      openClasses: classes.length,
      pendingPayments: payments.filter((p) => p.status === 'Pending').length,
      productsInStock: products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Generic collections
const valid = new Set(['students','classes','deadlines','payments','bookIssues','alumni','categories','programs','products','orders'])

const COLLECTION_ACCESS = {
  students: { read: STUDENT_VIEW, write: STUDENT_MANAGE },
  classes: { read: CLASS_OPS, write: STUDENT_MANAGE },
  deadlines: { read: CLASS_OPS, write: CLASS_OPS },
  payments: { read: FINANCE_VIEW, write: FINANCE_EDIT },
  bookIssues: { read: CLASS_OPS, write: CLASS_OPS },
  alumni: { read: CLASS_OPS, write: STUDENT_MANAGE },
  categories: { read: STOCK_MANAGE, write: STOCK_MANAGE },
  programs: { read: STUDENT_VIEW, write: STUDENT_MANAGE },
  products: { read: STOCK_OPS, write: STOCK_MANAGE },
  orders: { read: STOCK_OPS, write: STOCK_OPS },
}

function requireCollectionAccess(action) {
  return (req, res, next) => {
    const col = req.params.col
    const access = COLLECTION_ACCESS[col]
    if (!access) return res.status(404).json({ error: 'Unknown collection' })
    const allowed = access[action] || []
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action' })
    }
    return next()
  }
}

app.get('/api/teachers', requireRole(...CLASS_MANAGE), async (req, res) => {
  try {
    res.json(await listActiveTeachers())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/students/next-id', requireRole(...STUDENT_MANAGE), async (req, res) => {
  try {
    const id = await db.nextStudentId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/classes/next-id', requireRole(...STUDENT_MANAGE), async (req, res) => {
  try {
    const id = await db.nextClassId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/classes/:id/roster', requireRole(...CLASS_OPS), async (req, res) => {
  try {
    await assertTeacherClassAccess(req, req.params.id)
    const cls = await db.get('classes', req.params.id)
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    const [withTeachers] = await attachTeachers([cls])
    const students = await db.getClassRoster(req.params.id)
    const { enrolled, max } = db.parseCapacity(cls.capacity)
    res.json({ class: withTeachers, students, enrolled, max, capacity: cls.capacity })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.put('/api/classes/:id/teachers', requireRole(...CLASS_MANAGE), async (req, res) => {
  try {
    const cls = await db.get('classes', req.params.id)
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    const teacherIds = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds : []
    const teachers = await setClassTeachers(req.params.id, teacherIds)
    const updated = await db.get('classes', req.params.id)
    await writeAuditLog(req, {
      action: 'assign_teachers',
      resourceType: 'classes',
      resourceId: req.params.id,
      summary: `Assigned ${teachers.length} teacher(s) to class ${req.params.id}`,
      meta: { teacherIds: teachers.map((t) => t.id) },
    })
    res.json({
      ...updated,
      teachers,
      teacherIds: teachers.map((t) => t.id),
    })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, conflicts: e.conflicts })
  }
})

app.get('/api/classes/:id/teachers', requireRole(...CLASS_OPS), async (req, res) => {
  try {
    await assertTeacherClassAccess(req, req.params.id)
    const cls = await db.get('classes', req.params.id)
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    res.json(await getTeachersForClass(req.params.id))
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.get('/api/enrollments', requireRole(...STUDENT_MANAGE), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.student_id, c.id AS class_id, c.name AS class_name, c.schedule
       FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
       ORDER BY cs.student_id, c.id`
    )
    res.json(rows.map((r) => ({
      studentId: r.student_id,
      classId: r.class_id,
      className: r.class_name,
      schedule: r.schedule || '',
    })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/classes/:id/students', requireRole(...STUDENT_MANAGE), async (req, res) => {
  try {
    const { studentId } = req.body || {}
    if (!studentId) return res.status(400).json({ error: 'studentId is required' })
    const result = await db.addClassStudent(req.params.id, studentId)
    const [withTeachers] = await attachTeachers([result.class])
    await writeAuditLog(req, {
      action: 'enroll',
      resourceType: 'classes',
      resourceId: req.params.id,
      summary: `Enrolled student ${studentId} in class ${req.params.id}`,
      meta: { studentId },
    })
    res.status(201).json({ ...result, class: withTeachers })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, conflicts: e.conflicts })
  }
})

app.delete('/api/classes/:id/students/:studentId', requireRole(...STUDENT_MANAGE), async (req, res) => {
  try {
    const result = await db.removeClassStudent(req.params.id, req.params.studentId)
    const [withTeachers] = await attachTeachers([result.class])
    await writeAuditLog(req, {
      action: 'unenroll',
      resourceType: 'classes',
      resourceId: req.params.id,
      summary: `Removed student ${req.params.studentId} from class ${req.params.id}`,
      meta: { studentId: req.params.studentId },
    })
    res.json({ ...result, class: withTeachers })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.get('/api/:col', requireCollectionAccess('read'), async (req, res) => {
  const { col } = req.params
  try {
    let rows = await db.list(col)
    rows = await filterRowsForTeacher(req, col, rows)
    if (col === 'classes') rows = await attachTeachers(rows)
    res.json(rows)
  } catch (e) {
    console.error(`GET /api/${col}:`, e.message)
    res.status(500).json({ error: e.message })
  }
})

function normalizePaymentDate(value) {
  return calendarDate(value)
}

function describePaymentAudit(action, id, before, after) {
  if (action === 'create') {
    return {
      summary: `Created payment ${id} · ${after?.studentName || '—'} · purpose "${after?.purpose || '—'}" · $${Number(after?.amount || 0).toFixed(2)} (${after?.method || 'Cash'})`,
      meta: {
        purpose: after?.purpose || '',
        date: normalizePaymentDate(after?.date),
        amount: after?.amount,
        method: after?.method,
        status: after?.status,
        studentName: after?.studentName,
      },
    }
  }

  const fields = ['date', 'purpose', 'amount', 'status', 'method', 'studentName', 'note']
  const changes = []
  for (const key of fields) {
    let prev = before?.[key] ?? ''
    let next = after?.[key] ?? ''
    if (key === 'amount') {
      prev = Number(prev) || 0
      next = Number(next) || 0
      if (prev === next) continue
      changes.push(`${key}: $${prev} → $${next}`)
      continue
    }
    if (key === 'date') {
      prev = normalizePaymentDate(prev)
      next = normalizePaymentDate(next)
      if (prev === next) continue
      changes.push(`date: "${prev || '—'}" → "${next || '—'}"`)
      continue
    }
    prev = String(prev)
    next = String(next)
    if (prev !== next) {
      changes.push(`${key}: "${prev}" → "${next}"`)
    }
  }

  const highlight = changes.find((c) => c.startsWith('purpose:') || c.startsWith('date:'))
  return {
    summary: highlight
      ? `Finance changed payment ${id} ${highlight}${changes.length > 1 ? ` · also ${changes.filter((c) => c !== highlight).join('; ')}` : ''}`
      : changes.length
        ? `Updated payment ${id} · ${changes.join('; ')}`
        : `Updated payment ${id}`,
    meta: {
      purpose: after?.purpose || '',
      date: normalizePaymentDate(after?.date),
      amount: after?.amount,
      method: after?.method,
      status: after?.status,
      changes,
    },
  }
}

app.post('/api/:col', requireCollectionAccess('write'), async (req, res) => {
  const { col } = req.params
  try {
    const strict = col === 'students'
    const created = await db.add(col, req.body || {}, { upsert: !strict })
    if (col === 'payments') {
      const detail = describePaymentAudit('create', created?.id || '', null, created)
      await writeAuditLog(req, {
        action: 'create',
        resourceType: 'payments',
        resourceId: created?.id || '',
        summary: detail.summary,
        meta: detail.meta,
      })
    } else {
      await writeAuditLog(req, {
        action: 'create',
        resourceType: col,
        resourceId: created?.id || '',
        summary: `Created ${col.slice(0, -1) || col} ${created?.id || ''}`.trim(),
        meta: { name: created?.name || created?.studentName || created?.customer || undefined },
      })
    }
    res.status(201).json(created)
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: e.message || 'Duplicate ID' })
    }
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/:col/:id', requireCollectionAccess('write'), async (req, res) => {
  const { col, id } = req.params
  try {
    if (col === 'classes' && req.body?.schedule != null) {
      let teacherIds
      if (Array.isArray(req.body.teacherIds)) {
        teacherIds = req.body.teacherIds
      } else {
        teacherIds = (await getTeachersForClass(id)).map((t) => t.id)
      }
      if (teacherIds.length) {
        await assertNoTeacherScheduleConflicts(id, teacherIds, req.body.schedule)
      }
    }
    const before = col === 'payments' ? await db.get(col, id) : null
    const updated = await db.update(col, id, req.body || {})
    if (!updated) return res.status(404).json({ error: 'Not found' })
    if (col === 'payments') {
      const detail = describePaymentAudit('update', id, before, updated)
      await writeAuditLog(req, {
        action: 'update',
        resourceType: 'payments',
        resourceId: id,
        summary: detail.summary,
        meta: detail.meta,
      })
    } else {
      await writeAuditLog(req, {
        action: 'update',
        resourceType: col,
        resourceId: id,
        summary: `Updated ${col.slice(0, -1) || col} ${id}`,
      })
    }
    res.json(updated)
  } catch (e) {
    if (e.status) {
      return res.status(e.status).json({ error: e.message, conflicts: e.conflicts })
    }
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/:col/:id', requireCollectionAccess('write'), async (req, res) => {
  const { col, id } = req.params
  try {
    const existing = await db.get(col, id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    await db.remove(col, id)
    await writeAuditLog(req, {
      action: 'delete',
      resourceType: col,
      resourceId: id,
      summary: `Deleted ${col.slice(0, -1) || col} ${id}`,
    })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/:col/:id', requireCollectionAccess('read'), async (req, res) => {
  const { col, id } = req.params
  try {
    if (col === 'classes' && req.user.role === ROLE.TEACHER) {
      await assertTeacherClassAccess(req, id)
    }
    let row = await db.get(col, id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    if (col === 'classes') {
      ;[row] = await attachTeachers([row])
    }
    if (col === 'students' && req.user.role === ROLE.TEACHER) {
      const allowed = new Set(await getStudentIdsForTeacher(req.user.id))
      if (!allowed.has(id)) {
        return res.status(403).json({ error: 'You are not assigned to this student' })
      }
    }
    res.json(row)
  } catch (e) {
    console.error(`GET /api/${col}/${id}:`, e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
})

// POS order creation convenience endpoint
app.post('/api/pos/checkout', requireRole(...STOCK_OPS), async (req, res) => {
  const { customer = 'Walk-in', paymentMethod = 'Cash', items = [] } = req.body || {}
  const total = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0)
  const order = await db.add('orders', {
    customer,
    paymentMethod,
    items,
    total,
    date: new Date().toISOString(),
  })
  // decrement stock
  const products = await db.list('products')
  for (const i of items) {
    const p = products.find(p => p.id === i.id)
    if (p) await db.update('products', p.id, { stock: Math.max(0, (p.stock||0) - (i.qty||0)) })
  }
  await writeAuditLog(req, {
    action: 'checkout',
    resourceType: 'orders',
    resourceId: order.id,
    summary: `POS checkout ${order.id} · ${customer} · $${Number(total).toFixed(2)} (${paymentMethod})`,
    meta: { total, paymentMethod, itemCount: items.length },
  })
  res.status(201).json(order)
})

// Start
db.seedIfEmpty()
  .then(() => {
    app.listen(PORT, HOST, () => {
      const webPort = process.env.WEB_PORT || 8080
      console.log(`API server listening on ${HOST}:${PORT}`)
      printAppUrls({ apiPort: PORT, webPort, mode: 'api' })
    })
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  })

