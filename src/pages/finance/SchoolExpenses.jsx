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
  EXPENSE_CATEGORIES,
  EXPENSE_EXPORT_COLUMNS,
  EXPENSE_FILTER_INITIAL,
  EXPENSE_REPORT_TITLE,
  downloadExpenseCsv,
  filterSchoolExpenses,
} from '../../lib/exports/expenseExport.js'

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function currentPeriod() {
  return todayIso().slice(0, 7)
}

const emptyExpense = {
  category: 'Rental Fee',
  title: '',
  period: currentPeriod(),
  date: todayIso(),
  amount: '',
  method: 'Cash',
  status: 'Paid',
  vendor: '',
  note: '',
}

export default function SchoolExpenses() {
  const { role } = useAuth()
  const canEdit = canEditPayments(role)

  const [expenses, setExpenses] = useState([])
  const [filters, setFilters] = useState(EXPENSE_FILTER_INITIAL)
  const [form, setForm] = useState(emptyExpense)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [msgError, setMsgError] = useState(false)

  const load = async () => {
    try {
      setExpenses(await get('/api/finance/expenses'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => filterSchoolExpenses(expenses, filters),
    [expenses, filters]
  )

  const paidTotal = useMemo(
    () => filtered.filter((r) => r.status === 'Paid').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [filtered]
  )

  const pendingTotal = useMemo(
    () => filtered.filter((r) => r.status === 'Pending').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [filtered]
  )

  const byCategory = useMemo(() => {
    const map = new Map()
    for (const r of filtered.filter((x) => x.status === 'Paid')) {
      map.set(r.category, (map.get(r.category) || 0) + (Number(r.amount) || 0))
    }
    return [...map.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [filtered])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setMsgError(isError)
  }

  const resetForm = () => {
    setForm({ ...emptyExpense, period: currentPeriod(), date: todayIso() })
    setEditingId(null)
  }

  const startEdit = (row) => {
    if (!canEdit) return
    setEditingId(row.id)
    setForm({
      category: row.category || 'Other Expense',
      title: row.title || '',
      period: row.period || currentPeriod(),
      date: row.date || todayIso(),
      amount: row.amount != null ? String(row.amount) : '',
      method: row.method || 'Cash',
      status: row.status || 'Pending',
      vendor: row.vendor || '',
      note: row.note || '',
    })
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (!form.category) {
      showMsg('Category is required.', true)
      return
    }
    if (!form.title.trim()) {
      showMsg('Title is required.', true)
      return
    }
    if (!form.period) {
      showMsg('Period (yyyy-mm) is required.', true)
      return
    }
    if (!form.date) {
      showMsg('Expense date is required.', true)
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
        category: form.category,
        title: form.title.trim(),
        period: form.period,
        date: form.date,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        vendor: form.vendor.trim(),
        note: form.note.trim(),
      }
      if (editingId) {
        await put(`/api/finance/expenses/${editingId}`, payload)
        showMsg('Expense updated.')
      } else {
        await post('/api/finance/expenses', payload)
        showMsg('Expense recorded.')
      }
      resetForm()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'whitespace-nowrap font-mono font-semibold' },
    { key: 'category', label: 'Category', className: 'whitespace-nowrap' },
    { key: 'title', label: 'Title', className: 'font-semibold' },
    { key: 'period', label: 'Period', className: 'whitespace-nowrap font-mono' },
    {
      key: 'date',
      label: 'Date',
      className: 'whitespace-nowrap',
      render: (r) => formatDisplayDate(r.date),
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'whitespace-nowrap',
      render: (r) => money(r.amount),
    },
    { key: 'method', label: 'Method', className: 'whitespace-nowrap' },
    {
      key: 'vendor',
      label: 'Vendor',
      className: 'whitespace-nowrap',
      render: (r) => r.vendor || '—',
    },
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
        title="School Operating Expenses"
        subtitle="Rental, utility, commission, and other school costs outside salary"
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
        <StatCard label="Records" value={loading ? '…' : filtered.length} accent="indigo" />
        <StatCard label="Paid (filtered)" value={loading ? '…' : money(paidTotal)} accent="rose" />
        <StatCard label="Pending (filtered)" value={loading ? '…' : money(pendingTotal)} accent="amber" />
        <StatCard
          label="Top category"
          value={loading ? '…' : (byCategory[0] ? `${byCategory[0].category}` : '—')}
          accent="indigo"
        />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="all">All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
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
        <DateField label="From" value={filters.dateFrom} onChange={(dateFrom) => setFilters((f) => ({ ...f, dateFrom }))} />
        <DateField label="To" value={filters.dateTo} onChange={(dateTo) => setFilters((f) => ({ ...f, dateTo }))} />
      </div>

      {canEdit && (
        <form onSubmit={submit} className="panel p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {editingId ? `Edit expense — ${editingId}` : 'Record expense'}
          </h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Category <span className="text-rose-500">*</span></label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                required
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title <span className="text-rose-500">*</span></label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. July electricity bill"
                required
              />
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
              label="Expense Date *"
              value={form.date}
              onChange={(date) => setForm((f) => ({ ...f, date }))}
              required
            />
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
            <div>
              <label className="label">Vendor</label>
              <input
                className="input"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="Optional vendor / payee"
              />
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
              {saving ? 'Saving…' : editingId ? 'Update expense' : 'Save expense'}
            </Button>
          </div>
        </form>
      )}

      <div>
        <TableExportHeader title="Expense history" count={filtered.length}>
          <ExportReportButton
            reportTitle={EXPENSE_REPORT_TITLE}
            columnDefs={EXPENSE_EXPORT_COLUMNS}
            getRows={() => filtered}
            onDownload={downloadExpenseCsv}
            disabled={loading || filtered.length === 0}
            size="sm"
          />
        </TableExportHeader>
        <DataTable
          columns={columns}
          rows={filtered}
          emptyMessage={loading ? 'Loading…' : 'No school expenses recorded yet.'}
        />
      </div>
    </div>
  )
}
