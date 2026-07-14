import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { formatInvNo, sortInvoicesNewestFirst } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import DateField from '../../components/ui/DateField.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import {
  POS_REVENUE_EXPORT_COLUMNS,
  POS_REVENUE_FILTER_INITIAL,
  POS_REVENUE_REPORT_TITLE,
  filterPosOrders,
  downloadPosRevenueCsv,
} from '../../lib/exports/posRevenueExport.js'

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function formatItems(items = []) {
  if (!items.length) return '—'
  return items.map((i) => `${i.name} ×${i.qty}`).join(', ')
}

export default function PosRevenue() {
  const [orders, setOrders] = useState([])
  const [filters, setFilters] = useState(POS_REVENUE_FILTER_INITIAL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await get('/api/orders')
        if (active) setOrders(rows)
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const filtered = useMemo(
    () => sortInvoicesNewestFirst(filterPosOrders(orders, filters)),
    [orders, filters]
  )

  const revenue = useMemo(
    () => filtered.reduce((s, o) => s + (Number(o.total) || 0), 0),
    [filtered]
  )

  const methods = useMemo(() => {
    const set = new Set(orders.map((o) => o.paymentMethod).filter(Boolean))
    return [...set].sort()
  }, [orders])

  const columns = [
    { key: 'id', label: 'INV No', className: 'font-mono font-semibold', render: (r) => formatInvNo(r.id) },
    { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
    { key: 'customer', label: 'Customer' },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'items', label: 'Items', render: (r) => formatItems(r.items) },
    { key: 'total', label: 'Total', render: (r) => money(r.total) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Revenue"
        subtitle="Point-of-sale orders and shop revenue"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Orders" value={loading ? '…' : filtered.length} accent="indigo" />
        <StatCard label="Revenue" value={loading ? '…' : money(revenue)} accent="emerald" />
      </div>

      <div className="panel p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Payment Method</label>
            <select
              className="input"
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
            >
              <option value="all">All</option>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <DateField label="From" value={filters.dateFrom} onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))} />
          <DateField label="To" value={filters.dateTo} onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))} />
        </div>
      </div>

      <div>
        <TableExportHeader title="POS Sales" count={filtered.length}>
          <ExportReportButton
            reportTitle={POS_REVENUE_REPORT_TITLE}
            columnDefs={POS_REVENUE_EXPORT_COLUMNS}
            getRows={(exportFilters) => filterPosOrders(orders, { ...filters, ...exportFilters })}
            onDownload={downloadPosRevenueCsv}
            disabled={loading || orders.length === 0}
          />
        </TableExportHeader>
        <DataTable columns={columns} rows={filtered} emptyMessage={loading ? 'Loading…' : 'No POS sales found.'} />
      </div>
    </div>
  )
}
