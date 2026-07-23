import { APP_TIMEZONE, formatDisplayDate } from './dateFormat.js'

export function getBillToParts({ studentId, studentName } = {}) {
  return {
    name: studentName?.trim() || '—',
    studentId: studentId?.trim() || '',
  }
}

export function formatBillTo({ studentId, studentName } = {}) {
  const { name, studentId: id } = getBillToParts({ studentId, studentName })
  if (id && name && name !== '—') return `${id}-${name}`
  if (name && name !== '—') return name
  return '—'
}

export function formatInvoiceDateTime(value) {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  const date = formatDisplayDate(d)
  const time = d.toLocaleTimeString('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${date} ${time}`
}
