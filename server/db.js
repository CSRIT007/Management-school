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
  connectionString: process.env.DATABASE_URL,
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

/** API collection name → DB table + field mapping */
const TABLE_CONFIG = {
  students: {
    table: 'students',
    toApi: (r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      dob: fmtDate(r.dob),
      emergency: r.emergency,
      program: r.program,
    }),
    toDb: (o) => ({
      id: o.id,
      name: o.name ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      address: o.address ?? '',
      dob: o.dob || null,
      emergency: o.emergency ?? '',
      program: o.program ?? '',
    }),
    insertCols: ['id', 'name', 'email', 'phone', 'address', 'dob', 'emergency', 'program'],
    updateCols: ['name', 'email', 'phone', 'address', 'dob', 'emergency', 'program'],
  },
  classes: {
    table: 'classes',
    toApi: (r) => ({
      id: r.id,
      name: r.name,
      instructor: r.instructor,
      schedule: r.schedule,
      capacity: r.capacity,
    }),
    toDb: (o) => ({
      id: o.id,
      name: o.name ?? '',
      instructor: o.instructor ?? '',
      schedule: o.schedule ?? '',
      capacity: o.capacity ?? '',
    }),
    insertCols: ['id', 'name', 'instructor', 'schedule', 'capacity'],
    updateCols: ['name', 'instructor', 'schedule', 'capacity'],
  },
  deadlines: {
    table: 'deadlines',
    toApi: (r) => ({
      id: r.id,
      studentId: r.student_id ?? '',
      name: r.student_name,
      task: r.task,
      due: fmtDate(r.due_date),
      status: r.status,
    }),
    toDb: (o) => ({
      id: o.id,
      student_id: o.studentId ?? '',
      student_name: o.name ?? '',
      task: o.task ?? '',
      due_date: o.due || null,
      status: o.status ?? 'Pending',
    }),
    insertCols: ['id', 'student_id', 'student_name', 'task', 'due_date', 'status'],
    updateCols: ['student_id', 'student_name', 'task', 'due_date', 'status'],
  },
  payments: {
    table: 'payments',
    toApi: (r) => ({
      id: r.id,
      studentId: r.student_id ?? '',
      studentName: r.student_name,
      date: fmtDate(r.payment_date),
      purpose: r.purpose ?? '',
      amount: Number(r.amount),
      method: r.method,
      status: r.status,
      note: r.note ?? '',
      invoicedBy: r.invoiced_by ?? '',
      invoicedAt: r.invoiced_at ?? r.created_at ?? null,
    }),
    toDb: (o) => ({
      id: o.id,
      student_id: o.studentId ?? '',
      student_name: o.studentName ?? '',
      payment_date: o.date || null,
      purpose: o.purpose ?? '',
      amount: Number(o.amount) || 0,
      method: o.method ?? 'Cash',
      status: o.status ?? 'Paid',
      note: o.note ?? '',
      invoiced_by: o.invoicedBy ?? '',
      invoiced_at: o.invoicedAt || null,
    }),
    insertCols: ['id', 'student_id', 'student_name', 'payment_date', 'purpose', 'amount', 'method', 'status', 'note', 'invoiced_by', 'invoiced_at'],
    updateCols: ['student_id', 'student_name', 'payment_date', 'purpose', 'amount', 'method', 'status', 'note', 'invoiced_by', 'invoiced_at'],
  },
  bookIssues: {
    table: 'book_issues',
    toApi: (r) => ({
      id: r.id,
      name: r.student_name,
      title: r.title,
      isbn: r.isbn,
      issued: fmtDate(r.issued_date),
      due: fmtDate(r.due_date),
      status: r.status,
    }),
    toDb: (o) => ({
      id: o.id,
      student_name: o.name ?? '',
      title: o.title ?? '',
      isbn: o.isbn ?? '',
      issued_date: o.issued || null,
      due_date: o.due || null,
      status: o.status ?? 'Issued',
    }),
    insertCols: ['id', 'student_name', 'title', 'isbn', 'issued_date', 'due_date', 'status'],
    updateCols: ['student_name', 'title', 'isbn', 'issued_date', 'due_date', 'status'],
  },
  alumni: {
    table: 'alumni',
    toApi: (r) => ({
      id: r.id,
      name: r.name,
      program: r.program,
      date: fmtDate(r.completion_date),
      grade: r.grade,
      cert: !!r.cert,
    }),
    toDb: (o) => ({
      id: o.id,
      name: o.name ?? '',
      program: o.program ?? '',
      completion_date: o.date || null,
      grade: o.grade ?? '',
      cert: o.cert === true || o.cert === 'true',
    }),
    insertCols: ['id', 'name', 'program', 'completion_date', 'grade', 'cert'],
    updateCols: ['name', 'program', 'completion_date', 'grade', 'cert'],
  },
  categories: {
    table: 'categories',
    toApi: (r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }),
    toDb: (o) => ({
      id: o.id,
      name: o.name ?? '',
      description: o.description ?? '',
    }),
    insertCols: ['id', 'name', 'description'],
    updateCols: ['name', 'description'],
  },
  products: {
    table: 'products',
    toApi: (r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      price: Number(r.price),
      cost: Number(r.cost),
      stock: Number(r.stock),
      sku: r.sku,
    }),
    toDb: (o) => ({
      id: o.id,
      name: o.name ?? '',
      description: o.description ?? '',
      category: o.category ?? '',
      price: Number(o.price) || 0,
      cost: Number(o.cost) || 0,
      stock: Number(o.stock) || 0,
      sku: o.sku ?? '',
    }),
    insertCols: ['id', 'name', 'description', 'category', 'price', 'cost', 'stock', 'sku'],
    updateCols: ['name', 'description', 'category', 'price', 'cost', 'stock', 'sku'],
  },
}

function fmtDate(val) {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

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

async function migratePaymentColumns() {
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT ''`)
}

async function migratePaymentInvoiceColumns() {
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_id TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoiced_by TEXT NOT NULL DEFAULT ''`)
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ`)
  await pool.query(`
    UPDATE payments p
    SET student_id = s.id
    FROM students s
    WHERE p.student_id = '' AND p.student_name = s.name
  `)
}

async function migrateDeadlineColumns() {
  await pool.query(`ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS student_id TEXT NOT NULL DEFAULT ''`)
  await pool.query(`
    UPDATE deadlines d
    SET student_id = s.id
    FROM students s
    WHERE d.student_id = '' AND d.student_name = s.name
  `)
}

async function migrateDeadlineIds() {
  const { rows } = await pool.query(`
    SELECT id FROM deadlines WHERE id !~ '^DLN-[0-9]+$' ORDER BY created_at ASC
  `)
  if (rows.length === 0) return

  const { rows: maxRows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) AS max
    FROM deadlines WHERE id ~ '^DLN-[0-9]+$'
  `)
  let next = Number(maxRows[0].max)

  for (const row of rows) {
    next += 1
    const newId = `DLN-${String(next).padStart(4, '0')}`
    await pool.query('UPDATE deadlines SET id = $1 WHERE id = $2', [newId, row.id])
  }
}

async function migrateDeadlineTableLayout() {
  const { rows } = await pool.query(`
    SELECT column_name, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deadlines'
    ORDER BY ordinal_position
  `)
  if (rows[1]?.column_name === 'student_id') return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE deadlines_ordered (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL DEFAULT '',
        student_name TEXT NOT NULL DEFAULT '',
        task TEXT NOT NULL DEFAULT '',
        due_date DATE,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      INSERT INTO deadlines_ordered (id, student_id, student_name, task, due_date, status, created_at, updated_at)
      SELECT id, student_id, student_name, task, due_date, status, created_at, updated_at FROM deadlines
    `)
    await client.query('DROP TABLE deadlines CASCADE')
    await client.query('ALTER TABLE deadlines_ordered RENAME TO deadlines')
    await client.query('CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_deadlines_due ON deadlines(due_date)')
    await client.query('DROP TRIGGER IF EXISTS trg_deadlines_updated_at ON deadlines')
    await client.query(`
      CREATE TRIGGER trg_deadlines_updated_at
      BEFORE UPDATE ON deadlines FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function migrateClassStudents() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_students (
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (class_id, student_id)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id)`)
}

async function initDbeaverViews() {
  const viewsPath = path.join(__dirname, 'dbeaver-views.sql')
  const sql = await fs.readFile(viewsPath, 'utf8')
  for (const statement of splitSqlStatements(sql)) {
    await pool.query(statement)
  }
}

async function tableExists(name) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [name]
  )
  return rows[0].exists
}

async function migrateFromLegacyRecords() {
  if (!(await tableExists('records'))) return

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM records')
  if (rows[0].count === 0) {
    await pool.query('DROP TABLE IF EXISTS records CASCADE')
    return
  }

  console.log(`Migrating ${rows[0].count} rows from legacy records table…`)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      INSERT INTO students (id, name, email, phone, address, dob, emergency, program, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'email', ''),
        COALESCE(data->>'phone', ''),
        COALESCE(data->>'address', ''),
        NULLIF(data->>'dob', '')::date,
        COALESCE(data->>'emergency', ''),
        COALESCE(data->>'program', ''),
        created_at, updated_at
      FROM records WHERE collection = 'students'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO classes (id, name, instructor, schedule, capacity, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'instructor', ''),
        COALESCE(data->>'schedule', ''),
        COALESCE(data->>'capacity', ''),
        created_at, updated_at
      FROM records WHERE collection = 'classes'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO deadlines (id, student_id, student_name, task, due_date, status, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'studentId', ''),
        COALESCE(data->>'name', ''),
        COALESCE(data->>'task', ''),
        NULLIF(data->>'due', '')::date,
        COALESCE(data->>'status', 'Pending'),
        created_at, updated_at
      FROM records WHERE collection = 'deadlines'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO payments (id, student_name, payment_date, amount, method, status, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'studentName', ''),
        NULLIF(data->>'date', '')::date,
        COALESCE((data->>'amount')::numeric, 0),
        COALESCE(data->>'method', 'Cash'),
        COALESCE(data->>'status', 'Paid'),
        created_at, updated_at
      FROM records WHERE collection = 'payments'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO book_issues (id, student_name, title, isbn, issued_date, due_date, status, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'title', ''),
        COALESCE(data->>'isbn', ''),
        NULLIF(data->>'issued', '')::date,
        NULLIF(data->>'due', '')::date,
        COALESCE(data->>'status', 'Issued'),
        created_at, updated_at
      FROM records WHERE collection = 'bookIssues'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO alumni (id, name, program, completion_date, grade, cert, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'program', ''),
        NULLIF(data->>'date', '')::date,
        COALESCE(data->>'grade', ''),
        COALESCE((data->>'cert')::boolean, false),
        created_at, updated_at
      FROM records WHERE collection = 'alumni'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO categories (id, name, description, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'description', ''),
        created_at, updated_at
      FROM records WHERE collection = 'categories'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO products (id, name, description, category, price, cost, stock, sku, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'name', ''),
        COALESCE(data->>'description', ''),
        COALESCE(data->>'category', ''),
        COALESCE((data->>'price')::numeric, 0),
        COALESCE((data->>'cost')::numeric, 0),
        COALESCE((data->>'stock')::int, 0),
        COALESCE(data->>'sku', ''),
        created_at, updated_at
      FROM records WHERE collection = 'products'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO orders (id, customer, payment_method, total, order_date, created_at, updated_at)
      SELECT id,
        COALESCE(data->>'customer', 'Walk-in'),
        COALESCE(data->>'paymentMethod', 'Cash'),
        COALESCE((data->>'total')::numeric, 0),
        COALESCE(NULLIF(data->>'date', '')::timestamptz, created_at),
        created_at, updated_at
      FROM records WHERE collection = 'orders'
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      INSERT INTO order_items (order_id, product_id, product_name, qty, price)
      SELECT r.id,
        COALESCE(item->>'id', ''),
        COALESCE(item->>'name', ''),
        COALESCE((item->>'qty')::int, 1),
        COALESCE((item->>'price')::numeric, 0)
      FROM records r,
        jsonb_array_elements(COALESCE(r.data->'items', '[]'::jsonb)) AS item
      WHERE r.collection = 'orders'
    `)

    await client.query('DROP TABLE records CASCADE')
    await client.query('COMMIT')
    console.log('Legacy records table migrated and removed.')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function checkConnection() {
  const { rows } = await pool.query('SELECT NOW() AS now')
  return rows[0]
}

async function nextStudentId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM students
    WHERE id ~ '^STU-[0-9]+$'
  `)
  return `STU-${String(rows[0].next).padStart(4, '0')}`
}

async function nextClassId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM classes
    WHERE id ~ '^CLS-[0-9]+$'
  `)
  return `CLS-${String(rows[0].next).padStart(4, '0')}`
}

async function nextDeadlineId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next
    FROM deadlines
    WHERE id ~ '^DLN-[0-9]+$'
  `)
  return `DLN-${String(rows[0].next).padStart(4, '0')}`
}

const INVOICE_PREFIX = 'DASC'
const INVOICE_NUM_START = 6 // SUBSTRING position after "DASC-"

async function nextInvoiceId() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(num), 1000) AS max_num
    FROM (
      SELECT CAST(SUBSTRING(id FROM ${INVOICE_NUM_START}) AS INTEGER) AS num
      FROM payments
      WHERE id ~ '^DASC-[0-9]+$'
      UNION ALL
      SELECT CAST(SUBSTRING(id FROM 5) AS INTEGER) AS num
      FROM payments
      WHERE id ~ '^INV-[0-9]+$'
      UNION ALL
      SELECT CAST(SUBSTRING(id FROM ${INVOICE_NUM_START}) AS INTEGER) AS num
      FROM orders
      WHERE id ~ '^DASC-[0-9]+$'
      UNION ALL
      SELECT CAST(SUBSTRING(id FROM 5) AS INTEGER) AS num
      FROM orders
      WHERE id ~ '^INV-[0-9]+$'
    ) ids
  `)
  return `${INVOICE_PREFIX}-${Number(rows[0]?.max_num || 1000) + 1}`
}

async function migrateInvPrefixToDasc() {
  const { rows: payments } = await pool.query(
    `SELECT id FROM payments WHERE id ~ '^INV-[0-9]+$' ORDER BY id`
  )
  for (const row of payments) {
    const newId = row.id.replace(/^INV-/, `${INVOICE_PREFIX}-`)
    await pool.query('UPDATE payments SET id = $1 WHERE id = $2', [newId, row.id])
  }

  const { rows: orders } = await pool.query(
    `SELECT id FROM orders WHERE id ~ '^INV-[0-9]+$' ORDER BY created_at ASC`
  )
  for (const row of orders) {
    const oldId = row.id
    const newId = oldId.replace(/^INV-/, `${INVOICE_PREFIX}-`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO orders (id, customer, payment_method, total, order_date, created_at, updated_at)
         SELECT $1, customer, payment_method, total, order_date, created_at, updated_at
         FROM orders WHERE id = $2`,
        [newId, oldId]
      )
      await client.query('UPDATE order_items SET order_id = $1 WHERE order_id = $2', [newId, oldId])
      await client.query('DELETE FROM orders WHERE id = $1', [oldId])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
}

export function parseCapacity(capacity) {
  const s = String(capacity || '0/20').trim()
  const [a, b] = s.split('/')
  const enrolled = Math.max(0, parseInt(a, 10) || 0)
  const max = Math.max(1, parseInt(b, 10) || parseInt(a, 10) || 20)
  return { enrolled, max }
}

export function formatCapacity(enrolled, max) {
  return `${enrolled}/${max}`
}

async function syncClassCapacity(classId) {
  const { rows: classRows } = await pool.query('SELECT capacity FROM classes WHERE id = $1', [classId])
  if (!classRows[0]) return null
  const { max } = parseCapacity(classRows[0].capacity)
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM class_students WHERE class_id = $1',
    [classId]
  )
  const capacity = formatCapacity(countRows[0].count, max)
  await pool.query('UPDATE classes SET capacity = $1, updated_at = NOW() WHERE id = $2', [capacity, classId])
  return capacity
}

async function getClassRoster(classId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.email, s.phone, s.program, s.dob, cs.created_at AS enrolled_at
     FROM class_students cs
     JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id = $1
     ORDER BY cs.created_at ASC`,
    [classId]
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    program: r.program,
    dob: fmtDate(r.dob),
    enrolledAt: r.enrolled_at,
  }))
}

async function addClassStudent(classId, studentId) {
  const cls = await get('classes', classId)
  if (!cls) {
    const err = new Error('Class not found')
    err.status = 404
    throw err
  }
  const student = await get('students', studentId)
  if (!student) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  const { rows: dup } = await pool.query(
    'SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2',
    [classId, studentId]
  )
  if (dup.length) {
    const err = new Error('Student is already in this class')
    err.status = 409
    throw err
  }

  const { enrolled, max } = parseCapacity(cls.capacity)
  if (enrolled >= max) {
    const err = new Error(`Class is full (max ${max} students)`)
    err.status = 409
    throw err
  }

  await pool.query('INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)', [classId, studentId])
  await syncClassCapacity(classId)
  const updated = await get('classes', classId)
  return { class: updated, students: await getClassRoster(classId) }
}

async function removeClassStudent(classId, studentId) {
  const { rowCount } = await pool.query(
    'DELETE FROM class_students WHERE class_id = $1 AND student_id = $2',
    [classId, studentId]
  )
  if (!rowCount) {
    const err = new Error('Student not in this class')
    err.status = 404
    throw err
  }
  await syncClassCapacity(classId)
  const updated = await get('classes', classId)
  return { class: updated, students: await getClassRoster(classId) }
}

async function fetchOrderItems(orderId) {
  const { rows } = await pool.query(
    `SELECT product_id, product_name, qty, price FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId]
  )
  return rows.map((r) => ({
    id: r.product_id,
    name: r.product_name,
    qty: r.qty,
    price: Number(r.price),
  }))
}

function orderToApi(row, items) {
  return {
    id: row.id,
    customer: row.customer,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    date: row.order_date instanceof Date ? row.order_date.toISOString() : String(row.order_date),
    items,
  }
}

async function listOrders() {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at ASC')
  const result = []
  for (const row of rows) {
    result.push(orderToApi(row, await fetchOrderItems(row.id)))
  }
  return result
}

async function getOrder(id) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id])
  if (!rows[0]) return null
  return orderToApi(rows[0], await fetchOrderItems(id))
}

async function addOrder(obj) {
  const id = obj.id || await nextInvoiceId()
  const items = obj.items || []
  const total = obj.total ?? items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
  const orderDate = obj.date || new Date().toISOString()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO orders (id, customer, payment_method, total, order_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         customer = EXCLUDED.customer,
         payment_method = EXCLUDED.payment_method,
         total = EXCLUDED.total,
         order_date = EXCLUDED.order_date,
         updated_at = NOW()`,
      [id, obj.customer ?? 'Walk-in', obj.paymentMethod ?? 'Cash', total, orderDate]
    )
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id])
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, qty, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.id ?? '', item.name ?? '', Number(item.qty) || 1, Number(item.price) || 0]
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return getOrder(id)
}

async function list(name) {
  if (name === 'orders') return listOrders()

  const cfg = TABLE_CONFIG[name]
  if (!cfg) throw new Error(`Unknown collection: ${name}`)

  const { rows } = await pool.query(
    `SELECT * FROM ${cfg.table} ORDER BY created_at ASC`
  )
  return rows.map(cfg.toApi)
}

async function get(name, itemId) {
  if (name === 'orders') return getOrder(itemId)

  const cfg = TABLE_CONFIG[name]
  const { rows } = await pool.query(
    `SELECT * FROM ${cfg.table} WHERE id = $1`,
    [itemId]
  )
  return rows[0] ? cfg.toApi(rows[0]) : null
}

async function add(name, obj, { upsert = true } = {}) {
  if (name === 'orders') return addOrder(obj)

  const cfg = TABLE_CONFIG[name]
  let record = { ...obj }
  if (name === 'students' && !record.id) {
    record.id = await nextStudentId()
  }
  if (name === 'classes' && !record.id) {
    record.id = await nextClassId()
  }
  if (name === 'deadlines' && !record.id) {
    record.id = await nextDeadlineId()
  }
  if (!record.id) {
    record.id = name === 'payments' ? await nextInvoiceId() : makeId()
  }

  const db = cfg.toDb(record)
  db.id = record.id

  if (!upsert) {
    const exists = await get(name, db.id)
    if (exists) {
      const err = new Error(`Student ID "${db.id}" already exists`)
      err.code = '23505'
      throw err
    }
    try {
      const cols = cfg.insertCols
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
      await pool.query(
        `INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${placeholders})`,
        cols.map((c) => db[c])
      )
    } catch (e) {
      if (e.code === '23505') {
        throw Object.assign(new Error(`ID "${db.id}" already exists`), { code: '23505' })
      }
      throw e
    }
    return get(name, db.id)
  }

  const cols = cfg.insertCols
  const updateSet = cfg.updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')
  await pool.query(
    `INSERT INTO ${cfg.table} (${cols.join(', ')})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (id) DO UPDATE SET ${updateSet}, updated_at = NOW()`,
    cols.map((c) => db[c])
  )
  return get(name, db.id)
}

async function update(name, itemId, obj) {
  if (name === 'orders') {
    const existing = await getOrder(itemId)
    if (!existing) return null
    return addOrder({ ...existing, ...obj, id: itemId })
  }

  const cfg = TABLE_CONFIG[name]
  const existing = await get(name, itemId)
  if (!existing) return null

  const merged = { ...existing, ...obj, id: itemId }
  if (name === 'classes' && obj.capacity != null) {
    const current = parseCapacity(existing.capacity)
    const next = parseCapacity(obj.capacity)
    if (next.enrolled > current.enrolled) next.enrolled = current.enrolled
    if (next.max < next.enrolled) {
      const err = new Error(`Max students cannot be less than enrolled (${next.enrolled})`)
      err.status = 400
      throw err
    }
    merged.capacity = formatCapacity(next.enrolled, next.max)
  }

  const db = cfg.toDb(merged)
  const setClause = cfg.updateCols.map((c, i) => `${c} = $${i + 2}`).join(', ')
  const { rowCount } = await pool.query(
    `UPDATE ${cfg.table} SET ${setClause}, updated_at = NOW() WHERE id = $1`,
    [itemId, ...cfg.updateCols.map((c) => db[c])]
  )
  return rowCount ? get(name, itemId) : null
}

async function remove_(name, itemId) {
  if (name === 'orders') {
    await pool.query('DELETE FROM orders WHERE id = $1', [itemId])
    return { ok: true }
  }
  const cfg = TABLE_CONFIG[name]
  await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [itemId])
  return { ok: true }
}

async function isEmpty() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM students) +
      (SELECT COUNT(*)::int FROM categories) +
      (SELECT COUNT(*)::int FROM products) AS count
  `)
  return rows[0].count === 0
}

async function migrateJsonFiles() {
  for (const name of collections) {
    if (name === 'orders') continue
    const file = path.join(dataRoot, `${name}.json`)
    try {
      const txt = await fs.readFile(file, 'utf8')
      const items = JSON.parse(txt)
      if (!Array.isArray(items)) continue
      for (const item of items) {
        if (!item?.id) continue
        try {
          await add(name, item, { upsert: false })
        } catch (e) {
          if (e.code !== '23505') throw e
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
  }
}

async function migrateOrderInvoiceIds() {
  const { rows } = await pool.query(`
    SELECT id FROM orders
    WHERE id !~ '^DASC-[0-9]+$'
    ORDER BY created_at ASC
  `)
  for (const row of rows) {
    const oldId = row.id
    const newId = await nextInvoiceId()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO orders (id, customer, payment_method, total, order_date, created_at, updated_at)
         SELECT $1, customer, payment_method, total, order_date, created_at, updated_at
         FROM orders WHERE id = $2`,
        [newId, oldId]
      )
      await client.query('UPDATE order_items SET order_id = $1 WHERE order_id = $2', [newId, oldId])
      await client.query('DELETE FROM orders WHERE id = $1', [oldId])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
}

async function seedIfEmpty() {
  await initSchema()
  await migrateFromLegacyRecords()
  await migratePaymentColumns()
  await migratePaymentInvoiceColumns()
  await migrateInvPrefixToDasc()
  await migrateOrderInvoiceIds()
  await migrateDeadlineColumns()
  await migrateDeadlineIds()
  await migrateDeadlineTableLayout()
  await migrateClassStudents()
  await initDbeaverViews()

  if (await isEmpty()) {
    try {
      await migrateJsonFiles()
    } catch {
      // fall through to default seed
    }
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

  await add('payments', { id: 'DASC-1001', studentName: 'Jane Doe', date: '2025-09-10', amount: 120, method: 'Card', status: 'Paid' })
  await add('payments', { id: 'DASC-1002', studentName: 'John Smith', date: '2025-09-11', amount: 200, method: 'Cash', status: 'Pending' })

  await add('deadlines', { id: makeId(), name: 'Jane Doe', task: 'Exam 1', due: '2025-09-20', status: 'Pending' })
  await add('deadlines', { id: makeId(), name: 'John Smith', task: 'Assignment 2', due: '2025-09-15', status: 'Overdue' })

  await add('bookIssues', { id: makeId(), name: 'Jane Doe', title: 'Intro to JS', isbn: '978-1-2345', issued: '2025-09-01', due: '2025-09-20', status: 'Issued' })
  await add('bookIssues', { id: makeId(), name: 'John Smith', title: 'UI/UX Handbook', isbn: '978-1-6789', issued: '2025-08-20', due: '2025-09-05', status: 'Overdue' })

  await add('alumni', { id: makeId(), name: 'Jane Doe', program: 'Computer Science', date: '2025-06-30', grade: 'A', cert: true })
  await add('alumni', { id: makeId(), name: 'John Smith', program: 'Business Administration', date: '2025-05-20', grade: 'B', cert: false })
}

export const db = {
  list, get, add, update, remove: remove_, seedIfEmpty, checkConnection,
  nextStudentId, nextClassId, nextInvoiceId, parseCapacity, formatCapacity,
  getClassRoster, addClassStudent, removeClassStudent,
}
