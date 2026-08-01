import { toIsoDate } from './dateFormat.js'
import { formatMoney as formatMoneyDisplay } from './moneyFormat.js'

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function inDateRange(isoDate, from, to) {
  const d = toIsoDate(isoDate)
  if (!d) return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function dayKey(isoDate) {
  return toIsoDate(isoDate)
}

export function monthKey(isoDate) {
  const d = dayKey(isoDate)
  return d ? d.slice(0, 7) : ''
}

export function formatMoney(n) {
  return formatMoneyDisplay(n)
}

export function formatMonthLabel(ym) {
  if (!ym || ym.length < 7) return '—'
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

/** Daily cash flow: tuition (paid) + POS inflows, salary/expense outflows, net */
export function buildDailyCashFlow(
  payments = [],
  orders = [],
  { dateFrom = '', dateTo = '', salaryPayments = [], expenses = [] } = {}
) {
  const map = new Map()

  const touch = (day) => {
    if (!day) return null
    if (!map.has(day)) {
      map.set(day, {
        date: day,
        tuition: 0,
        tuitionCount: 0,
        pending: 0,
        pendingCount: 0,
        pos: 0,
        posCount: 0,
        salary: 0,
        salaryCount: 0,
        salaryPending: 0,
        expenses: 0,
        expensesCount: 0,
        expensesPending: 0,
        total: 0,
        net: 0,
      })
    }
    return map.get(day)
  }

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    const row = touch(dayKey(p.date))
    if (!row) continue
    const amount = Number(p.amount) || 0
    if (p.status === 'Paid') {
      row.tuition = money(row.tuition + amount)
      row.tuitionCount += 1
    } else if (p.status === 'Pending') {
      row.pending = money(row.pending + amount)
      row.pendingCount += 1
    }
  }

  for (const o of orders) {
    if (!inDateRange(o.date, dateFrom, dateTo)) continue
    const row = touch(dayKey(o.date))
    if (!row) continue
    row.pos = money(row.pos + (Number(o.total) || 0))
    row.posCount += 1
  }

  for (const s of salaryPayments) {
    if (!inDateRange(s.date, dateFrom, dateTo)) continue
    const row = touch(dayKey(s.date))
    if (!row) continue
    const amount = Number(s.amount) || 0
    if (s.status === 'Paid') {
      row.salary = money(row.salary + amount)
      row.salaryCount += 1
    } else if (s.status === 'Pending') {
      row.salaryPending = money(row.salaryPending + amount)
    }
  }

  for (const e of expenses) {
    if (!inDateRange(e.date, dateFrom, dateTo)) continue
    const row = touch(dayKey(e.date))
    if (!row) continue
    const amount = Number(e.amount) || 0
    if (e.status === 'Paid') {
      row.expenses = money(row.expenses + amount)
      row.expensesCount += 1
    } else if (e.status === 'Pending') {
      row.expensesPending = money(row.expensesPending + amount)
    }
  }

  return [...map.values()]
    .map((r) => {
      const total = money(r.tuition + r.pos)
      return { ...r, total, net: money(total - r.salary - r.expenses) }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Payment method breakdown across tuition + POS */
export function buildMethodBreakdown(payments = [], orders = [], { dateFrom = '', dateTo = '', status = 'Paid' } = {}) {
  const map = new Map()

  const add = (method, source, amount) => {
    const key = method || 'Other'
    if (!map.has(key)) {
      map.set(key, { method: key, tuition: 0, pos: 0, total: 0, count: 0 })
    }
    const row = map.get(key)
    row[source] = money(row[source] + amount)
    row.total = money(row.tuition + row.pos)
    row.count += 1
  }

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    if (status !== 'all' && p.status !== status) continue
    add(p.method, 'tuition', Number(p.amount) || 0)
  }
  for (const o of orders) {
    if (!inDateRange(o.date, dateFrom, dateTo)) continue
    add(o.paymentMethod, 'pos', Number(o.total) || 0)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Fee purpose report (tuition payments only) */
export function buildPurposeBreakdown(payments = [], { dateFrom = '', dateTo = '', status = 'all' } = {}) {
  const map = new Map()

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    if (status !== 'all' && p.status !== status) continue
    const purpose = p.purpose || 'Unspecified'
    if (!map.has(purpose)) {
      map.set(purpose, {
        purpose,
        paid: 0,
        pending: 0,
        total: 0,
        paidCount: 0,
        pendingCount: 0,
        count: 0,
      })
    }
    const row = map.get(purpose)
    const amount = Number(p.amount) || 0
    row.count += 1
    if (p.status === 'Paid') {
      row.paid = money(row.paid + amount)
      row.paidCount += 1
    } else if (p.status === 'Pending') {
      row.pending = money(row.pending + amount)
      row.pendingCount += 1
    }
    row.total = money(row.paid + row.pending)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Monthly summary: revenue inflows, salary/expense outflows, net */
export function buildMonthlySummary(
  payments = [],
  orders = [],
  { dateFrom = '', dateTo = '', salaryPayments = [], expenses = [] } = {}
) {
  const map = new Map()

  const touch = (month) => {
    if (!month) return null
    if (!map.has(month)) {
      map.set(month, {
        month,
        tuition: 0,
        pending: 0,
        pos: 0,
        salary: 0,
        salaryPending: 0,
        expenses: 0,
        expensesPending: 0,
        total: 0,
        net: 0,
        paymentCount: 0,
        orderCount: 0,
        salaryCount: 0,
        expensesCount: 0,
      })
    }
    return map.get(month)
  }

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    const row = touch(monthKey(p.date))
    if (!row) continue
    const amount = Number(p.amount) || 0
    row.paymentCount += 1
    if (p.status === 'Paid') row.tuition = money(row.tuition + amount)
    else if (p.status === 'Pending') row.pending = money(row.pending + amount)
  }

  for (const o of orders) {
    if (!inDateRange(o.date, dateFrom, dateTo)) continue
    const row = touch(monthKey(o.date))
    if (!row) continue
    row.pos = money(row.pos + (Number(o.total) || 0))
    row.orderCount += 1
  }

  for (const s of salaryPayments) {
    if (!inDateRange(s.date, dateFrom, dateTo)) continue
    const row = touch(monthKey(s.date))
    if (!row) continue
    const amount = Number(s.amount) || 0
    if (s.status === 'Paid') {
      row.salary = money(row.salary + amount)
      row.salaryCount += 1
    } else if (s.status === 'Pending') {
      row.salaryPending = money(row.salaryPending + amount)
    }
  }

  for (const e of expenses) {
    if (!inDateRange(e.date, dateFrom, dateTo)) continue
    const row = touch(monthKey(e.date))
    if (!row) continue
    const amount = Number(e.amount) || 0
    if (e.status === 'Paid') {
      row.expenses = money(row.expenses + amount)
      row.expensesCount += 1
    } else if (e.status === 'Pending') {
      row.expensesPending = money(row.expensesPending + amount)
    }
  }

  return [...map.values()]
    .map((r) => {
      const total = money(r.tuition + r.pos)
      return { ...r, total, net: money(total - r.salary - r.expenses) }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

/**
 * Cash-based Profit & Loss for a period.
 * Revenue = Paid tuition (by purpose) + POS; Expenses = Paid salary + Paid school expenses (by category).
 * Pending amounts are memo-only and do not affect net profit.
 */
export function buildProfitAndLoss(
  payments = [],
  orders = [],
  { dateFrom = '', dateTo = '', salaryPayments = [], expenses = [] } = {}
) {
  const purposeMap = new Map()
  let posAmount = 0
  let posCount = 0
  let pendingTuition = 0
  let salaryPaid = 0
  let salaryCount = 0
  let pendingSalary = 0
  const categoryMap = new Map()
  let pendingExpenses = 0

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    const amount = Number(p.amount) || 0
    if (p.status === 'Paid') {
      const label = p.purpose || 'Unspecified'
      if (!purposeMap.has(label)) purposeMap.set(label, { label, amount: 0, count: 0 })
      const row = purposeMap.get(label)
      row.amount = money(row.amount + amount)
      row.count += 1
    } else if (p.status === 'Pending') {
      pendingTuition = money(pendingTuition + amount)
    }
  }

  for (const o of orders) {
    if (!inDateRange(o.date, dateFrom, dateTo)) continue
    posAmount = money(posAmount + (Number(o.total) || 0))
    posCount += 1
  }

  for (const s of salaryPayments) {
    if (!inDateRange(s.date, dateFrom, dateTo)) continue
    const amount = Number(s.amount) || 0
    if (s.status === 'Paid') {
      salaryPaid = money(salaryPaid + amount)
      salaryCount += 1
    } else if (s.status === 'Pending') {
      pendingSalary = money(pendingSalary + amount)
    }
  }

  for (const e of expenses) {
    if (!inDateRange(e.date, dateFrom, dateTo)) continue
    const amount = Number(e.amount) || 0
    if (e.status === 'Paid') {
      const label = e.category || 'Other Expense'
      if (!categoryMap.has(label)) categoryMap.set(label, { label, amount: 0, count: 0 })
      const row = categoryMap.get(label)
      row.amount = money(row.amount + amount)
      row.count += 1
    } else if (e.status === 'Pending') {
      pendingExpenses = money(pendingExpenses + amount)
    }
  }

  const revenueLines = [...purposeMap.values()]
    .filter((r) => r.amount !== 0 || r.count > 0)

  if (posAmount !== 0 || posCount > 0) {
    revenueLines.push({ label: 'POS Sales', amount: posAmount, count: posCount })
  }

  revenueLines.sort((a, b) => b.amount - a.amount)

  const expenseLines = []
  if (salaryPaid !== 0 || salaryCount > 0) {
    expenseLines.push({ label: 'Staff & Teacher Salary', amount: salaryPaid, count: salaryCount })
  }
  for (const row of [...categoryMap.values()]
    .filter((r) => r.amount !== 0 || r.count > 0)
    .sort((a, b) => b.amount - a.amount)) {
    expenseLines.push(row)
  }

  const totalRevenue = money(revenueLines.reduce((s, r) => s + r.amount, 0))
  const totalExpenses = money(expenseLines.reduce((s, r) => s + r.amount, 0))
  const netProfit = money(totalRevenue - totalExpenses)
  const marginPct = totalRevenue > 0
    ? Math.round((netProfit / totalRevenue) * 1000) / 10
    : 0

  return {
    revenueLines,
    expenseLines,
    totalRevenue,
    totalExpenses,
    netProfit,
    marginPct,
    memo: {
      pendingTuition,
      pendingSalary,
      pendingExpenses,
    },
  }
}

/** Flatten P&L into exportable rows (section / account / amount / count). */
export function flattenProfitAndLoss(pl) {
  if (!pl) return []
  const rows = []
  for (const line of pl.revenueLines || []) {
    rows.push({ section: 'Revenue', account: line.label, amount: line.amount, count: line.count })
  }
  rows.push({ section: 'Revenue', account: 'Total Revenue', amount: pl.totalRevenue, count: '' })
  for (const line of pl.expenseLines || []) {
    rows.push({ section: 'Expenses', account: line.label, amount: line.amount, count: line.count })
  }
  rows.push({ section: 'Expenses', account: 'Total Expenses', amount: pl.totalExpenses, count: '' })
  rows.push({
    section: 'Result',
    account: pl.netProfit >= 0 ? 'Net Profit' : 'Net Loss',
    amount: pl.netProfit,
    count: '',
  })
  if (pl.memo) {
    rows.push({ section: 'Memo', account: 'Pending Tuition', amount: pl.memo.pendingTuition, count: '' })
    rows.push({ section: 'Memo', account: 'Pending Salary', amount: pl.memo.pendingSalary, count: '' })
    rows.push({ section: 'Memo', account: 'Pending Expenses', amount: pl.memo.pendingExpenses, count: '' })
  }
  return rows
}

/** Student ledger entries (payments only) */
export function buildStudentLedgers(payments = [], students = [], { dateFrom = '', dateTo = '', studentId = 'all' } = {}) {
  const byStudent = new Map()

  for (const p of payments) {
    if (!inDateRange(p.date, dateFrom, dateTo)) continue
    const sid = p.studentId || students.find((s) => s.name === p.studentName)?.id || ''
    const name = p.studentName || 'Walk-in / Unknown'
    if (studentId !== 'all' && sid !== studentId) continue

    const key = sid || `name:${name}`
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        studentId: sid || '—',
        studentName: name,
        paid: 0,
        pending: 0,
        total: 0,
        count: 0,
        payments: [],
      })
    }
    const row = byStudent.get(key)
    const amount = Number(p.amount) || 0
    row.count += 1
    row.payments.push(p)
    if (p.status === 'Paid') row.paid = money(row.paid + amount)
    else if (p.status === 'Pending') row.pending = money(row.pending + amount)
    row.total = money(row.paid + row.pending)
  }

  return [...byStudent.values()]
    .map((r) => ({
      ...r,
      payments: [...r.payments].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}
