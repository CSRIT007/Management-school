import express from 'express'
import cors from 'cors'
import { db } from './db.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Generic collections
const valid = new Set(['students','classes','deadlines','payments','bookIssues','alumni','categories','products','orders'])

app.get('/api/:col', async (req, res) => {
  const { col } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  const rows = await db.list(col)
  res.json(rows)
})

app.post('/api/:col', async (req, res) => {
  const { col } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  const created = await db.add(col, req.body || {})
  res.status(201).json(created)
})

app.get('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  const row = await db.get(col, id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

app.put('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  const updated = await db.update(col, id, req.body || {})
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.delete('/api/:col/:id', async (req, res) => {
  const { col, id } = req.params
  if (!valid.has(col)) return res.status(404).json({ error: 'Unknown collection' })
  await db.remove(col, id)
  res.json({ ok: true })
})

// Reports
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
db.seedIfEmpty().then(() => {
  app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
})

