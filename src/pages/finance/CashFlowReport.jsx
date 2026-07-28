import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import { buildDailyCashFlow, formatMoney } from '../../lib/financeReports.js'
import {
  CASH_FLOW_COLUMNS,
  CASH_FLOW_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

export default function CashFlowReport() {
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, o, s, e] = await Promise.all([
          get('/api/payments'),
          get('/api/orders'),
          get('/api/finance/salary-payments'),
          get('/api/finance/expenses'),
        ])
        if (active) {
          setPayments(p)
          setOrders(o)
          setSalaryPayments(s)
          setExpenses(e)
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const rows = useMemo(
    () => buildDailyCashFlow(payments, orders, { dateFrom, dateTo, salaryPayments, expenses }),
    [payments, orders, salaryPayments, expenses, dateFrom, dateTo]
  )

  const totals = useMemo(() => ({
    tuition: rows.reduce((s, r) => s + r.tuition, 0),
    pos: rows.reduce((s, r) => s + r.pos, 0),
    salary: rows.reduce((s, r) => s + r.salary, 0),
    expenses: rows.reduce((s, r) => s + r.expenses, 0),
    pending: rows.reduce((s, r) => s + r.pending, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
    net: rows.reduce((s, r) => s + r.net, 0),
  }), [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Cash Flow"
        subtitle="Tuition and POS inflows minus salary and school expenses by day"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Days" value={loading ? '…' : rows.length} accent="indigo" />
        <StatCard label="Tuition Collected" value={loading ? '…' : formatMoney(totals.tuition)} accent="emerald" />
        <StatCard label="POS Revenue" value={loading ? '…' : formatMoney(totals.pos)} accent="amber" />
        <StatCard label="Salary Paid" value={loading ? '…' : formatMoney(totals.salary)} accent="rose" />
        <StatCard label="Expenses Paid" value={loading ? '…' : formatMoney(totals.expenses)} accent="rose" />
        <StatCard label="Net Cash" value={loading ? '…' : formatMoney(totals.net)} accent="indigo" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Daily Breakdown" count={rows.length}>
          <ExportReportButton
            reportTitle={CASH_FLOW_TITLE}
            columnDefs={CASH_FLOW_COLUMNS}
            getRows={() => rows}
            onDownload={({ columns, rows: exportRows }) =>
              downloadFinanceReport(CASH_FLOW_TITLE, columns, exportRows)
            }
            disabled={loading || rows.length === 0}
          />
        </TableExportHeader>
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
            { key: 'tuition', label: 'Tuition', render: (r) => formatMoney(r.tuition) },
            { key: 'pos', label: 'POS', render: (r) => formatMoney(r.pos) },
            { key: 'salary', label: 'Salary', render: (r) => formatMoney(r.salary) },
            { key: 'expenses', label: 'Expenses', render: (r) => formatMoney(r.expenses) },
            { key: 'pending', label: 'Pending', render: (r) => formatMoney(r.pending) },
            { key: 'total', label: 'Collected', render: (r) => formatMoney(r.total) },
            { key: 'net', label: 'Net', className: 'font-semibold', render: (r) => formatMoney(r.net) },
          ]}
          rows={rows}
          emptyMessage={loading ? 'Loading…' : 'No cash flow in this period.'}
        />
      </div>
    </div>
  )
}
