import { pool } from './db.js'
import { hashPassword, sanitizeUser, USER_ROLES } from './auth.js'

export const STAFF_ROLES = ['admin', 'school_admin', 'finance']
export const TEACHER_ROLE = 'teacher'

function toApi(row) {
  return sanitizeUser(row)
}

function normalizeHireDate(value) {
  if (value == null || value === '') return null
  const s = String(value).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error('Hire date must be yyyy-mm-dd'), { status: 400 })
  }
  return s
}

function profileFields(input = {}) {
  return {
    phone: input.phone != null ? String(input.phone).trim() : undefined,
    address: input.address != null ? String(input.address).trim() : undefined,
    position: input.position != null ? String(input.position).trim() : undefined,
    department: input.department != null ? String(input.department).trim() : undefined,
    hireDate: input.hireDate !== undefined ? normalizeHireDate(input.hireDate) : undefined,
    note: input.note != null ? String(input.note).trim() : undefined,
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
}) {
  if (!USER_ROLES.includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 })
  }
  const userId = id || await nextUserId()
  const passwordHash = await hashPassword(password)
  const hire = normalizeHireDate(hireDate || null)
  await pool.query(
    `INSERT INTO users (
       id, name, email, password_hash, role, active,
       phone, address, position, department, hire_date, note
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
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

  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         email = COALESCE($3, email),
         role = COALESCE($4, role),
         active = COALESCE($5, active),
         phone = COALESCE($6, phone),
         address = COALESCE($7, address),
         position = COALESCE($8, position),
         department = COALESCE($9, department),
         hire_date = CASE WHEN $10::boolean THEN $11::date ELSE hire_date END,
         note = COALESCE($12, note),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      name?.trim() || null,
      email?.trim().toLowerCase() || null,
      role || null,
      typeof active === 'boolean' ? active : null,
      profile.phone !== undefined ? profile.phone : null,
      profile.address !== undefined ? profile.address : null,
      profile.position !== undefined ? profile.position : null,
      profile.department !== undefined ? profile.department : null,
      fields.hireDate !== undefined,
      profile.hireDate,
      profile.note !== undefined ? profile.note : null,
    ]
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
