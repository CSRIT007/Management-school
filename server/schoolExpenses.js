import { pool } from './db.js'
import { calendarDate } from './calendarDate.js'

export const EXPENSE_CATEGORIES = [
  'Rental Fee',
  'Utility',
  'Commission Expense',
  'Supplies',
  'Maintenance',
  'Transport',
  'Other Expense',
]

function formatDate(value) {
  return calendarDate(value) || ''
}

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    category: row.category || '',
    title: row.title || '',
    period: row.period || '',
    date: formatDate(row.expense_date),
    amount: Number(row.amount) || 0,
    method: row.method || 'Cash',
    status: row.status || 'Pending',
    vendor: row.vendor || '',
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

function normalizeCategory(value) {
  const s = String(value || '').trim()
  if (!EXPENSE_CATEGORIES.includes(s)) {
    throw Object.assign(
      new Error(`Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`),
      { status: 400 }
    )
  }
  return s
}

async function nextExpenseId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM school_expenses
    WHERE id ~ '^EXP-[0-9]+$'
  `)
  return `EXP-${String(rows[0].next).padStart(4, '0')}`
}

export async function ensureSchoolExpensesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'Other Expense',
      title TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL DEFAULT '',
      expense_date DATE,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      method TEXT NOT NULL DEFAULT 'Cash',
      status TEXT NOT NULL DEFAULT 'Pending',
      vendor TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_school_expenses_category ON school_expenses(category)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_school_expenses_date ON school_expenses(expense_date)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_school_expenses_period ON school_expenses(period)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_school_expenses_status ON school_expenses(status)`)
}

export async function listSchoolExpenses() {
  const { rows } = await pool.query(
    `SELECT * FROM school_expenses ORDER BY expense_date DESC NULLS LAST, created_at DESC`
  )
  return rows.map(toApi)
}

export async function getSchoolExpense(id) {
  const { rows } = await pool.query(`SELECT * FROM school_expenses WHERE id = $1`, [id])
  return rows[0] ? toApi(rows[0]) : null
}

export async function createSchoolExpense(input = {}) {
  const category = normalizeCategory(input.category)
  const title = String(input.title || '').trim()
  if (!title) {
    throw Object.assign(new Error('Title is required'), { status: 400 })
  }

  const period = normalizePeriod(input.period)
  const date = formatDate(input.date) || calendarDate(new Date())
  const method = String(input.method || 'Cash').trim() || 'Cash'
  const status = normalizeStatus(input.status || 'Pending')
  const vendor = String(input.vendor || '').trim()
  const note = String(input.note || '').trim()
  const amount = money(input.amount)

  if (amount <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 })
  }

  const id = input.id || await nextExpenseId()

  await pool.query(
    `INSERT INTO school_expenses (
       id, category, title, period, expense_date, amount, method, status, vendor, note
     ) VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10)`,
    [id, category, title, period, date, amount, method, status, vendor, note]
  )

  return getSchoolExpense(id)
}

export async function updateSchoolExpense(id, input = {}) {
  const existing = await getSchoolExpense(id)
  if (!existing) return null

  const category = input.category !== undefined ? normalizeCategory(input.category) : existing.category
  const title = input.title !== undefined ? String(input.title).trim() : existing.title
  if (!title) {
    throw Object.assign(new Error('Title is required'), { status: 400 })
  }

  const period = input.period !== undefined ? normalizePeriod(input.period) : existing.period
  const date = input.date !== undefined ? (formatDate(input.date) || existing.date) : existing.date
  const method = input.method !== undefined ? (String(input.method).trim() || 'Cash') : existing.method
  const status = input.status !== undefined ? normalizeStatus(input.status) : existing.status
  const vendor = input.vendor !== undefined ? String(input.vendor).trim() : existing.vendor
  const note = input.note !== undefined ? String(input.note).trim() : existing.note
  const amount = input.amount !== undefined ? money(input.amount) : existing.amount

  if (amount <= 0) {
    throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 })
  }

  await pool.query(
    `UPDATE school_expenses SET
       category = $2,
       title = $3,
       period = $4,
       expense_date = $5::date,
       amount = $6,
       method = $7,
       status = $8,
       vendor = $9,
       note = $10,
       updated_at = NOW()
     WHERE id = $1`,
    [id, category, title, period, date, amount, method, status, vendor, note]
  )

  return getSchoolExpense(id)
}
