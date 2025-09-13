import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataRoot = path.join(__dirname, 'data')

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

function id() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase()
}

async function ensureDir() {
  await fs.mkdir(dataRoot, { recursive: true })
}

async function fileFor(name) {
  await ensureDir()
  return path.join(dataRoot, `${name}.json`)
}

async function read(name) {
  const file = await fileFor(name)
  try {
    const txt = await fs.readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

async function write(name, data) {
  const file = await fileFor(name)
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

export async function list(name) {
  return read(name)
}

export async function get(name, itemId) {
  const all = await read(name)
  return all.find((x) => x.id === itemId) || null
}

export async function add(name, obj) {
  const all = await read(name)
  const record = { id: obj.id || id(), ...obj }
  all.push(record)
  await write(name, all)
  return record
}

export async function update(name, itemId, obj) {
  const all = await read(name)
  const idx = all.findIndex((x) => x.id === itemId)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...obj, id: itemId }
  await write(name, all)
  return all[idx]
}

export async function remove_(name, itemId) {
  const all = await read(name)
  const next = all.filter((x) => x.id !== itemId)
  await write(name, next)
  return { ok: true }
}

export async function seedIfEmpty() {
  // Seed minimal data for first run
  const cats = await read('categories')
  if (cats.length === 0) {
    await write('categories', [
      { id: 'CAT-BOOKS', name: 'Books', description: 'Textbooks and references' },
      { id: 'CAT-STATIONERY', name: 'Stationery', description: 'Pens, notebooks, etc.' },
      { id: 'CAT-UNIFORMS', name: 'Uniforms', description: 'School uniforms' },
    ])
  }

  const prods = await read('products')
  if (prods.length === 0) {
    await write('products', [
      { id: 'P001', name: 'Intro to JS', category: 'Books', stock: 12, price: 15.0, cost: 8.0, sku: 'BK-JS-001' },
      { id: 'P002', name: 'A4 Notebook', category: 'Stationery', stock: 50, price: 2.5, cost: 1.0, sku: 'ST-NB-A4' },
      { id: 'P003', name: 'Uniform Shirt', category: 'Uniforms', stock: 20, price: 18.0, cost: 9.0, sku: 'UN-SHIRT-01' },
    ])
  }

  const classes = await read('classes')
  if (classes.length === 0) {
    await write('classes', [
      { id: 'C101', name: 'Intro to Programming', instructor: 'Mr. Kim', schedule: 'Mon/Wed 9-10', capacity: '15/20' },
      { id: 'C205', name: 'UI/UX Basics', instructor: 'Ms. Heung', schedule: 'Tue/Thu 14-16', capacity: '20/20' },
    ])
  }

  const payments = await read('payments')
  if (payments.length === 0) {
    await write('payments', [
      { id: 'INV-1001', studentName: 'Jane Doe', date: '2025-09-10', amount: 120, method: 'Card', status: 'Paid' },
      { id: 'INV-1002', studentName: 'John Smith', date: '2025-09-11', amount: 200, method: 'Cash', status: 'Pending' },
    ])
  }

  const deadlines = await read('deadlines')
  if (deadlines.length === 0) {
    await write('deadlines', [
      { id: id(), name: 'Jane Doe', task: 'Exam 1', due: '2025-09-20', status: 'Pending' },
      { id: id(), name: 'John Smith', task: 'Assignment 2', due: '2025-09-15', status: 'Overdue' },
    ])
  }

  const bookIssues = await read('bookIssues')
  if (bookIssues.length === 0) {
    await write('bookIssues', [
      { id: id(), name: 'Jane Doe', title: 'Intro to JS', isbn: '978-1-2345', issued: '2025-09-01', due: '2025-09-20', status: 'Issued' },
      { id: id(), name: 'John Smith', title: 'UI/UX Handbook', isbn: '978-1-6789', issued: '2025-08-20', due: '2025-09-05', status: 'Overdue' },
    ])
  }

  const alumni = await read('alumni')
  if (alumni.length === 0) {
    await write('alumni', [
      { id: id(), name: 'Jane Doe', program: 'Computer Science', date: '2025-06-30', grade: 'A', cert: true },
      { id: id(), name: 'John Smith', program: 'Business Administration', date: '2025-05-20', grade: 'B', cert: false },
    ])
  }
}

export const db = { list, get, add, update, remove: remove_, seedIfEmpty }

