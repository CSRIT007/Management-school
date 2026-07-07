import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import InvoiceDocument, { printInvoice } from '../../components/InvoiceDocument.jsx'
import PaymentPurposeField from './components/PaymentPurposeField.jsx'
import PaymentNoteField from './components/PaymentNoteField.jsx'

const emptyForm = { id: '', studentId: '', studentName: '', date: '', purpose: '', amount: '', method: 'Cash', status: 'Paid', note: '' }
const WALK_IN = '__walkin__'

function withStudentId(payment, students) {
  const studentId = payment.studentId || students.find((s) => s.name === payment.studentName)?.id || ''
  return { ...payment, studentId }
}

function nextInvoiceId(payments) {
  const nums = payments
    .map((p) => /^INV-(\d+)$/.exec(p.id))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const next = nums.length ? Math.max(...nums) + 1 : 1001
  return `INV-${next}`
}

export default function StudentPayment() {
  const { user } = useAuth()
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
      setStudents(s)
      setPayments(p.map((payment) => withStudentId(payment, s)))
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

  const pickStudent = (studentId) => {
    if (studentId === WALK_IN) {
      setForm((f) => ({ ...f, studentId: '', studentName: 'Walk-in' }))
      return
    }
    const student = students.find((s) => s.id === studentId)
    setForm((f) => ({
      ...f,
      studentId,
      studentName: student?.name || '',
    }))
  }

  const startEdit = (row) => {
    const enriched = withStudentId(row, students)
    setEditingId(row.id)
    setForm({
      id: row.id,
      studentId: enriched.studentId,
      studentName: enriched.studentName || '',
      date: row.date || '',
      purpose: row.purpose || '',
      amount: String(row.amount ?? ''),
      method: row.method || 'Cash',
      status: row.status || 'Paid',
      note: row.note || '',
    })
    setMessage('')
    setError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const savePayment = async (andPrint = false) => {
    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        studentId: form.studentId,
        studentName: form.studentName,
        date: form.date || new Date().toISOString().slice(0, 10),
        purpose: form.purpose,
        amount: Number(form.amount) || 0,
        method: form.method,
        status: form.status,
        note: form.note.trim(),
        invoicedBy: user?.name || 'Admin',
        invoicedAt: new Date().toISOString(),
      }
      let saved
      if (editingId) {
        saved = await put(`/api/payments/${editingId}`, payload)
        showMsg(andPrint ? 'Payment updated and sent to printer.' : 'Payment updated. Print anytime from Payment History.')
      } else {
        payload.id = form.id.trim() || nextInvoiceId(payments)
        saved = await post('/api/payments', payload)
        showMsg(andPrint ? 'Payment saved and sent to printer.' : 'Payment saved. Print the invoice anytime from Payment History.')
      }
      reset()
      await load()
      if (andPrint && saved) printInvoice(withStudentId(saved, students))
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    savePayment(false)
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

  const columns = [
    {
      key: 'invoiceNo',
      label: 'Invoice #',
      className: 'font-mono font-semibold text-slate-900 dark:text-slate-100',
      render: (r) => r.id || '—',
    },
    {
      key: 'studentId',
      label: 'Student ID',
      className: 'font-mono text-slate-700 dark:text-slate-300',
      render: (r) => withStudentId(r, students).studentId || '—',
    },
    {
      key: 'studentName',
      label: 'Student Name',
      render: (r) => r.studentName || '—',
    },
    { key: 'date', label: 'Date' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'amount', label: 'Amount', render: (r) => `$${Number(r.amount || 0).toFixed(2)}` },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setViewInvoice(withStudentId(row, students))} title="View or print invoice">
            Print
          </Button>
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
        subtitle="Record payments and print invoices when needed"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Payment — ${editingId}` : 'Record Payment'}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
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
            <label className="label">Student</label>
            <select
              className="input"
              value={form.studentName === 'Walk-in' ? WALK_IN : form.studentId}
              onChange={(e) => pickStudent(e.target.value)}
              required
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{`${s.id}-${s.name}`}</option>
              ))}
              <option value={WALK_IN}>Walk-in</option>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          <PaymentPurposeField
            value={form.purpose}
            onChange={(purpose) => setForm((f) => ({ ...f, purpose }))}
          />
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
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Paid</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>
          </div>
          <PaymentNoteField
            value={form.note}
            onChange={(note) => setForm((f) => ({ ...f, note }))}
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" variant="secondary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            disabled={saving || !form.studentName || !form.amount || !form.purpose}
            onClick={() => savePayment(true)}
          >
            {saving ? 'Printing…' : 'Print'}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-100">
          Payment History ({payments.length})
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Click <strong>Print</strong> on any row to view or print the invoice later.
        </p>
        <DataTable columns={columns} rows={payments} emptyMessage="No payment records found." />
      </div>

      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:hidden"
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
              onPrint={() => printInvoice(withStudentId(viewInvoice, students))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
