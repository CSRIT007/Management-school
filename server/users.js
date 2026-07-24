import { pool } from './db.js'
import { hashPassword, sanitizeUser, USER_ROLES } from './auth.js'

export const STAFF_ROLES = ['admin', 'school_admin', 'finance']
export const TEACHER_ROLE = 'teacher'

function toApi(row) {
  return sanitizeUser(row)
}

function normalizeHireDate(value, { allowEmpty = true } = {}) {
  if (value == null || value === '') {
    if (allowEmpty) return null
    throw Object.assign(new Error('Hire date must be yyyy-mm-dd'), { status: 400 })
  }
  const s = String(value).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error('Hire date must be yyyy-mm-dd'), { status: 400 })
  }
  return s
}

function normalizeEmploymentType(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'full_time' || v === 'part_time') return v
  return ''
}

function normalizeMoney(value) {
  if (value == null || value === '') return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error('Salary / hourly amount must be a valid number'), { status: 400 })
  }
  return Math.round(n * 100) / 100
}

function profileFields(input = {}) {
  return {
    phone: input.phone != null ? String(input.phone).trim() : undefined,
    address: input.address != null ? String(input.address).trim() : undefined,
    position: input.position != null ? String(input.position).trim() : undefined,
    department: input.department != null ? String(input.department).trim() : undefined,
    hireDate: input.hireDate !== undefined ? normalizeHireDate(input.hireDate) : undefined,
    note: input.note != null ? String(input.note).trim() : undefined,
    employmentType: input.employmentType !== undefined
      ? normalizeEmploymentType(input.employmentType)
      : undefined,
    salary: input.salary !== undefined ? normalizeMoney(input.salary) : undefined,
    hourlyRate: input.hourlyRate !== undefined ? normalizeMoney(input.hourlyRate) : undefined,
    educationDegree: input.educationDegree != null ? String(input.educationDegree).trim() : undefined,
    majorSkill: input.majorSkill != null ? String(input.majorSkill).trim() : undefined,
  }
}

async function nextUserId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM users
    WHERE id ~ '^USR-[0-9]+$'
  `)
  return `USR-${String(rows[0].next).padStart(4, '0')}`
}

export async function listUsers({ roles } = {}) {
  if (roles?.length) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE role = ANY($1::text[]) ORDER BY name ASC, created_at ASC',
      [roles]
    )
    return rows.map(toApi)
  }
  const { rows } = await pool.query(
    'SELECT * FROM users ORDER BY created_at ASC'
  )
  return rows.map(toApi)
}

export async function listTeachers() {
  return listUsers({ roles: [TEACHER_ROLE] })
}

export async function listStaff() {
  return listUsers({ roles: STAFF_ROLES })
}

export async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return rows[0] ? toApi(rows[0]) : null
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  )
  return rows[0] || null
}

export async function createUser({
  id,
  name,
  email,
  password,
  role = 'teacher',
  active = true,
  phone = '',
  address = '',
  position = '',
  department = '',
  hireDate = '',
  note = '',
  employmentType = '',
  salary = 0,
  hourlyRate = 0,
  educationDegree = '',
  majorSkill = '',
}) {
  if (!USER_ROLES.includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 })
  }
  const userId = id || await nextUserId()
  const passwordHash = await hashPassword(password)
  const hire = normalizeHireDate(hireDate || null)
  const empType = normalizeEmploymentType(employmentType)
  const sal = empType === 'full_time' ? normalizeMoney(salary) : 0
  const hourly = empType === 'part_time' ? normalizeMoney(hourlyRate) : 0
  await pool.query(
    `INSERT INTO users (
       id, name, email, password_hash, role, active,
       phone, address, position, department, hire_date, note,
       employment_type, salary, hourly_rate, education_degree, major_skill
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      userId,
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      role,
      active !== false,
      String(phone || '').trim(),
      String(address || '').trim(),
      String(position || '').trim(),
      String(department || '').trim(),
      hire,
      String(note || '').trim(),
      empType,
      sal,
      hourly,
      String(educationDegree || '').trim(),
      String(majorSkill || '').trim(),
    ]
  )
  return getUserById(userId)
}

export async function updateUser(id, fields = {}) {
  const {
    name,
    email,
    role,
    active,
  } = fields
  const profile = profileFields(fields)

  if (email) {
    const existing = await getUserByEmail(email)
    if (existing && existing.id !== id) {
      throw Object.assign(new Error('Email already in use'), { code: '23505', status: 409 })
    }
  }
  if (role && !USER_ROLES.includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 })
  }

  let salary = profile.salary
  let hourlyRate = profile.hourlyRate
  if (profile.employmentType === 'full_time') {
    hourlyRate = 0
  } else if (profile.employmentType === 'part_time') {
    salary = 0
  } else if (profile.employmentType === '') {
    salary = 0
    hourlyRate = 0
  }

  // Build explicit SET list so empty strings (clear fields) still save.
  const sets = []
  const params = [id]
  const add = (sql, value) => {
    params.push(value)
    sets.push(sql.replace('?', `$${params.length}`))
  }

  if (name != null && String(name).trim() !== '') add('name = ?', String(name).trim())
  if (email != null && String(email).trim() !== '') add('email = ?', String(email).trim().toLowerCase())
  if (role) add('role = ?', role)
  if (typeof active === 'boolean') add('active = ?', active)
  if (profile.phone !== undefined) add('phone = ?', profile.phone)
  if (profile.address !== undefined) add('address = ?', profile.address)
  if (profile.position !== undefined) add('position = ?', profile.position)
  if (profile.department !== undefined) add('department = ?', profile.department)
  // Only change hire_date when a real date is provided (empty keeps previous)
  if (fields.hireDate !== undefined && fields.hireDate !== '' && fields.hireDate != null) {
    add('hire_date = ?::date', profile.hireDate)
  }
  if (profile.note !== undefined) add('note = ?', profile.note)
  if (profile.employmentType !== undefined) add('employment_type = ?', profile.employmentType)
  if (salary !== undefined) add('salary = ?', salary)
  if (hourlyRate !== undefined) add('hourly_rate = ?', hourlyRate)
  if (profile.educationDegree !== undefined) add('education_degree = ?', profile.educationDegree)
  if (profile.majorSkill !== undefined) add('major_skill = ?', profile.majorSkill)

  if (!sets.length) {
    return getUserById(id)
  }

  sets.push('updated_at = NOW()')
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  )
  return rows[0] ? toApi(rows[0]) : null
}

export async function setUserPassword(id, password) {
  const passwordHash = await hashPassword(password)
  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
    [id, passwordHash]
  )
  return rowCount > 0
}

export async function touchUserLogin(id) {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id])
}

export async function seedDefaultUsers() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users')
  if (rows[0].count > 0) return

  console.log('Seeding default login accounts…')

  await createUser({
    id: 'USR-0001',
    name: 'Admin',
    email: 'admin@gmail.com',
    password: '123456',
    role: 'admin',
    position: 'System Administrator',
    department: 'Administration',
  })
  await createUser({
    name: 'School Admin',
    email: 'office@school.csrsms.com',
    password: '123456',
    role: 'school_admin',
    position: 'Office Manager',
    department: 'Administration',
  })
  await createUser({
    name: 'Finance Staff',
    email: 'finance@school.csrsms.com',
    password: '123456',
    role: 'finance',
    position: 'Finance Officer',
    department: 'Finance',
  })
  await createUser({
    name: 'Teacher Demo',
    email: 'teacher@school.csrsms.com',
    password: '123456',
    role: 'teacher',
    position: 'Teacher',
    department: 'Academics',
  })
}
