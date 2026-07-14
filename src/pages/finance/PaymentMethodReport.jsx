import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import { buildMethodBreakdown, formatMoney } from '../../lib/financeReports.js'
import {
  METHOD_COLUMNS,
  METHOD_REPORT_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

export default function PaymentMethodReport() {
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('Paid')
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
    () => buildMethodBreakdown(payments, orders, { dateFrom, dateTo, status }),
    [payments, orders, dateFrom, dateTo, status]
  )

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Methods"
        subtitle="Cash, Card, QR and other methods across tuition and POS"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Methods Used" value={loading ? '…' : rows.length} accent="indigo" />
        <StatCard label="Transactions" value={loading ? '…' : rows.reduce((s, r) => s + r.count, 0)} accent="amber" />
        <StatCard label="Total" value={loading ? '…' : formatMoney(grandTotal)} accent="emerald" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Tuition Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Paid">Paid only</option>
            <option value="all">All statuses</option>
            <option value="Pending">Pending only</option>
          </select>
        </div>
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Breakdown by Method" count={rows.length}>
          <ExportReportButton
            reportTitle={METHOD_REPORT_TITLE}
            columnDefs={METHOD_COLUMNS}
            getRows={() => rows}
            onDownload={({ columns, rows: exportRows }) =>
              downloadFinanceReport(METHOD_REPORT_TITLE, columns, exportRows)
            }
            disabled={loading || rows.length === 0}
          />
        </TableExportHeader>
        <DataTable
          columns={[
            { key: 'method', label: 'Method', className: 'font-semibold' },
            { key: 'tuition', label: 'Tuition', render: (r) => formatMoney(r.tuition) },
            { key: 'pos', label: 'POS', render: (r) => formatMoney(r.pos) },
            { key: 'total', label: 'Total', render: (r) => formatMoney(r.total) },
            { key: 'count', label: 'Txns' },
            {
              key: 'share',
              label: 'Share',
              render: (r) => (grandTotal ? `${((r.total / grandTotal) * 100).toFixed(1)}%` : '—'),
            },
          ]}
          rows={rows}
          emptyMessage={loading ? 'Loading…' : 'No payments in this period.'}
        />
      </div>
    </div>
  )
}
