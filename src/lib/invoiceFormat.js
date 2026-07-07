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
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${date} ${time}`
}
