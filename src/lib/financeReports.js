function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function inDateRange(isoDate, from, to) {
  const d = (isoDate || '').slice(0, 10)
  if (!d) return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function dayKey(isoDate) {
  return (isoDate || '').slice(0, 10)
}

export function monthKey(isoDate) {
  const d = dayKey(isoDate)
  return d ? d.slice(0, 7) : ''
}

export function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

export function formatMonthLabel(ym) {
  if (!ym || ym.length < 7) return '—'
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

/** Daily cash flow: tuition (paid) + POS total per day */
export function buildDailyCashFlow(payments = [], orders = [], { dateFrom = '', dateTo = '' } = {}) {
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
        total: 0,
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

  return [...map.values()]
    .map((r) => ({ ...r, total: money(r.tuition + r.pos) }))
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

/** Monthly summary */
export function buildMonthlySummary(payments = [], orders = [], { dateFrom = '', dateTo = '' } = {}) {
  const map = new Map()

  const touch = (month) => {
    if (!month) return null
    if (!map.has(month)) {
      map.set(month, {
        month,
        tuition: 0,
        pending: 0,
        pos: 0,
        total: 0,
        paymentCount: 0,
        orderCount: 0,
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

  return [...map.values()]
    .map((r) => ({ ...r, total: money(r.tuition + r.pos) }))
    .sort((a, b) => b.month.localeCompare(a.month))
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
