import express from 'express'
import cors from 'cors'
import { db, checkConnection } from './db.js'
import { getLanIp, printAppUrls } from './network.js'
import { signToken, verifyPassword, sanitizeUser } from './auth.js'
import { requireAuth, requireRole } from './middleware/auth.js'
import {
  listUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  setUserPassword,
  touchUserLogin,
} from './users.js'

const app = express()
const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'

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

app.get('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    res.json(await listUsers())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body || {}
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const user = await createUser({ name, email, password, role, active })
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
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/payments/next-inv-id', async (req, res) => {
  try {
    const id = await db.nextInvoiceId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Reports (must be registered before /api/:col routes)
app.get('/api/reports/summary', async (req, res) => {
  const products = await db.list('products')
  const lowStock = products.filter(p => (p.stock ?? 0) <= 3).length
  const today = new Date().toISOString().slice(0,10)
  const orders = await db.list('orders')
  const todaySales = orders
    .filter(o => (o.date || '').startsWith(today))
    .reduce((s,o) => s + (o.total || 0), 0)
  res.json({ totalProducts: products.length, lowStockItems: lowStock, totalSalesToday: todaySales })
})

app.get('/api/reports/sales-over-time', async (req, res) => {
  const orders = await db.list('orders')
  const map = new Map()
  for (const o of orders) {
    const d = (o.date || '').slice(0,10)
    map.set(d, (map.get(d) || 0) + (o.total || 0))
  }
  res.json(Array.from(map, ([date, total]) => ({ date, total })))
})

app.get('/api/reports/top-products', async (req, res) => {
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

app.get('/api/reports/low-stock', async (req, res) => {
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

app.get('/api/students/next-id', async (req, res) => {
  try {
    const id = await db.nextStudentId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/classes/next-id', async (req, res) => {
  try {
    const id = await db.nextClassId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/classes/:id/roster', async (req, res) => {
  try {
    const cls = await db.get('classes', req.params.id)
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    const students = await db.getClassRoster(req.params.id)
    const { enrolled, max } = db.parseCapacity(cls.capacity)
    res.json({ class: cls, students, enrolled, max, capacity: cls.capacity })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/classes/:id/students', async (req, res) => {
  try {
    const { studentId } = req.body || {}
    if (!studentId) return res.status(400).json({ error: 'studentId is required' })
    const result = await db.addClassStudent(req.params.id, studentId)
    res.status(201).json(result)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.delete('/api/classes/:id/students/:studentId', async (req, res) => {
  try {
    const result = await db.removeClassStudent(req.params.id, req.params.studentId)
    res.json(result)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

app.get('/api/:col', async (req, res) => {
  const { col } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const rows = await db.list(col)
    res.json(rows)
  } catch (e) {
    console.error(`GET /api/${col}:`, e.message)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/:col', async (req, res) => {
  const { col } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const strict = col === 'students'
    const created = await db.add(col, req.body || {}, { upsert: !strict })
    res.status(201).json(created)
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: e.message || 'Duplicate ID' })
    }
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const updated = await db.update(col, id, req.body || {})
    if (!updated) return res.status(404).json({ error: 'Not found' })
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const existing = await db.get(col, id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    await db.remove(col, id)
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  try {
    const row = await db.get(col, id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) {
    console.error(`GET /api/${col}/${id}:`, e.message)
    res.status(500).json({ error: e.message })
  }
})

// POS order creation convenience endpoint
app.post('/api/pos/checkout', async (req, res) => {
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

