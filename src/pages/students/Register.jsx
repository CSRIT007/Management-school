import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'

const emptyForm = { id: '', name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' }

export default function StudentRegister() {
  const [form, setForm] = useState(emptyForm)
  const [students, setStudents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setStudents(await get('/api/students'))
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  const loadNextId = async () => {
    try {
      const { id } = await get('/api/students/next-id')
      setForm((f) => ({ ...f, id }))
    } catch {
      // ignore — server auto-generates on save
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editingId) loadNextId()
  }, [editingId])

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

  const startCreate = async () => {
    reset()
    await loadNextId()
  }

  const startEdit = (student) => {
    setEditingId(student.id)
    setForm({
      id: student.id,
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      dob: student.dob || '',
      emergency: student.emergency || '',
      program: student.program || '',
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
        email: form.email,
        phone: form.phone,
        address: form.address,
        dob: form.dob,
        emergency: form.emergency,
        program: form.program,
      }
      if (editingId) {
        await put(`/api/students/${editingId}`, payload)
        showMsg('Student updated successfully.')
      } else {
        if (form.id.trim()) payload.id = form.id.trim().toUpperCase()
        await post('/api/students', payload)
        showMsg('Student registered successfully.')
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
    if (!confirm(`Delete student ${id}?`)) return
    try {
      await del(`/api/students/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Student deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    { key: 'id', label: 'Student ID', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'program', label: 'Program' },
    { key: 'dob', label: 'Date of Birth' },
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
        title="Student Register"
        subtitle="Create, view, update, and delete student records"
        actions={!editingId && <Button variant="secondary" onClick={startCreate}>New Student</Button>}
      />

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
          {message}
        </div>
      )}

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Student — ${editingId}` : 'Register New Student'}
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="label">Student ID</label>
            <input
              className="input"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
              placeholder="Auto: STU-0001"
              disabled={!!editingId}
              readOnly={!!editingId}
            />
            {!editingId && (
              <p className="mt-1 text-xs text-slate-400">Leave as suggested or enter a unique ID (e.g. STU-0005)</p>
            )}
          </div>
          <div>
            <label className="label">Full Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" placeholder="+855…" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" placeholder="Street, City" />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input value={form.emergency} onChange={(e) => setForm((f) => ({ ...f, emergency: e.target.value }))} className="input" placeholder="Name & Phone" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Program / Course</label>
            <select value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} className="input">
              <option value="">Choose program</option>
              <option>Computer Science</option>
              <option>Business Administration</option>
              <option>Design</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Student' : 'Register Student'}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Registered Students ({students.length})</h3>
        <DataTable columns={columns} rows={students} emptyMessage="No students registered yet." />
      </div>
    </div>
  )
}
