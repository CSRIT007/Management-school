import { formatDisplayDate } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'
import { formatMonthLabel } from '../financeReports.js'

export const CASH_FLOW_TITLE = 'Daily Cash Flow'
export const METHOD_REPORT_TITLE = 'Payment Method Report'
export const PURPOSE_REPORT_TITLE = 'Fee Purpose Report'
export const MONTHLY_SUMMARY_TITLE = 'Monthly Financial Summary'
export const STUDENT_LEDGER_TITLE = 'Student Payment Ledger'

export const CASH_FLOW_COLUMNS = [
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'tuition', label: 'Tuition Collected', getValue: (r) => Number(r.tuition || 0).toFixed(2) },
  { key: 'tuitionCount', label: 'Tuition Invoices', getValue: (r) => r.tuitionCount },
  { key: 'pos', label: 'POS Revenue', getValue: (r) => Number(r.pos || 0).toFixed(2) },
  { key: 'posCount', label: 'POS Orders', getValue: (r) => r.posCount },
  { key: 'pending', label: 'Pending Tuition', getValue: (r) => Number(r.pending || 0).toFixed(2) },
  { key: 'total', label: 'Total Collected', getValue: (r) => Number(r.total || 0).toFixed(2) },
]

export const METHOD_COLUMNS = [
  { key: 'method', label: 'Payment Method', getValue: (r) => r.method },
  { key: 'tuition', label: 'Tuition', getValue: (r) => Number(r.tuition || 0).toFixed(2) },
  { key: 'pos', label: 'POS', getValue: (r) => Number(r.pos || 0).toFixed(2) },
  { key: 'total', label: 'Total', getValue: (r) => Number(r.total || 0).toFixed(2) },
  { key: 'count', label: 'Transactions', getValue: (r) => r.count },
]

export const PURPOSE_COLUMNS = [
  { key: 'purpose', label: 'Fee Purpose', getValue: (r) => r.purpose },
  { key: 'paid', label: 'Collected', getValue: (r) => Number(r.paid || 0).toFixed(2) },
  { key: 'pending', label: 'Pending', getValue: (r) => Number(r.pending || 0).toFixed(2) },
  { key: 'total', label: 'Total', getValue: (r) => Number(r.total || 0).toFixed(2) },
  { key: 'paidCount', label: 'Paid Count', getValue: (r) => r.paidCount },
  { key: 'pendingCount', label: 'Pending Count', getValue: (r) => r.pendingCount },
]

export const MONTHLY_COLUMNS = [
  { key: 'month', label: 'Month', getValue: (r) => formatMonthLabel(r.month) },
  { key: 'tuition', label: 'Tuition Collected', getValue: (r) => Number(r.tuition || 0).toFixed(2) },
  { key: 'pending', label: 'Pending', getValue: (r) => Number(r.pending || 0).toFixed(2) },
  { key: 'pos', label: 'POS Revenue', getValue: (r) => Number(r.pos || 0).toFixed(2) },
  { key: 'total', label: 'Total Revenue', getValue: (r) => Number(r.total || 0).toFixed(2) },
  { key: 'paymentCount', label: 'Payment Records', getValue: (r) => r.paymentCount },
  { key: 'orderCount', label: 'POS Orders', getValue: (r) => r.orderCount },
]

export const LEDGER_SUMMARY_COLUMNS = [
  { key: 'studentId', label: 'Student ID', getValue: (r) => r.studentId },
  { key: 'studentName', label: 'Student Name', getValue: (r) => r.studentName },
  { key: 'paid', label: 'Paid', getValue: (r) => Number(r.paid || 0).toFixed(2) },
  { key: 'pending', label: 'Pending', getValue: (r) => Number(r.pending || 0).toFixed(2) },
  { key: 'total', label: 'Total', getValue: (r) => Number(r.total || 0).toFixed(2) },
  { key: 'count', label: 'Invoices', getValue: (r) => r.count },
]

export function downloadFinanceReport(reportTitle, columns, rows) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
