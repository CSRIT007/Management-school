import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { formatInvNo, sortInvoicesNewestFirst } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DateField from '../../components/ui/DateField.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { PAYMENT_PURPOSE_OPTIONS } from '../../lib/paymentPurpose.js'
import {
  TUITION_EXPORT_COLUMNS,
  TUITION_FILTER_INITIAL,
  TUITION_REPORT_TITLE,
  filterTuitionPayments,
  downloadTuitionCsv,
} from '../../lib/exports/tuitionExport.js'
import { formatMoney } from '../../lib/moneyFormat.js'

function money(n) {
  return formatMoney(n)
}

export default function TuitionReport() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState([])
  const [filters, setFilters] = useState(TUITION_FILTER_INITIAL)
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

  const filtered = useMemo(
    () => sortInvoicesNewestFirst(filterTuitionPayments(payments, filters)),
    [payments, filters]
  )

  const collected = useMemo(
    () => filtered.filter((p) => p.status === 'Paid').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filtered]
  )
  const pending = useMemo(
    () => filtered.filter((p) => p.status === 'Pending').reduce((s, p) => s + (Number(p.amount) || 0), 0),
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

  const columns = useMemo(() => [
    { key: 'id', label: t('table.invNo'), className: 'font-mono font-semibold', render: (r) => formatInvNo(r.id) },
    { key: 'studentId', label: t('table.studentId'), render: (r) => r.studentId || '—' },
    { key: 'studentName', label: t('table.student') },
    { key: 'date', label: t('common.date'), render: (r) => formatDisplayDate(r.date) },
    { key: 'purpose', label: t('common.purpose'), render: (r) => r.purpose || '—' },
    { key: 'amount', label: t('common.amount'), render: (r) => money(r.amount) },
    { key: 'method', label: t('common.method') },
    {
      key: 'status',
      label: t('common.status'),
      render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>,
    },
  ], [t])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.tuition.title')}
        subtitle={t('finance.tuition.subtitle')}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Filtered Records" value={loading ? '…' : filtered.length} accent="indigo" />
        <StatCard label="Collected" value={loading ? '…' : money(collected)} accent="emerald" />
        <StatCard label={t('common.pending')} value={loading ? '…' : money(pending)} accent="amber" />
      </div>

      <div className="panel p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="label">{t('common.status')}</label>
            <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="all">{t('common.all')}</option>
              <option value="Paid">{t('common.paid')}</option>
              <option value="Pending">{t('common.pending')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('common.method')}</label>
            <select className="input" value={filters.method} onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}>
              <option value="all">{t('common.all')}</option>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('common.purpose')}</label>
            <select className="input" value={filters.purpose} onChange={(e) => setFilters((f) => ({ ...f, purpose: e.target.value }))}>
              <option value="all">{t('common.all')}</option>
              {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <DateField label={t('common.from')} value={filters.dateFrom} onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))} />
          <DateField label={t('common.to')} value={filters.dateTo} onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))} />
        </div>
      </div>

      <div>
        <TableExportHeader title="Tuition Records" count={filtered.length}>
          <ExportReportButton
            label={t('common.downloadCsv')}
            reportTitle={TUITION_REPORT_TITLE}
            columnDefs={TUITION_EXPORT_COLUMNS}
            getRows={(exportFilters) => filterTuitionPayments(payments, { ...filters, ...exportFilters })}
            onDownload={downloadTuitionCsv}
            disabled={loading || payments.length === 0}
          />
        </TableExportHeader>
        <DataTable columns={columns} rows={filtered} emptyMessage={loading ? t('common.loading') : t('common.noData')} />
      </div>
    </div>
  )
}
