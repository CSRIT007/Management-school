import { useEffect, useMemo, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { canEditPayments } from '../../lib/roles.js'
import { INVOICE_PREFIX, formatInvNo, sortInvoicesNewestFirst } from '../../lib/invoiceId.js'
import { todayIso, formatDisplayDate } from '../../lib/dateFormat.js'
import DateField from '../../components/ui/DateField.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import InvoiceDocument, { printInvoice } from '../../components/InvoiceDocument.jsx'
import PaymentPurposeField from './components/PaymentPurposeField.jsx'
import PaymentNoteField from './components/PaymentNoteField.jsx'
import { PAYMENT_PURPOSE_OPTIONS } from '../../lib/paymentPurpose.js'
import {
  PAYMENT_EXPORT_COLUMNS,
  PAYMENT_FILTER_INITIAL,
  PAYMENT_REPORT_TITLE,
  filterPayments,
  downloadPaymentCsv,
} from '../../lib/exports/paymentExport.js'

const emptyForm = { id: '', studentId: '', studentName: '', date: '', purpose: '', amount: '', method: 'Cash', status: 'Paid', note: '' }
const WALK_IN = '__walkin__'

function withStudentId(payment, students) {
  const studentId = payment.studentId || students.find((s) => s.name === payment.studentName)?.id || ''
  return { ...payment, studentId }
}

async function fetchNextInvoiceId() {
  const { id } = await get('/api/payments/next-inv-id')
  return id
}

export default function StudentPayment() {
  const { user, role } = useAuth()
  const canEdit = canEditPayments(role)
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)

  const sortedPayments = useMemo(
    () => sortInvoicesNewestFirst(payments),
    [payments]
  )

  const load = async () => {
    try {
      const [p, s] = await Promise.all([get('/api/payments'), get('/api/students')])
      setStudents(s)
      setPayments(p.map((payment) => withStudentId(payment, s)))
      if (canEdit && !editingId) {
        const nextId = await fetchNextInvoiceId()
        setForm((f) => ({
          ...f,
          id: f.id || nextId,
          date: f.date || todayIso(),
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

  const reset = async () => {
    try {
      const nextId = await fetchNextInvoiceId()
      setForm({
        ...emptyForm,
        date: todayIso(),
        id: nextId,
      })
    } catch {
      setForm({
        ...emptyForm,
        date: todayIso(),
      })
    }
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
        date: form.date || todayIso(),
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
        payload.id = form.id.trim() || await fetchNextInvoiceId()
        saved = await post('/api/payments', payload)
        showMsg(andPrint ? 'Payment saved and sent to printer.' : 'Payment saved. Print the invoice anytime from Payment History.')
      }
      await reset()
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
      if (editingId === id) await reset()
      if (viewInvoice?.id === id) setViewInvoice(null)
      await load()
      showMsg('Payment deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const purposeFilterOptions = useMemo(() => {
    const fromData = [...new Set(payments.map((p) => p.purpose).filter(Boolean))]
    const defaults = PAYMENT_PURPOSE_OPTIONS.map((o) => o.value).filter(Boolean)
    return [...new Set([...fromData, ...defaults])].sort((a, b) => a.localeCompare(b))
  }, [payments])

  const columns = [
    {
      key: 'invoiceNo',
      label: 'INV No',
      className: 'font-mono font-semibold text-slate-900 dark:text-slate-100',
      render: (r) => formatInvNo(r.id),
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
    { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
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
          {canEdit && (
            <>
              <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Payment"
        subtitle={canEdit ? 'Record payments and print invoices when needed' : 'View payment history and print invoices'}
      />

      <FormAlert message={message} error={error} />

      {canEdit && (
      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Payment — ${editingId}` : 'Record Payment'}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="label">INV No</label>
            <div className="relative">
              <input
                className="input font-mono font-semibold tracking-wide text-indigo-700 dark:text-indigo-300"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
                disabled={!!editingId}
                readOnly={!!editingId}
                placeholder={`${INVOICE_PREFIX}-1001`}
              />
              {!editingId && form.id ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  Next
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Shared number with POS sales ({INVOICE_PREFIX}-xxxx)
            </p>
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
          <DateField
            label="Date"
            value={form.date}
            onChange={(date) => setForm((f) => ({ ...f, date }))}
            required
          />
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
      )}

      <div>
        <TableExportHeader
          title={PAYMENT_REPORT_TITLE}
          count={payments.length}
          subtitle="Newest first (DESC). Click Print on any row to view or print the invoice later."
        >
          <ExportReportButton
            reportTitle={PAYMENT_REPORT_TITLE}
            modalTitle="Export Payment History"
            description="Filter payments and choose which columns to include in the CSV."
            columnDefs={PAYMENT_EXPORT_COLUMNS}
            filters={{
              initialState: PAYMENT_FILTER_INITIAL,
              render: (state, setState) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={state.status}
                      onChange={(e) => setState((s) => ({ ...s, status: e.target.value }))}
                    >
                      <option value="all">All statuses</option>
                      <option>Paid</option>
                      <option>Pending</option>
                      <option>Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Method</label>
                    <select
                      className="input"
                      value={state.method}
                      onChange={(e) => setState((s) => ({ ...s, method: e.target.value }))}
                    >
                      <option value="all">All methods</option>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>QR</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Student</label>
                    <select
                      className="input"
                      value={state.studentId}
                      onChange={(e) => setState((s) => ({ ...s, studentId: e.target.value }))}
                    >
                      <option value="all">All students</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{`${s.id} — ${s.name}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Purpose</label>
                    <select
                      className="input"
                      value={state.purpose}
                      onChange={(e) => setState((s) => ({ ...s, purpose: e.target.value }))}
                    >
                      <option value="all">All purposes</option>
                      {purposeFilterOptions.map((purpose) => (
                        <option key={purpose} value={purpose}>{purpose}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Date from</label>
                    <input
                      type="date"
                      className="input"
                      value={state.dateFrom}
                      onChange={(e) => setState((s) => ({ ...s, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Date to</label>
                    <input
                      type="date"
                      className="input"
                      value={state.dateTo}
                      onChange={(e) => setState((s) => ({ ...s, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
              ),
            }}
            getRows={(filterState) => filterPayments(sortedPayments, filterState)}
            onDownload={downloadPaymentCsv}
            disabled={payments.length === 0}
            size="sm"
          />
        </TableExportHeader>
        <DataTable columns={columns} rows={sortedPayments} emptyMessage="No payment records found." />
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
