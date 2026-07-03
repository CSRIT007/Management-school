import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import InvoiceDocument, { printInvoice } from '../../components/InvoiceDocument.jsx'

const emptyForm = { id: '', studentName: '', date: '', amount: '', method: 'Cash', status: 'Paid' }

function nextInvoiceId(payments) {
  const nums = payments
    .map((p) => /^INV-(\d+)$/.exec(p.id))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const next = nums.length ? Math.max(...nums) + 1 : 1001
  return `INV-${next}`
}

export default function StudentPayment() {
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)

  const load = async () => {
    try {
      const [p, s] = await Promise.all([get('/api/payments'), get('/api/students')])
      setPayments(p)
      setStudents(s)
      if (!editingId) {
        setForm((f) => ({
          ...f,
          id: f.id || nextInvoiceId(p),
          date: f.date || new Date().toISOString().slice(0, 10),
        }))
      }
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = () => {
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
      id: nextInvoiceId(payments),
    })
    setEditingId(null)
    setMessage('')
    setError(false)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      id: row.id,
      studentName: row.studentName || '',
      date: row.date || '',
      amount: String(row.amount ?? ''),
      method: row.method || 'Cash',
      status: row.status || 'Paid',
    })
    setMessage('')
    setError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        studentName: form.studentName,
        date: form.date || new Date().toISOString().slice(0, 10),
        amount: Number(form.amount) || 0,
        method: form.method,
        status: form.status,
      }
      if (editingId) {
        await put(`/api/payments/${editingId}`, payload)
        showMsg('Payment updated successfully.')
      } else {
        payload.id = form.id.trim() || nextInvoiceId(payments)
        await post('/api/payments', payload)
        showMsg('Payment recorded successfully.')
      }
      reset()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm(`Delete payment ${id}?`)) return
    try {
      await del(`/api/payments/${id}`)
      if (editingId === id) reset()
      if (viewInvoice?.id === id) setViewInvoice(null)
      await load()
      showMsg('Payment deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const previewInvoice = {
    id: form.id || nextInvoiceId(payments),
    studentName: form.studentName,
    date: form.date,
    amount: form.amount,
    method: form.method,
    status: form.status,
  }

  const columns = [
    { key: 'id', label: 'Invoice #', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => `$${Number(r.amount || 0).toFixed(2)}` },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setViewInvoice(row)}>Invoice</Button>
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Payment"
        subtitle="Create invoices, record payments, and print receipts"
      />

      <FormAlert message={message} error={error} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Form */}
        <form onSubmit={submit} className="panel p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {editingId ? `Edit Payment — ${editingId}` : 'New Invoice'}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Invoice #</label>
              <input
                className="input font-mono"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
                disabled={!!editingId}
                readOnly={!!editingId}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Student</label>
              <select className="input" value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} required>
                <option value="">Select student</option>
                {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
            <div>
              <label className="label">Amount ($)</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                <option>Cash</option>
                <option>Card</option>
                <option>QR</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => printInvoice(previewInvoice)}
              disabled={!form.studentName || !form.amount}
            >
              Print Preview
            </Button>
            <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Payment' : 'Save & Issue Invoice'}
            </Button>
          </div>
        </form>

        {/* Live invoice preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invoice Preview</h3>
            <span className="text-xs text-slate-400">Updates as you type</span>
          </div>
          <InvoiceDocument invoice={previewInvoice} compact />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          Payment History ({payments.length})
        </h3>
        <DataTable columns={columns} rows={payments} emptyMessage="No payment records found." />
      </div>

      {/* Invoice modal */}
      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setViewInvoice(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <InvoiceDocument
              invoice={viewInvoice}
              showActions
              onClose={() => setViewInvoice(null)}
              onPrint={() => printInvoice(viewInvoice)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
