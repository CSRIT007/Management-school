import { formatDisplayDate, inDateRange } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const SALARY_REPORT_TITLE = 'Staff & Teacher Salary'

export const SALARY_PAYOUT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Payout ID', getValue: (r) => r.id || '' },
  { key: 'userId', label: 'Employee ID', getValue: (r) => r.userId || '' },
  { key: 'userName', label: 'Name', getValue: (r) => r.userName || '' },
  { key: 'personKind', label: 'Kind', getValue: (r) => r.personKind || '' },
  { key: 'period', label: 'Period', getValue: (r) => r.period || '' },
  { key: 'date', label: 'Payment Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'hours', label: 'Hours', getValue: (r) => Number(r.hours || 0).toFixed(2) },
  { key: 'amount', label: 'Amount', getValue: (r) => Number(r.amount || 0).toFixed(2) },
  { key: 'method', label: 'Method', getValue: (r) => r.method || '' },
  { key: 'status', label: 'Status', getValue: (r) => r.status || '' },
  { key: 'note', label: 'Note', getValue: (r) => r.note || '' },
]

export const SALARY_FILTER_INITIAL = {
  personKind: 'all',
  employmentType: 'all',
  status: 'all',
  period: '',
  dateFrom: '',
  dateTo: '',
}

export function filterSalaryPayouts(rows, filters) {
  return rows.filter((row) => {
    if (filters.personKind !== 'all' && row.personKind !== filters.personKind) return false
    if (filters.status !== 'all' && row.status !== filters.status) return false
    if (filters.period && row.period !== filters.period) return false
    if (!inDateRange(row.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function filterSalaryRoster(rows, filters) {
  return rows.filter((row) => {
    if (filters.personKind !== 'all' && row.personKind !== filters.personKind) return false
    if (filters.employmentType !== 'all' && (row.employmentType || '') !== filters.employmentType) return false
    return true
  })
}

export function downloadSalaryPayoutCsv({ columns, rows, reportTitle = SALARY_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
