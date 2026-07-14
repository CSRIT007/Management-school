import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { formatInvNo } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
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

export default function StudentLedger() {
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
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

  const ledgers = useMemo(
    () => buildStudentLedgers(payments, students, { dateFrom, dateTo, studentId }),
    [payments, students, dateFrom, dateTo, studentId]
  )

  const selected = useMemo(() => {
    if (!ledgers.length) return null
    if (selectedKey) {
      const match = ledgers.find((l) => `${l.studentId}|${l.studentName}` === selectedKey)
      if (match) return match
    }
    return ledgers[0]
  }, [ledgers, selectedKey])

  const unpaidStudents = useMemo(
    () => ledgers.filter((l) => l.pending > 0).length,
    [ledgers]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Ledger"
        subtitle="Payment history and balances per student"
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
          label="Selected Balance"
          value={loading || !selected ? '…' : formatMoney(selected.pending)}
          accent="rose"
        />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Student</label>
          <select
            className="input"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value)
              setSelectedKey('')
            }}
          >
            <option value="all">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{`${s.id} — ${s.name}`}</option>
            ))}
          </select>
        </div>
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Student Balances" count={ledgers.length}>
          <ExportReportButton
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
            { key: 'studentId', label: 'Student ID', className: 'font-mono' },
            { key: 'studentName', label: 'Name', className: 'font-semibold' },
            { key: 'paid', label: 'Paid', render: (r) => formatMoney(r.paid) },
            { key: 'pending', label: 'Pending', render: (r) => formatMoney(r.pending) },
            { key: 'total', label: 'Total', render: (r) => formatMoney(r.total) },
            { key: 'count', label: 'Invoices' },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (row) => (
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setSelectedKey(`${row.studentId}|${row.studentName}`)}
                >
                  View history
                </button>
              ),
            },
          ]}
          rows={ledgers}
          emptyMessage={loading ? 'Loading…' : 'No student payments found.'}
        />
      </div>

      {selected && (
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            History — {selected.studentName}
            <span className="ml-2 font-mono text-sm font-normal text-slate-500">{selected.studentId}</span>
          </h3>
          <DataTable
            columns={[
              { key: 'id', label: 'INV No', className: 'font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
              { key: 'purpose', label: 'Purpose', render: (r) => r.purpose || '—' },
              { key: 'amount', label: 'Amount', render: (r) => formatMoney(r.amount) },
              { key: 'method', label: 'Method' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>
                ),
              },
            ]}
            rows={selected.payments}
            emptyMessage="No invoices for this student."
          />
        </div>
      )}
    </div>
  )
}
