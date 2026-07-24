import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'

export const USER_ROLES = ['admin', 'school_admin', 'finance', 'teacher']

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function sanitizeUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    phone: row.phone || '',
    address: row.address || '',
    position: row.position || '',
    department: row.department || '',
    hireDate: formatHireDate(row.hire_date),
    note: row.note || '',
    employmentType: row.employment_type || '',
    salary: Number(row.salary) || 0,
    hourlyRate: Number(row.hourly_rate) || 0,
    educationDegree: row.education_degree || '',
    majorSkill: row.major_skill || '',
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function formatHireDate(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return ''
}
