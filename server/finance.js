import { db } from './db.js'
import { calendarDate, todayCalendarDate } from './calendarDate.js'
import { listSalaryPayments } from './salaryPayments.js'
import { listSchoolExpenses } from './schoolExpenses.js'

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function inDateRange(isoDate, from, to) {
  const d = calendarDate(isoDate)
  if (!d) return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export async function getFinanceOverview({ dateFrom = '', dateTo = '' } = {}) {
  const [payments, orders, salaryPayments, schoolExpenses] = await Promise.all([
    db.list('payments'),
    db.list('orders'),
    listSalaryPayments(),
    listSchoolExpenses(),
  ])

  const filteredPayments = payments.filter((p) => inDateRange(p.date, dateFrom, dateTo))
  const filteredOrders = orders.filter((o) => inDateRange(o.date, dateFrom, dateTo))
  const filteredSalary = salaryPayments.filter((s) => inDateRange(s.date, dateFrom, dateTo))
  const filteredExpenses = schoolExpenses.filter((e) => inDateRange(e.date, dateFrom, dateTo))

  const paid = filteredPayments.filter((p) => p.status === 'Paid')
  const pending = filteredPayments.filter((p) => p.status === 'Pending')
  const salaryPaidRows = filteredSalary.filter((s) => s.status === 'Paid')
  const salaryPendingRows = filteredSalary.filter((s) => s.status === 'Pending')
  const expensesPaidRows = filteredExpenses.filter((e) => e.status === 'Paid')
  const expensesPendingRows = filteredExpenses.filter((e) => e.status === 'Pending')

  const tuitionCollected = money(paid.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const tuitionPending = money(pending.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const posRevenue = money(filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0))
  const salaryPaid = money(salaryPaidRows.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const salaryPending = money(salaryPendingRows.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const expensesPaid = money(expensesPaidRows.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const expensesPending = money(expensesPendingRows.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const totalRevenue = money(tuitionCollected + posRevenue)

  const today = todayCalendarDate()
  const tuitionToday = money(
    paid
      .filter((p) => calendarDate(p.date) === today)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  )
  const posToday = money(
    filteredOrders
      .filter((o) => calendarDate(o.date) === today)
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
  )
  const salaryToday = money(
    salaryPaidRows
      .filter((s) => calendarDate(s.date) === today)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  )
  const expensesToday = money(
    expensesPaidRows
      .filter((e) => calendarDate(e.date) === today)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
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
    .slice(0, 5)

  const recentOrders = [...filteredOrders]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 5)

  const recentSalary = [...filteredSalary]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 5)

  const recentExpenses = [...filteredExpenses]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 5)

  return {
    tuitionCollected,
    tuitionPending,
    pendingCount: pending.length,
    posRevenue,
    totalRevenue,
    salaryPaid,
    salaryPending,
    salaryCount: filteredSalary.length,
    salaryPaidCount: salaryPaidRows.length,
    expensesPaid,
    expensesPending,
    expensesCount: filteredExpenses.length,
    expensesPaidCount: expensesPaidRows.length,
    totalExpenses: money(salaryPaid + expensesPaid),
    netCash: money(totalRevenue - salaryPaid - expensesPaid),
    tuitionToday,
    posToday,
    salaryToday,
    expensesToday,
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
    recentSalary,
    recentExpenses,
  }
}
