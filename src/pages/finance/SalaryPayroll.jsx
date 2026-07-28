import { useEffect, useMemo, useState } from 'react'
import { get, post, put } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { canEditPayments } from '../../lib/roles.js'
import { formatDisplayDate, todayIso } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import {
  SALARY_FILTER_INITIAL,
  SALARY_PAYOUT_EXPORT_COLUMNS,
  SALARY_REPORT_TITLE,
  downloadSalaryPayoutCsv,
  filterSalaryPayouts,
  filterSalaryRoster,
} from '../../lib/exports/salaryExport.js'

const EMPLOYMENT_LABELS = {
  full_time: 'Full time',
  part_time: 'Part time',
}

const KIND_LABELS = {
  teacher: 'Teacher',
  staff: 'Staff',
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function currentPeriod() {
  return todayIso().slice(0, 7)
}

function formatRate(row) {
  if (row.employmentType === 'full_time') {
    const v = Number(row.salary) || 0
    return v > 0 ? `${money(v)} / mo` : '—'
  }
  if (row.employmentType === 'part_time') {
    const v = Number(row.hourlyRate) || 0
    return v > 0 ? `${money(v)} / hr` : '—'
  }
  return '—'
}

const emptyPayout = {
  userId: '',
  period: currentPeriod(),
  date: todayIso(),
  hours: '',
  amount: '',
  method: 'Cash',
  status: 'Paid',
  note: '',
}

export default function SalaryPayroll() {
  const { role } = useAuth()
  const canEdit = canEditPayments(role)

  const [roster, setRoster] = useState([])
  const [payouts, setPayouts] = useState([])
  const [filters, setFilters] = useState(SALARY_FILTER_INITIAL)
  const [form, setForm] = useState(emptyPayout)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [msgError, setMsgError] = useState(false)

  const load = async () => {
    try {
      const [r, p] = await Promise.all([
        get('/api/finance/salary-roster'),
        get('/api/finance/salary-payments'),
      ])
      setRoster(r)
      setPayouts(p)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectedPerson = useMemo(
    () => roster.find((r) => r.id === form.userId) || null,
    [roster, form.userId]
  )

  const filteredRoster = useMemo(
    () => filterSalaryRoster(roster, filters),
    [roster, filters]
  )

  const filteredPayouts = useMemo(
    () => filterSalaryPayouts(payouts, filters),
    [payouts, filters]
  )

  const fullTimeObligation = useMemo(
    () => filteredRoster
      .filter((r) => r.active !== false && r.employmentType === 'full_time')
      .reduce((s, r) => s + (Number(r.salary) || 0), 0),
    [filteredRoster]
  )

  const paidTotal = useMemo(
    () => filteredPayouts.filter((p) => p.status === 'Paid').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filteredPayouts]
  )

  const pendingTotal = useMemo(
    () => filteredPayouts.filter((p) => p.status === 'Pending').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filteredPayouts]
  )

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setMsgError(isError)
  }

  const resetForm = () => {
    setForm({ ...emptyPayout, period: currentPeriod(), date: todayIso() })
    setEditingId(null)
  }

  const onSelectPerson = (userId) => {
    const person = roster.find((r) => r.id === userId)
    setForm((f) => {
      const next = { ...f, userId }
      if (!person) return next
      if (person.employmentType === 'full_time') {
        next.hours = ''
        next.amount = person.salary ? String(person.salary) : ''
      } else if (person.employmentType === 'part_time') {
        const hours = Number(f.hours) || 0
        next.amount = hours > 0
          ? String(Math.round(hours * (Number(person.hourlyRate) || 0) * 100) / 100)
          : ''
      } else {
        next.amount = ''
      }
      return next
    })
  }

  const onHoursChange = (hoursRaw) => {
    setForm((f) => {
      const hours = hoursRaw
      const person = roster.find((r) => r.id === f.userId)
      let amount = f.amount
      if (person?.employmentType === 'part_time') {
        const h = Number(hours) || 0
        amount = h > 0
          ? String(Math.round(h * (Number(person.hourlyRate) || 0) * 100) / 100)
          : ''
      }
      return { ...f, hours, amount }
    })
  }

  const startEdit = (row) => {
    if (!canEdit) return
    setEditingId(row.id)
    setForm({
      userId: row.userId,
      period: row.period || currentPeriod(),
      date: row.date || todayIso(),
      hours: row.hours ? String(row.hours) : '',
      amount: row.amount != null ? String(row.amount) : '',
      method: row.method || 'Cash',
      status: row.status || 'Pending',
      note: row.note || '',
    })
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (!form.userId) {
      showMsg('Select an employee.', true)
      return
    }
    if (!form.period) {
      showMsg('Period (yyyy-mm) is required.', true)
      return
    }
    if (!form.date) {
      showMsg('Payment date is required.', true)
      return
    }
    if (selectedPerson?.employmentType === 'part_time' && !(Number(form.hours) > 0)) {
      showMsg('Hours are required for part-time payouts.', true)
      return
    }
    if (!(Number(form.amount) > 0)) {
      showMsg('Amount must be greater than zero.', true)
      return
    }

    setSaving(true)
    setMessage('')
    setMsgError(false)
    try {
      const payload = {
        userId: form.userId,
        period: form.period,
        date: form.date,
        hours: form.hours === '' ? 0 : Number(form.hours),
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        note: form.note.trim(),
      }
      if (editingId) {
        await put(`/api/finance/salary-payments/${editingId}`, payload)
        showMsg('Salary payout updated.')
      } else {
        await post('/api/finance/salary-payments', payload)
        showMsg('Salary payout recorded.')
      }
      resetForm()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const rosterColumns = [
    { key: 'id', label: 'ID', className: 'whitespace-nowrap font-mono font-semibold' },
    { key: 'name', label: 'Full Name', className: 'whitespace-nowrap font-semibold' },
    {
      key: 'personKind',
      label: 'Kind',
      className: 'whitespace-nowrap',
      render: (r) => KIND_LABELS[r.personKind] || r.personKind,
    },
    {
      key: 'employmentType',
      label: 'Type',
      className: 'whitespace-nowrap',
      render: (r) => EMPLOYMENT_LABELS[r.employmentType] || '—',
    },
    {
      key: 'rate',
      label: 'Rate',
      className: 'whitespace-nowrap',
      render: (r) => formatRate(r),
    },
    {
      key: 'active',
      label: 'Status',
      className: 'whitespace-nowrap',
      render: (r) => (
        <Badge variant={r.active !== false ? 'success' : 'danger'}>
          {r.active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  const payoutColumns = [
    { key: 'id', label: 'ID', className: 'whitespace-nowrap font-mono font-semibold' },
    { key: 'userName', label: 'Name', className: 'whitespace-nowrap font-semibold' },
    {
      key: 'personKind',
      label: 'Kind',
      className: 'whitespace-nowrap',
      render: (r) => KIND_LABELS[r.personKind] || r.personKind,
    },
    { key: 'period', label: 'Period', className: 'whitespace-nowrap font-mono' },
    {
      key: 'date',
      label: 'Date',
      className: 'whitespace-nowrap',
      render: (r) => formatDisplayDate(r.date),
    },
    {
      key: 'hours',
      label: 'Hours',
      className: 'whitespace-nowrap',
      render: (r) => (Number(r.hours) > 0 ? Number(r.hours).toFixed(2) : '—'),
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'whitespace-nowrap',
      render: (r) => money(r.amount),
    },
    { key: 'method', label: 'Method', className: 'whitespace-nowrap' },
    {
      key: 'status',
      label: 'Status',
      className: 'whitespace-nowrap',
      render: (r) => (
        <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>
      ),
    },
    ...(canEdit
      ? [{
          key: 'actions',
          label: '',
          className: 'whitespace-nowrap text-right',
          render: (row) => (
            <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Teacher Salary"
        subtitle="Pay roster from Teacher/Staff Info and record monthly salary payouts"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msgError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="On roster" value={loading ? '…' : filteredRoster.length} accent="indigo" />
        <StatCard label="Full-time monthly" value={loading ? '…' : money(fullTimeObligation)} accent="indigo" />
        <StatCard label="Paid (filtered)" value={loading ? '…' : money(paidTotal)} accent="emerald" />
        <StatCard label="Pending (filtered)" value={loading ? '…' : money(pendingTotal)} accent="amber" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className="label">Kind</label>
          <select
            className="input"
            value={filters.personKind}
            onChange={(e) => setFilters((f) => ({ ...f, personKind: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="label">Employment</label>
          <select
            className="input"
            value={filters.employmentType}
            onChange={(e) => setFilters((f) => ({ ...f, employmentType: e.target.value }))}
          >
            <option value="all">All types</option>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
          </select>
        </div>
        <div>
          <label className="label">Payout status</label>
          <select
            className="input"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="label">Period (yyyy-mm)</label>
          <input
            className="input"
            type="month"
            value={filters.period}
            onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:col-span-3 lg:col-span-1 lg:grid-cols-1">
          <DateField label="From" value={filters.dateFrom} onChange={(dateFrom) => setFilters((f) => ({ ...f, dateFrom }))} />
          <DateField label="To" value={filters.dateTo} onChange={(dateTo) => setFilters((f) => ({ ...f, dateTo }))} />
        </div>
      </div>

      {canEdit && (
        <form onSubmit={submit} className="panel p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {editingId ? `Edit payout — ${editingId}` : 'Record salary payout'}
          </h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Employee <span className="text-rose-500">*</span></label>
              <select
                className="input"
                value={form.userId}
                onChange={(e) => onSelectPerson(e.target.value)}
                disabled={!!editingId}
                required
              >
                <option value="">Select employee</option>
                {roster.filter((r) => r.active !== false).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.name} ({KIND_LABELS[r.personKind] || r.personKind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Period <span className="text-rose-500">*</span></label>
              <input
                className="input"
                type="month"
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                required
              />
            </div>
            <DateField
              label="Payment Date *"
              value={form.date}
              onChange={(date) => setForm((f) => ({ ...f, date }))}
              required
            />
            {selectedPerson?.employmentType === 'part_time' && (
              <div>
                <label className="label">Hours <span className="text-rose-500">*</span></label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.hours}
                  onChange={(e) => onHoursChange(e.target.value)}
                  placeholder="0"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  Rate {money(selectedPerson.hourlyRate)}/hr
                </p>
              </div>
            )}
            <div>
              <label className="label">Amount ($) <span className="text-rose-500">*</span></label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                <option>Cash</option>
                <option>Card</option>
                <option>QR</option>
                <option>Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Note</label>
              <textarea
                className="input min-h-[64px] resize-y"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update payout' : 'Save payout'}
            </Button>
          </div>
        </form>
      )}

      <div>
        <TableExportHeader title="Pay roster" count={filteredRoster.length} />
        <DataTable
          columns={rosterColumns}
          rows={filteredRoster}
          emptyMessage={loading ? 'Loading…' : 'No teachers or staff on the pay roster.'}
        />
      </div>

      <div>
        <TableExportHeader title="Payout history" count={filteredPayouts.length}>
          <ExportReportButton
            reportTitle={SALARY_REPORT_TITLE}
            columnDefs={SALARY_PAYOUT_EXPORT_COLUMNS}
            getRows={() => filteredPayouts}
            onDownload={downloadSalaryPayoutCsv}
            disabled={loading || filteredPayouts.length === 0}
            size="sm"
          />
        </TableExportHeader>
        <DataTable
          columns={payoutColumns}
          rows={filteredPayouts}
          emptyMessage={loading ? 'Loading…' : 'No salary payouts recorded yet.'}
        />
      </div>
    </div>
  )
}
