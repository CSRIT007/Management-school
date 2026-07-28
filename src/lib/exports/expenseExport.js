import { formatDisplayDate, inDateRange } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const EXPENSE_REPORT_TITLE = 'School Operating Expenses'

export const EXPENSE_CATEGORIES = [
  'Rental Fee',
  'Utility',
  'Commission Expense',
  'Supplies',
  'Maintenance',
  'Transport',
  'Other Expense',
]

export const EXPENSE_EXPORT_COLUMNS = [
  { key: 'id', label: 'Expense ID', getValue: (r) => r.id || '' },
  { key: 'category', label: 'Category', getValue: (r) => r.category || '' },
  { key: 'title', label: 'Title', getValue: (r) => r.title || '' },
  { key: 'period', label: 'Period', getValue: (r) => r.period || '' },
  { key: 'date', label: 'Expense Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'amount', label: 'Amount', getValue: (r) => Number(r.amount || 0).toFixed(2) },
  { key: 'method', label: 'Method', getValue: (r) => r.method || '' },
  { key: 'status', label: 'Status', getValue: (r) => r.status || '' },
  { key: 'vendor', label: 'Vendor', getValue: (r) => r.vendor || '' },
  { key: 'note', label: 'Note', getValue: (r) => r.note || '' },
]

export const EXPENSE_FILTER_INITIAL = {
  category: 'all',
  status: 'all',
  period: '',
  dateFrom: '',
  dateTo: '',
}

export function filterSchoolExpenses(rows, filters) {
  return rows.filter((row) => {
    if (filters.category !== 'all' && row.category !== filters.category) return false
    if (filters.status !== 'all' && row.status !== filters.status) return false
    if (filters.period && row.period !== filters.period) return false
    if (!inDateRange(row.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function downloadExpenseCsv({ columns, rows, reportTitle = EXPENSE_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
