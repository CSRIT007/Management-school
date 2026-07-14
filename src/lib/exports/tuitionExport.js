import { formatDisplayDate } from '../dateFormat.js'
import { formatInvNo } from '../invoiceId.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const TUITION_REPORT_TITLE = 'Tuition & Fees Report'

export const TUITION_EXPORT_COLUMNS = [
  { key: 'invoiceNo', label: 'INV No', getValue: (r) => formatInvNo(r.id) },
  { key: 'studentId', label: 'Student ID', getValue: (r) => r.studentId || '' },
  { key: 'studentName', label: 'Student Name', getValue: (r) => r.studentName || '' },
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'purpose', label: 'Purpose', getValue: (r) => r.purpose || '' },
  { key: 'amount', label: 'Amount', getValue: (r) => Number(r.amount || 0).toFixed(2) },
  { key: 'method', label: 'Payment Method', getValue: (r) => r.method || '' },
  { key: 'status', label: 'Status', getValue: (r) => r.status || '' },
  { key: 'note', label: 'Note', getValue: (r) => r.note || '' },
]

export const TUITION_FILTER_INITIAL = {
  status: 'all',
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

export function filterTuitionPayments(payments, filters) {
  return payments.filter((payment) => {
    if (filters.status !== 'all' && payment.status !== filters.status) return false
    if (filters.method !== 'all' && payment.method !== filters.method) return false
    if (filters.purpose !== 'all' && payment.purpose !== filters.purpose) return false
    if (!inDateRange(payment.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function downloadTuitionCsv({ columns, rows, reportTitle = TUITION_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
