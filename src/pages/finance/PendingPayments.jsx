import { useEffect, useMemo, useState } from 'react'
import { get, put } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLES } from '../../lib/roles.js'
import { formatInvNo, sortInvoicesNewestFirst } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import DateField from '../../components/ui/DateField.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import { PAYMENT_PURPOSE_OPTIONS } from '../../lib/paymentPurpose.js'
import {
  PENDING_EXPORT_COLUMNS,
  PENDING_FILTER_INITIAL,
  PENDING_PAYMENTS_REPORT_TITLE,
  filterPendingPayments,
  downloadPendingCsv,
} from '../../lib/exports/pendingPaymentsExport.js'

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

export default function PendingPayments() {
  const { role } = useAuth()
  const canEdit = role === ROLES.ADMIN || role === ROLES.FINANCE

  const [payments, setPayments] = useState([])
  const [filters, setFilters] = useState(PENDING_FILTER_INITIAL)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setPayments(await get('/api/payments'))
      setMessage('')
      setError(false)
    } catch (e) {
      setMessage(e.message)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => sortInvoicesNewestFirst(filterPendingPayments(payments, filters)),
    [payments, filters]
  )

  const totalPending = useMemo(
    () => filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filtered]
  )

  const purposes = useMemo(() => {
    const set = new Set(payments.map((p) => p.purpose).filter(Boolean))
    PAYMENT_PURPOSE_OPTIONS.forEach((o) => { if (o.value) set.add(o.value) })
    return [...set].sort()
  }, [payments])

  const methods = useMemo(() => {
    const set = new Set(payments.map((p) => p.method).filter(Boolean))
    return [...set].sort()
  }, [payments])

  const markPaid = async (row) => {
    if (!canEdit || savingId) return
    setSavingId(row.id)
    try {
      await put(`/api/payments/${row.id}`, { ...row, status: 'Paid' })
      setMessage(`Marked ${formatInvNo(row.id)} as Paid.`)
      setError(false)
      await load()
    } catch (e) {
      setMessage(e.message)
      setError(true)
    } finally {
      setSavingId('')
    }
  }

  const columns = [
    { key: 'id', label: 'INV No', className: 'font-mono font-semibold', render: (r) => formatInvNo(r.id) },
    { key: 'studentId', label: 'Student ID', render: (r) => r.studentId || '—' },
    { key: 'studentName', label: 'Student' },
    { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
    { key: 'purpose', label: 'Purpose', render: (r) => r.purpose || '—' },
    { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
    { key: 'method', label: 'Method' },
    {
      key: 'status',
      label: 'Status',
      render: () => <Badge variant="warning">Pending</Badge>,
    },
    ...(canEdit
      ? [{
          key: 'actions',
          label: '',
          className: 'text-right',
          render: (row) => (
            <Button
              size="sm"
              variant="secondary"
              disabled={savingId === row.id}
              onClick={() => markPaid(row)}
            >
              {savingId === row.id ? 'Saving…' : 'Mark Paid'}
            </Button>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Payments"
        subtitle="Outstanding invoices waiting to be collected"
      />

      <FormAlert message={message} error={error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Pending Invoices" value={loading ? '…' : filtered.length} accent="amber" />
        <StatCard label="Amount Due" value={loading ? '…' : money(totalPending)} accent="rose" />
      </div>

      <div className="panel p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Method</label>
            <select className="input" value={filters.method} onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}>
              <option value="all">All</option>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Purpose</label>
            <select className="input" value={filters.purpose} onChange={(e) => setFilters((f) => ({ ...f, purpose: e.target.value }))}>
              <option value="all">All</option>
              {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <DateField label="From" value={filters.dateFrom} onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))} />
          <DateField label="To" value={filters.dateTo} onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))} />
        </div>
      </div>

      <div>
        <TableExportHeader title="Outstanding Payments" count={filtered.length}>
          <ExportReportButton
            reportTitle={PENDING_PAYMENTS_REPORT_TITLE}
            columnDefs={PENDING_EXPORT_COLUMNS}
            getRows={(exportFilters) => filterPendingPayments(payments, { ...filters, ...exportFilters })}
            onDownload={downloadPendingCsv}
            disabled={loading || filtered.length === 0}
          />
        </TableExportHeader>
        <DataTable columns={columns} rows={filtered} emptyMessage={loading ? 'Loading…' : 'No pending payments.'} />
      </div>
    </div>
  )
}
