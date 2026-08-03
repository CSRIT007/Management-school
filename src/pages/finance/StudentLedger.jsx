import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { formatInvNo } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import { buildStudentLedgers, formatMoney } from '../../lib/financeReports.js'
import {
  LEDGER_SUMMARY_COLUMNS,
  STUDENT_LEDGER_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

function withStudentId(payment, students) {
  const studentId = payment.studentId || students.find((s) => s.name === payment.studentName)?.id || ''
  return { ...payment, studentId }
}

function HistoryModal({ ledger, onClose, t }) {
  if (!ledger) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-history-title"
    >
      <div
        className="panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h3 id="ledger-history-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Payment history
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{ledger.studentName}</span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
              <span className="font-mono">{ledger.studentId}</span>
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t('common.paid')}</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">{formatMoney(ledger.paid)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">{t('common.pending')}</p>
            <p className="mt-0.5 text-sm font-bold text-amber-800 dark:text-amber-300">{formatMoney(ledger.pending)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('common.total')}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(ledger.total)}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <DataTable
            columns={[
              { key: 'id', label: t('table.invNo'), className: 'whitespace-nowrap font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'date', label: t('common.date'), className: 'whitespace-nowrap', render: (r) => formatDisplayDate(r.date) },
              { key: 'purpose', label: t('common.purpose'), render: (r) => r.purpose || '—' },
              { key: 'amount', label: t('common.amount'), className: 'whitespace-nowrap', render: (r) => formatMoney(r.amount) },
              { key: 'method', label: t('common.method'), className: 'whitespace-nowrap' },
              {
                key: 'status',
                label: t('common.status'),
                className: 'whitespace-nowrap',
                render: (r) => (
                  <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>
                ),
              },
            ]}
            rows={ledger.payments}
            emptyMessage="No invoices for this student."
          />
        </div>
      </div>
    </div>
  )
}

export default function StudentLedger() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [historyLedger, setHistoryLedger] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, s] = await Promise.all([get('/api/payments'), get('/api/students')])
        if (active) {
          setStudents(s)
          setPayments(p.map((row) => withStudentId(row, s)))
        }
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!historyLedger) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setHistoryLedger(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyLedger])

  const ledgers = useMemo(
    () => buildStudentLedgers(payments, students, { dateFrom, dateTo, studentId }),
    [payments, students, dateFrom, dateTo, studentId]
  )

  const unpaidStudents = useMemo(
    () => ledgers.filter((l) => l.pending > 0).length,
    [ledgers]
  )

  const totalPending = useMemo(
    () => ledgers.reduce((sum, l) => sum + (Number(l.pending) || 0), 0),
    [ledgers]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.ledger.title')}
        subtitle={t('finance.ledger.subtitle')}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={loading ? '…' : ledgers.length} accent="indigo" />
        <StatCard label="With Pending" value={loading ? '…' : unpaidStudents} accent="amber" />
        <StatCard
          label="Total Pending"
          value={loading ? '…' : formatMoney(totalPending)}
          accent="rose"
        />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-3">
        <div>
          <label className="label">Student</label>
          <select
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="all">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{`${s.id} — ${s.name}`}</option>
            ))}
          </select>
        </div>
        <DateField label={t('common.from')} value={dateFrom} onChange={setDateFrom} />
        <DateField label={t('common.to')} value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Student Balances" count={ledgers.length}>
          <ExportReportButton
            label={t('common.downloadCsv')}
            reportTitle={STUDENT_LEDGER_TITLE}
            columnDefs={LEDGER_SUMMARY_COLUMNS}
            getRows={() => ledgers}
            onDownload={({ columns, rows }) =>
              downloadFinanceReport(STUDENT_LEDGER_TITLE, columns, rows)
            }
            disabled={loading || ledgers.length === 0}
          />
        </TableExportHeader>
        <DataTable
          columns={[
            { key: 'studentId', label: t('table.studentId'), className: 'whitespace-nowrap font-mono' },
            { key: 'studentName', label: t('common.name'), className: 'whitespace-nowrap font-semibold' },
            { key: 'paid', label: t('common.paid'), className: 'whitespace-nowrap', render: (r) => formatMoney(r.paid) },
            { key: 'pending', label: t('common.pending'), className: 'whitespace-nowrap', render: (r) => formatMoney(r.pending) },
            { key: 'total', label: t('common.total'), className: 'whitespace-nowrap', render: (r) => formatMoney(r.total) },
            { key: 'count', label: t('table.invoices'), className: 'whitespace-nowrap' },
            {
              key: 'actions',
              label: '',
              className: 'whitespace-nowrap text-right',
              render: (row) => (
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setHistoryLedger(row)}
                >
                  View history
                </button>
              ),
            },
          ]}
          rows={ledgers}
          emptyMessage={loading ? t('common.loading') : t('common.noData')}
        />
      </div>

      <HistoryModal ledger={historyLedger} onClose={() => setHistoryLedger(null)} t={t} />
    </div>
  )
}
