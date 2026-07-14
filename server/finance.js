import { db } from './db.js'

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function inDateRange(isoDate, from, to) {
  const d = (isoDate || '').slice(0, 10)
  if (!d) return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export async function getFinanceOverview({ dateFrom = '', dateTo = '' } = {}) {
  const [payments, orders] = await Promise.all([
    db.list('payments'),
    db.list('orders'),
  ])

  const filteredPayments = payments.filter((p) => inDateRange(p.date, dateFrom, dateTo))
  const filteredOrders = orders.filter((o) => inDateRange(o.date, dateFrom, dateTo))

  const paid = filteredPayments.filter((p) => p.status === 'Paid')
  const pending = filteredPayments.filter((p) => p.status === 'Pending')

  const tuitionCollected = money(paid.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const tuitionPending = money(pending.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const posRevenue = money(filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0))

  const today = new Date().toISOString().slice(0, 10)
  const tuitionToday = money(
    paid
      .filter((p) => (p.date || '').slice(0, 10) === today)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  )
  const posToday = money(
    filteredOrders
      .filter((o) => (o.date || '').slice(0, 10) === today)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
  )

  const byMethod = {}
  for (const p of paid) {
    const key = p.method || 'Other'
    byMethod[key] = money((byMethod[key] || 0) + (Number(p.amount) || 0))
  }
  for (const o of filteredOrders) {
    const key = o.paymentMethod || 'Other'
    byMethod[key] = money((byMethod[key] || 0) + (Number(o.total) || 0))
  }

  const byPurpose = {}
  for (const p of paid) {
    const key = p.purpose || 'Unspecified'
    byPurpose[key] = money((byPurpose[key] || 0) + (Number(p.amount) || 0))
  }

  const recentPayments = [...filteredPayments]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 8)

  const recentOrders = [...filteredOrders]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 8)

  return {
    tuitionCollected,
    tuitionPending,
    pendingCount: pending.length,
    posRevenue,
    totalRevenue: money(tuitionCollected + posRevenue),
    tuitionToday,
    posToday,
    paymentCount: filteredPayments.length,
    orderCount: filteredOrders.length,
    byMethod: Object.entries(byMethod)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total),
    byPurpose: Object.entries(byPurpose)
      .map(([purpose, total]) => ({ purpose, total }))
      .sort((a, b) => b.total - a.total),
    recentPayments,
    recentOrders,
  }
}
