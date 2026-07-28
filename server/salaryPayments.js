import { pool } from './db.js'
import { calendarDate } from './calendarDate.js'
import { STAFF_ROLES, TEACHER_ROLE } from './users.js'

function formatDate(value) {
  return calendarDate(value) || ''
}

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    personKind: row.person_kind || '',
    period: row.period || '',
    date: formatDate(row.payment_date),
    amount: Number(row.amount) || 0,
    hours: Number(row.hours) || 0,
    method: row.method || 'Cash',
    status: row.status || 'Pending',
    note: row.note || '',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function money(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 0) {
    throw Object.assign(new Error('Amount must be a valid number'), { status: 400 })
  }
  return Math.round(v * 100) / 100
}

function normalizePeriod(value) {
  const s = String(value || '').trim()
  if (!/^\d{4}-\d{2}$/.test(s)) {
    throw Object.assign(new Error('Period must be yyyy-mm'), { status: 400 })
  }
  return s
}

function normalizeStatus(value) {
  const s = String(value || '').trim()
  if (s === 'Paid' || s === 'Pending') return s
  throw Object.assign(new Error('Status must be Paid or Pending'), { status: 400 })
}

async function nextSalaryId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM salary_payments
    WHERE id ~ '^SAL-[0-9]+$'
  `)
  return `SAL-${String(rows[0].next).padStart(4, '0')}`
}

export async function ensureSalaryPaymentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      user_name TEXT NOT NULL DEFAULT '',
      person_kind TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL DEFAULT '',
      payment_date DATE,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      hours NUMERIC(12, 2) NOT NULL DEFAULT 0,
      method TEXT NOT NULL DEFAULT 'Cash',
      status TEXT NOT NULL DEFAULT 'Pending',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_salary_payments_user ON salary_payments(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(status)`)
}

function personKindFromRole(role) {
  return role === TEACHER_ROLE ? 'teacher' : 'staff'
}

export async function listSalaryRoster() {
  const { rows } = await pool.query(
    `SELECT id, name, first_name, last_name, role, active, employment_type, salary, hourly_rate, position, department
     FROM users
     WHERE role = $1 OR role = ANY($2::text[])
     ORDER BY
       CASE WHEN role = $1 THEN 0 ELSE 1 END,
       name ASC`,
    [TEACHER_ROLE, STAFF_ROLES]
  )

  return rows.map((r) => {
    const firstName = r.first_name || ''
    const lastName = r.last_name || ''
    const name = (r.name || [firstName, lastName].filter(Boolean).join(' ')).trim()
    const employmentType = r.employment_type || ''
    return {
      id: r.id,
      name,
      firstName,
      lastName,
      role: r.role,
      personKind: personKindFromRole(r.role),
      active: r.active !== false,
      employmentType,
      salary: Number(r.salary) || 0,
      hourlyRate: Number(r.hourly_rate) || 0,
      position: r.position || '',
      department: r.department || '',
      suggestedAmount: employmentType === 'full_time' ? Number(r.salary) || 0 : 0,
    }
  })
}

export async function listSalaryPayments() {
  const { rows } = await pool.query(
    `SELECT * FROM salary_payments ORDER BY payment_date DESC NULLS LAST, created_at DESC`
  )
  return rows.map(toApi)
}

export async function getSalaryPayment(id) {
  const { rows } = await pool.query(`SELECT * FROM salary_payments WHERE id = $1`, [id])
  return rows[0] ? toApi(rows[0]) : null
}

export async function createSalaryPayment(input = {}) {
  const userId = String(input.userId || '').trim()
  if (!userId) {
    throw Object.assign(new Error('Employee is required'), { status: 400 })
  }

  const { rows: userRows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId])
  const user = userRows[0]
  if (!user) {
    throw Object.assign(new Error('Employee not found'), { status: 404 })
  }
  if (user.role !== TEACHER_ROLE && !STAFF_ROLES.includes(user.role)) {
    throw Object.assign(new Error('Only teachers and staff can receive salary payouts'), { status: 400 })
  }

  const employmentType = user.employment_type || ''
  const period = normalizePeriod(input.period)
  const date = formatDate(input.date) || calendarDate(new Date())
  const method = String(input.method || 'Cash').trim() || 'Cash'
  const status = normalizeStatus(input.status || 'Pending')
  const note = String(input.note || '').trim()
  const hours = employmentType === 'part_time' ? money(input.hours || 0) : 0

  if (employmentType === 'part_time' && hours <= 0) {
    throw Object.assign(new Error('Hours are required for part-time payouts'), { status: 400 })
  }

  let amount
  if (input.amount != null && input.amount !== '') {
    amount = money(input.amount)
  } else if (employmentType === 'full_time') {
    amount = money(user.salary || 0)
  } else if (employmentType === 'part_time') {
    amount = money(hours * (Number(user.hourly_rate) || 0))
  } else {
    amount = money(input.amount || 0)
  }

  if (amount <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 })
  }

  const id = input.id || await nextSalaryId()
  const personKind = personKindFromRole(user.role)
  const userName = (user.name || [user.first_name, user.last_name].filter(Boolean).join(' ')).trim()

  await pool.query(
    `INSERT INTO salary_payments (
       id, user_id, user_name, person_kind, period, payment_date,
       amount, hours, method, status, note
     ) VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11)`,
    [id, userId, userName, personKind, period, date, amount, hours, method, status, note]
  )

  return getSalaryPayment(id)
}

export async function updateSalaryPayment(id, input = {}) {
  const existing = await getSalaryPayment(id)
  if (!existing) return null

  const period = input.period !== undefined ? normalizePeriod(input.period) : existing.period
  const date = input.date !== undefined ? (formatDate(input.date) || existing.date) : existing.date
  const method = input.method !== undefined ? (String(input.method).trim() || 'Cash') : existing.method
  const status = input.status !== undefined ? normalizeStatus(input.status) : existing.status
  const note = input.note !== undefined ? String(input.note).trim() : existing.note
  const hours = input.hours !== undefined ? money(input.hours) : existing.hours
  const amount = input.amount !== undefined ? money(input.amount) : existing.amount

  if (amount <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 })
  }

  await pool.query(
    `UPDATE salary_payments SET
       period = $2,
       payment_date = $3::date,
       amount = $4,
       hours = $5,
       method = $6,
       status = $7,
       note = $8,
       updated_at = NOW()
     WHERE id = $1`,
    [id, period, date, amount, hours, method, status, note]
  )

  return getSalaryPayment(id)
}
