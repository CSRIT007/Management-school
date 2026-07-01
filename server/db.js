import pg from 'pg'
import dotenv from 'dotenv'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataRoot = path.join(__dirname, 'data')

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5433/management_school',
})

const collections = [
  'students',
  'classes',
  'deadlines',
  'payments',
  'bookIssues',
  'alumni',
  'categories',
  'products',
  'orders',
]

function makeId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase()
}

function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let i = 0

  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }

    if (sql.slice(i, i + 2) === '$$') {
      const end = sql.indexOf('$$', i + 2)
      if (end === -1) throw new Error('Unclosed dollar-quoted SQL block in schema.sql')
      current += sql.slice(i, end + 2)
      i = end + 2
      continue
    }

    if (sql[i] === ';') {
      const stmt = current.trim()
      if (stmt) statements.push(stmt)
      current = ''
      i++
      continue
    }

    current += sql[i]
    i++
  }

  const last = current.trim()
  if (last) statements.push(last)
  return statements
}

async function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const sql = await fs.readFile(schemaPath, 'utf8')

  for (const statement of splitSqlStatements(sql)) {
    await pool.query(statement)
  }
}

export async function checkConnection() {
  const { rows } = await pool.query('SELECT NOW() AS now')
  return rows[0]
}

async function list(name) {
  const { rows } = await pool.query(
    'SELECT data FROM records WHERE collection = $1 ORDER BY created_at ASC',
    [name]
  )
  return rows.map((r) => r.data)
}

async function get(name, itemId) {
  const { rows } = await pool.query(
    'SELECT data FROM records WHERE collection = $1 AND id = $2',
    [name, itemId]
  )
  return rows[0]?.data ?? null
}

async function add(name, obj) {
  const record = { id: obj.id || makeId(), ...obj }
  await pool.query(
    `INSERT INTO records (collection, id, data)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (collection, id) DO UPDATE
     SET data = EXCLUDED.data, updated_at = NOW()`,
    [name, record.id, JSON.stringify(record)]
  )
  return record
}

async function update(name, itemId, obj) {
  const existing = await get(name, itemId)
  if (!existing) return null
  const updated = { ...existing, ...obj, id: itemId }
  const { rowCount } = await pool.query(
    `UPDATE records SET data = $1::jsonb, updated_at = NOW()
     WHERE collection = $2 AND id = $3`,
    [JSON.stringify(updated), name, itemId]
  )
  return rowCount ? updated : null
}

async function remove_(name, itemId) {
  await pool.query('DELETE FROM records WHERE collection = $1 AND id = $2', [name, itemId])
  return { ok: true }
}

async function isEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM records')
  return rows[0].count === 0
}

async function migrateJsonFiles() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const name of collections) {
      const file = path.join(dataRoot, `${name}.json`)
      try {
        const txt = await fs.readFile(file, 'utf8')
        const items = JSON.parse(txt)
        if (!Array.isArray(items)) continue
        for (const item of items) {
          if (!item?.id) continue
          const record = { ...item, id: item.id }
          await client.query(
            `INSERT INTO records (collection, id, data)
             VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (collection, id) DO NOTHING`,
            [name, record.id, JSON.stringify(record)]
          )
        }
      } catch (e) {
        if (e.code !== 'ENOENT') throw e
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function seedIfEmpty() {
  await initSchema()

  if (await isEmpty()) {
    await migrateJsonFiles()
  }

  if (!(await isEmpty())) return

  await add('categories', { id: 'CAT-BOOKS', name: 'Books', description: 'Textbooks and references' })
  await add('categories', { id: 'CAT-STATIONERY', name: 'Stationery', description: 'Pens, notebooks, etc.' })
  await add('categories', { id: 'CAT-UNIFORMS', name: 'Uniforms', description: 'School uniforms' })

  await add('products', { id: 'P001', name: 'Intro to JS', category: 'Books', stock: 12, price: 15.0, cost: 8.0, sku: 'BK-JS-001' })
  await add('products', { id: 'P002', name: 'A4 Notebook', category: 'Stationery', stock: 50, price: 2.5, cost: 1.0, sku: 'ST-NB-A4' })
  await add('products', { id: 'P003', name: 'Uniform Shirt', category: 'Uniforms', stock: 20, price: 18.0, cost: 9.0, sku: 'UN-SHIRT-01' })

  await add('classes', { id: 'C101', name: 'Intro to Programming', instructor: 'Mr. Kim', schedule: 'Mon/Wed 9-10', capacity: '15/20' })
  await add('classes', { id: 'C205', name: 'UI/UX Basics', instructor: 'Ms. Heung', schedule: 'Tue/Thu 14-16', capacity: '20/20' })

  await add('payments', { id: 'INV-1001', studentName: 'Jane Doe', date: '2025-09-10', amount: 120, method: 'Card', status: 'Paid' })
  await add('payments', { id: 'INV-1002', studentName: 'John Smith', date: '2025-09-11', amount: 200, method: 'Cash', status: 'Pending' })

  await add('deadlines', { id: makeId(), name: 'Jane Doe', task: 'Exam 1', due: '2025-09-20', status: 'Pending' })
  await add('deadlines', { id: makeId(), name: 'John Smith', task: 'Assignment 2', due: '2025-09-15', status: 'Overdue' })

  await add('bookIssues', { id: makeId(), name: 'Jane Doe', title: 'Intro to JS', isbn: '978-1-2345', issued: '2025-09-01', due: '2025-09-20', status: 'Issued' })
  await add('bookIssues', { id: makeId(), name: 'John Smith', title: 'UI/UX Handbook', isbn: '978-1-6789', issued: '2025-08-20', due: '2025-09-05', status: 'Overdue' })

  await add('alumni', { id: makeId(), name: 'Jane Doe', program: 'Computer Science', date: '2025-06-30', grade: 'A', cert: true })
  await add('alumni', { id: makeId(), name: 'John Smith', program: 'Business Administration', date: '2025-05-20', grade: 'B', cert: false })
}

export const db = { list, get, add, update, remove: remove_, seedIfEmpty, checkConnection }
