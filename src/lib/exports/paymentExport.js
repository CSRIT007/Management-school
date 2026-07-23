import { formatDisplayDate, inDateRange } from '../dateFormat.js'
import { formatInvNo } from '../invoiceId.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const PAYMENT_REPORT_TITLE = 'Payment History'

export const PAYMENT_EXPORT_COLUMNS = [
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

export const PAYMENT_FILTER_INITIAL = {
  status: 'all',
  method: 'all',
  studentId: 'all',
  purpose: 'all',
  dateFrom: '',
  dateTo: '',
}

export function filterPayments(payments, filters) {
  return payments.filter((payment) => {
    if (filters.status !== 'all' && payment.status !== filters.status) return false
    if (filters.method !== 'all' && payment.method !== filters.method) return false
    if (filters.studentId !== 'all' && payment.studentId !== filters.studentId) return false
    if (filters.purpose !== 'all' && payment.purpose !== filters.purpose) return false
    if (!inDateRange(payment.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function downloadPaymentCsv({ columns, rows, reportTitle = PAYMENT_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
