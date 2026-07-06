import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { id: '', name: '', instructor: '', schedule: '', capacity: '0/20' }

export default function ClassManagement() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [showRoster, setShowRoster] = useState(false)
  const [rosterClass, setRosterClass] = useState(null)

  const load = async () => {
    try {
      setRows(await get('/api/classes'))
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  const loadNextId = async () => {
    try {
      const { id } = await get('/api/classes/next-id')
      setForm((f) => ({ ...f, id }))
    } catch {
      // server auto-generates on save
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

  const reset = async () => {
    setForm(emptyForm)
    setEditingId(null)
    setMessage('')
    setError(false)
    await loadNextId()
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      id: row.id,
      name: row.name || '',
      instructor: row.instructor || '',
      schedule: row.schedule || '',
      capacity: row.capacity || '0/20',
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
        instructor: form.instructor,
        schedule: form.schedule,
        capacity: form.capacity,
      }
      if (editingId) {
        await put(`/api/classes/${editingId}`, payload)
        showMsg('Class updated successfully.')
      } else {
        await post('/api/classes', payload)
        showMsg('Class created successfully.')
      }
      await reset()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm(`Delete class ${id}?`)) return
    try {
      await del(`/api/classes/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Class deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const openRoster = (row) => {
    setRosterClass(row)
    setShowRoster(true)
  }

  const columns = [
    { key: 'id', label: 'Class ID', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Class Name' },
    { key: 'instructor', label: 'Instructor' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => openRoster(row)}>Roster</Button>
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        subtitle="Create, view, update, and delete classes"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Class — ${editingId}` : 'Add New Class'}
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="label">Class ID</label>
            <input
              className="input font-mono"
              value={form.id}
              placeholder="Auto-generated"
              disabled
              readOnly
            />
          </div>
          <div>
            <label className="label">Class Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Instructor</label>
            <input className="input" value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} />
          </div>
          <div>
            <label className="label">Schedule</label>
            <input className="input" value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="Mon/Wed 9-10" />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input className="input" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="0/20" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Class' : 'Save Class'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No classes yet. Add your first class." />

      {showRoster && rosterClass && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 dark:bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowRoster(false)}>
          <div className="panel w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Roster — {rosterClass.name}</h3>
              <Button size="sm" variant="secondary" onClick={() => setShowRoster(false)}>Close</Button>
            </div>
            <ul className="space-y-2">
              {['Jane Doe', 'John Smith', 'Chan Dara'].map((name) => (
                <li key={name} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
