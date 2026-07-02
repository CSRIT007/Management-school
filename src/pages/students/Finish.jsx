import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { name: '', program: '', date: '', grade: '', cert: false }

export default function StudentFinish() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const [a, s] = await Promise.all([get('/api/alumni'), get('/api/students')])
      setRows(a)
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
      program: row.program || '',
      date: row.date || '',
      grade: row.grade || '',
      cert: !!row.cert,
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
        name: form.name,
        program: form.program,
        date: form.date,
        grade: form.grade,
        cert: form.cert === true || form.cert === 'true',
      }
      if (editingId) {
        await put(`/api/alumni/${editingId}`, payload)
        showMsg('Graduation record updated successfully.')
      } else {
        await post('/api/alumni', payload)
        showMsg('Graduation record saved successfully.')
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
    if (!confirm('Delete this graduation record?')) return
    try {
      await del(`/api/alumni/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Record deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    { key: 'name', label: 'Student Name', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'program', label: 'Program Completed' },
    { key: 'date', label: 'Completion Date' },
    { key: 'grade', label: 'Final Grade' },
    {
      key: 'cert',
      label: 'Certificate',
      render: (r) => <Badge variant={r.cert ? 'success' : 'neutral'}>{r.cert ? 'Issued' : 'Pending'}</Badge>,
    },
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
        title="Student & Finish"
        subtitle="Graduation records, final grades, and certificates"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? 'Edit Graduation Record' : 'Add Graduation Record'}
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
            <label className="label">Program Completed</label>
            <input className="input" placeholder="Program completed" value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Completion Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Final Grade</label>
            <select className="input" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} required>
              <option value="">Final grade</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
            </select>
          </div>
          <div>
            <label className="label">Certificate</label>
            <select className="input" value={form.cert ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, cert: e.target.value === 'true' }))}>
              <option value="false">Certificate pending</option>
              <option value="true">Certificate issued</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Record' : 'Save Record'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No graduation records yet." />
    </div>
  )
}
