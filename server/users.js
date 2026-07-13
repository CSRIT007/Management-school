import { pool } from './db.js'
import { hashPassword, sanitizeUser, USER_ROLES } from './auth.js'

function toApi(row) {
  return sanitizeUser(row)
}

async function nextUserId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM users
    WHERE id ~ '^USR-[0-9]+$'
  `)
  return `USR-${String(rows[0].next).padStart(4, '0')}`
}

export async function listUsers() {
  const { rows } = await pool.query(
    'SELECT * FROM users ORDER BY created_at ASC'
  )
  return rows.map(toApi)
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

export async function createUser({ id, name, email, password, role = 'teacher', active = true }) {
  if (!USER_ROLES.includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 })
  }
  const userId = id || await nextUserId()
  const passwordHash = await hashPassword(password)
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, name.trim(), email.trim().toLowerCase(), passwordHash, role, active !== false]
  )
  return getUserById(userId)
}

export async function updateUser(id, { name, email, role, active }) {
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
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      name?.trim() || null,
      email?.trim().toLowerCase() || null,
      role || null,
      typeof active === 'boolean' ? active : null,
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
  })
  await createUser({
    name: 'School Admin',
    email: 'office@school.csrsms.com',
    password: '123456',
    role: 'school_admin',
  })
  await createUser({
    name: 'Finance Staff',
    email: 'finance@school.csrsms.com',
    password: '123456',
    role: 'finance',
  })
  await createUser({
    name: 'Teacher Demo',
    email: 'teacher@school.csrsms.com',
    password: '123456',
    role: 'teacher',
  })
}
