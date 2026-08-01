import { formatDisplayDate } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'
import { formatMonthLabel } from '../financeReports.js'
import { formatMoneyAmount } from '../moneyFormat.js'

export const CASH_FLOW_TITLE = 'Daily Cash Flow'
export const METHOD_REPORT_TITLE = 'Payment Method Report'
export const PURPOSE_REPORT_TITLE = 'Fee Purpose Report'
export const MONTHLY_SUMMARY_TITLE = 'Monthly Financial Summary'
export const STUDENT_LEDGER_TITLE = 'Student Payment Ledger'
export const PROFIT_LOSS_TITLE = 'Profit and Loss'

export const CASH_FLOW_COLUMNS = [
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'tuition', label: 'Tuition Collected', getValue: (r) => formatMoneyAmount(r.tuition) },
  { key: 'tuitionCount', label: 'Tuition Invoices', getValue: (r) => r.tuitionCount },
  { key: 'pos', label: 'POS Revenue', getValue: (r) => formatMoneyAmount(r.pos) },
  { key: 'posCount', label: 'POS Orders', getValue: (r) => r.posCount },
  { key: 'salary', label: 'Salary Paid', getValue: (r) => formatMoneyAmount(r.salary) },
  { key: 'salaryCount', label: 'Salary Payouts', getValue: (r) => r.salaryCount },
  { key: 'expenses', label: 'Expenses Paid', getValue: (r) => formatMoneyAmount(r.expenses) },
  { key: 'expensesCount', label: 'Expense Records', getValue: (r) => r.expensesCount },
  { key: 'pending', label: 'Pending Tuition', getValue: (r) => formatMoneyAmount(r.pending) },
  { key: 'total', label: 'Total Collected', getValue: (r) => formatMoneyAmount(r.total) },
  { key: 'net', label: 'Net Cash', getValue: (r) => formatMoneyAmount(r.net) },
]

export const METHOD_COLUMNS = [
  { key: 'method', label: 'Payment Method', getValue: (r) => r.method },
  { key: 'tuition', label: 'Tuition', getValue: (r) => formatMoneyAmount(r.tuition) },
  { key: 'pos', label: 'POS', getValue: (r) => formatMoneyAmount(r.pos) },
  { key: 'total', label: 'Total', getValue: (r) => formatMoneyAmount(r.total) },
  { key: 'count', label: 'Transactions', getValue: (r) => r.count },
]

export const PURPOSE_COLUMNS = [
  { key: 'purpose', label: 'Fee Purpose', getValue: (r) => r.purpose },
  { key: 'paid', label: 'Collected', getValue: (r) => formatMoneyAmount(r.paid) },
  { key: 'pending', label: 'Pending', getValue: (r) => formatMoneyAmount(r.pending) },
  { key: 'total', label: 'Total', getValue: (r) => formatMoneyAmount(r.total) },
  { key: 'paidCount', label: 'Paid Count', getValue: (r) => r.paidCount },
  { key: 'pendingCount', label: 'Pending Count', getValue: (r) => r.pendingCount },
]

export const MONTHLY_COLUMNS = [
  { key: 'month', label: 'Month', getValue: (r) => formatMonthLabel(r.month) },
  { key: 'tuition', label: 'Tuition Collected', getValue: (r) => formatMoneyAmount(r.tuition) },
  { key: 'pending', label: 'Pending', getValue: (r) => formatMoneyAmount(r.pending) },
  { key: 'pos', label: 'POS Revenue', getValue: (r) => formatMoneyAmount(r.pos) },
  { key: 'salary', label: 'Salary Paid', getValue: (r) => formatMoneyAmount(r.salary) },
  { key: 'expenses', label: 'Expenses Paid', getValue: (r) => formatMoneyAmount(r.expenses) },
  { key: 'total', label: 'Total Revenue', getValue: (r) => formatMoneyAmount(r.total) },
  { key: 'net', label: 'Net Cash', getValue: (r) => formatMoneyAmount(r.net) },
  { key: 'paymentCount', label: 'Payment Records', getValue: (r) => r.paymentCount },
  { key: 'orderCount', label: 'POS Orders', getValue: (r) => r.orderCount },
  { key: 'salaryCount', label: 'Salary Payouts', getValue: (r) => r.salaryCount },
  { key: 'expensesCount', label: 'Expense Records', getValue: (r) => r.expensesCount },
]

export const LEDGER_SUMMARY_COLUMNS = [
  { key: 'studentId', label: 'Student ID', getValue: (r) => r.studentId },
  { key: 'studentName', label: 'Student Name', getValue: (r) => r.studentName },
  { key: 'paid', label: 'Paid', getValue: (r) => formatMoneyAmount(r.paid) },
  { key: 'pending', label: 'Pending', getValue: (r) => formatMoneyAmount(r.pending) },
  { key: 'total', label: 'Total', getValue: (r) => formatMoneyAmount(r.total) },
  { key: 'count', label: 'Invoices', getValue: (r) => r.count },
]

export const PROFIT_LOSS_COLUMNS = [
  { key: 'section', label: 'Section', getValue: (r) => r.section },
  { key: 'account', label: 'Account', getValue: (r) => r.account },
  { key: 'amount', label: 'Amount', getValue: (r) => formatMoneyAmount(r.amount) },
  { key: 'count', label: 'Count', getValue: (r) => (r.count === '' || r.count == null ? '' : r.count) },
]

export function downloadFinanceReport(reportTitle, columns, rows) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
