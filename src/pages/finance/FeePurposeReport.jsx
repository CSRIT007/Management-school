import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import { buildPurposeBreakdown, formatMoney } from '../../lib/financeReports.js'
import {
  PURPOSE_COLUMNS,
  PURPOSE_REPORT_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

export default function FeePurposeReport() {
  const [payments, setPayments] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await get('/api/payments')
        if (active) setPayments(rows)
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const rows = useMemo(
    () => buildPurposeBreakdown(payments, { dateFrom, dateTo, status }),
    [payments, dateFrom, dateTo, status]
  )

  const collected = useMemo(() => rows.reduce((s, r) => s + r.paid, 0), [rows])
  const pending = useMemo(() => rows.reduce((s, r) => s + r.pending, 0), [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Purpose Report"
        subtitle="Tuition, registration, books, exams, and other fee categories"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Purposes" value={loading ? '…' : rows.length} accent="indigo" />
        <StatCard label="Collected" value={loading ? '…' : formatMoney(collected)} accent="emerald" />
        <StatCard label="Pending" value={loading ? '…' : formatMoney(pending)} accent="amber" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="By Fee Purpose" count={rows.length}>
          <ExportReportButton
            reportTitle={PURPOSE_REPORT_TITLE}
            columnDefs={PURPOSE_COLUMNS}
            getRows={() => rows}
            onDownload={({ columns, rows: exportRows }) =>
              downloadFinanceReport(PURPOSE_REPORT_TITLE, columns, exportRows)
            }
            disabled={loading || rows.length === 0}
          />
        </TableExportHeader>
        <DataTable
          columns={[
            { key: 'purpose', label: 'Purpose', className: 'font-semibold' },
            { key: 'paid', label: 'Collected', render: (r) => formatMoney(r.paid) },
            { key: 'pending', label: 'Pending', render: (r) => formatMoney(r.pending) },
            { key: 'total', label: 'Total', render: (r) => formatMoney(r.total) },
            { key: 'paidCount', label: 'Paid #' },
            { key: 'pendingCount', label: 'Pending #' },
          ]}
          rows={rows}
          emptyMessage={loading ? 'Loading…' : 'No fee records in this period.'}
        />
      </div>
    </div>
  )
}
