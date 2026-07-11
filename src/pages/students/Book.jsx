import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import DateField from '../../components/ui/DateField.jsx'

const emptyForm = { name: '', title: '', isbn: '', issued: '', due: '', status: 'Issued' }

export default function StudentBook() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const [b, s] = await Promise.all([get('/api/bookIssues'), get('/api/students')])
      setRows(b)
      setStudents(s)
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
    setForm(emptyForm)
    setEditingId(null)
    setMessage('')
    setError(false)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      title: row.title || '',
      isbn: row.isbn || '',
      issued: row.issued || '',
      due: row.due || '',
      status: row.status || 'Issued',
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
      const payload = { ...form }
      if (editingId) {
        await put(`/api/bookIssues/${editingId}`, payload)
        showMsg('Book issue updated successfully.')
      } else {
        await post('/api/bookIssues', payload)
        showMsg('Book issued successfully.')
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
    if (!confirm('Delete this book issue record?')) return
    try {
      await del(`/api/bookIssues/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Record deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    { key: 'name', label: 'Student Name', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'title', label: 'Book Title' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'issued', label: 'Date Issued', render: (r) => formatDisplayDate(r.issued) },
    { key: 'due', label: 'Date Due', render: (r) => formatDisplayDate(r.due) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Book"
        subtitle="Track book issues, returns, and overdue items"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? 'Edit Book Issue' : 'Issue Book'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Student</label>
            <select className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Book Title</label>
            <input className="input" placeholder="Book title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="label">ISBN</label>
            <input className="input" placeholder="ISBN" value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} />
          </div>
          <DateField label="Date Issued" value={form.issued} onChange={(issued) => setForm((f) => ({ ...f, issued }))} required />
          <DateField label="Date Due" value={form.due} onChange={(due) => setForm((f) => ({ ...f, due }))} required />
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Issued</option>
              <option>Overdue</option>
              <option>Returned</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Record' : 'Issue Book'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No book issues recorded." />
    </div>
  )
}
