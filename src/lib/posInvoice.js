import { todayIso, toIsoDate } from './dateFormat.js'

export function orderToInvoice(order, { students = [], user } = {}) {
  if (!order) return null
  const studentId = order.studentId
    || students.find((s) => s.name === order.customer)?.id
    || ''
  return {
    id: order.id,
    date: toIsoDate(order.date) || todayIso(),
    amount: Number(order.total) || 0,
    method: order.paymentMethod || 'Cash',
    status: 'Paid',
    studentId,
    studentName: order.customer || 'Walk-in',
    items: order.items || [],
    invoicedBy: user?.name || 'Admin',
    invoicedAt: order.date || new Date().toISOString(),
    note: '',
  }
}
