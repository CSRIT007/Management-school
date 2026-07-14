import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import { buildMonthlySummary, formatMoney, formatMonthLabel } from '../../lib/financeReports.js'
import {
  MONTHLY_COLUMNS,
  MONTHLY_SUMMARY_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

export default function MonthlySummary() {
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, o] = await Promise.all([get('/api/payments'), get('/api/orders')])
        if (active) {
          setPayments(p)
          setOrders(o)
        }
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const rows = useMemo(
    () => buildMonthlySummary(payments, orders, { dateFrom, dateTo }),
    [payments, orders, dateFrom, dateTo]
  )

  const totals = useMemo(() => ({
    tuition: rows.reduce((s, r) => s + r.tuition, 0),
    pos: rows.reduce((s, r) => s + r.pos, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
  }), [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Summary"
        subtitle="Tuition and POS revenue rolled up by month"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Months" value={loading ? '…' : rows.length} accent="indigo" />
        <StatCard label="Tuition" value={loading ? '…' : formatMoney(totals.tuition)} accent="emerald" />
        <StatCard label="POS" value={loading ? '…' : formatMoney(totals.pos)} accent="amber" />
        <StatCard label="Total Revenue" value={loading ? '…' : formatMoney(totals.total)} accent="rose" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Monthly Totals" count={rows.length}>
          <ExportReportButton
            reportTitle={MONTHLY_SUMMARY_TITLE}
            columnDefs={MONTHLY_COLUMNS}
            getRows={() => rows}
            onDownload={({ columns, rows: exportRows }) =>
              downloadFinanceReport(MONTHLY_SUMMARY_TITLE, columns, exportRows)
            }
            disabled={loading || rows.length === 0}
          />
        </TableExportHeader>
        <DataTable
          columns={[
            { key: 'month', label: 'Month', className: 'font-semibold', render: (r) => formatMonthLabel(r.month) },
            { key: 'tuition', label: 'Tuition', render: (r) => formatMoney(r.tuition) },
            { key: 'pending', label: 'Pending', render: (r) => formatMoney(r.pending) },
            { key: 'pos', label: 'POS', render: (r) => formatMoney(r.pos) },
            { key: 'total', label: 'Total', render: (r) => formatMoney(r.total) },
            { key: 'paymentCount', label: 'Payments #' },
            { key: 'orderCount', label: 'Orders #' },
          ]}
          rows={rows}
          emptyMessage={loading ? 'Loading…' : 'No monthly data in this period.'}
        />
      </div>
    </div>
  )
}
