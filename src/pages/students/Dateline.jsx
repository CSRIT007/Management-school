import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { name: '', task: '', due: '', status: 'Pending' }

export default function StudentDateline() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const [d, s] = await Promise.all([get('/api/deadlines'), get('/api/students')])
      setRows(d)
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
      task: row.task || '',
      due: row.due || '',
      status: row.status || 'Pending',
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
        await put(`/api/deadlines/${editingId}`, payload)
        showMsg('Deadline updated successfully.')
      } else {
        await post('/api/deadlines', payload)
        showMsg('Deadline added successfully.')
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
    if (!confirm('Delete this deadline?')) return
    try {
      await del(`/api/deadlines/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Deadline deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    { key: 'name', label: 'Student Name', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'task', label: 'Task / Deadline' },
    { key: 'due', label: 'Due Date' },
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
        title="Student & Dateline"
        subtitle="Track student tasks, assignments, and deadlines"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? 'Edit Deadline' : 'Add Deadline'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="label">Student</label>
            <select className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Task / Assignment</label>
            <input className="input" placeholder="Task / assignment" value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Deadline' : 'Add Deadline'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No deadlines recorded." />
    </div>
  )
}
