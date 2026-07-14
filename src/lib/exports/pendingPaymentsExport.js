import { formatDisplayDate } from '../dateFormat.js'
import { formatInvNo } from '../invoiceId.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const PENDING_PAYMENTS_REPORT_TITLE = 'Pending Payments Report'

export const PENDING_EXPORT_COLUMNS = [
  { key: 'invoiceNo', label: 'INV No', getValue: (r) => formatInvNo(r.id) },
  { key: 'studentId', label: 'Student ID', getValue: (r) => r.studentId || '' },
  { key: 'studentName', label: 'Student Name', getValue: (r) => r.studentName || '' },
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'purpose', label: 'Purpose', getValue: (r) => r.purpose || '' },
  { key: 'amount', label: 'Amount', getValue: (r) => Number(r.amount || 0).toFixed(2) },
  { key: 'method', label: 'Payment Method', getValue: (r) => r.method || '' },
  { key: 'note', label: 'Note', getValue: (r) => r.note || '' },
]

export const PENDING_FILTER_INITIAL = {
  method: 'all',
  purpose: 'all',
  dateFrom: '',
  dateTo: '',
}

function inDateRange(isoDate, from, to) {
  const d = (isoDate || '').slice(0, 10)
  if (!d) return !from && !to
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function filterPendingPayments(payments, filters) {
  return payments
    .filter((p) => p.status === 'Pending')
    .filter((payment) => {
      if (filters.method !== 'all' && payment.method !== filters.method) return false
      if (filters.purpose !== 'all' && payment.purpose !== filters.purpose) return false
      if (!inDateRange(payment.date, filters.dateFrom, filters.dateTo)) return false
      return true
    })
}

export function downloadPendingCsv({ columns, rows, reportTitle = PENDING_PAYMENTS_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
