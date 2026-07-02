import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'

export default function ClassManagement() {
  const [rows, setRows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showRoster, setShowRoster] = useState(false)
  const [form, setForm] = useState({ name: '', instructor: '', schedule: '', capacity: '0/20' })

  const load = async () => setRows(await get('/api/classes'))
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e?.preventDefault()
    await post('/api/classes', form)
    setForm({ name: '', instructor: '', schedule: '', capacity: '0/20' })
    setShowForm(false)
    await load()
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
      render: () => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowRoster(true)}>View Roster</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        subtitle="Create and manage classes, schedules, and rosters"
        actions={<Button onClick={() => setShowForm(true)}>Add New Class</Button>}
      />

      <DataTable columns={columns} rows={rows} emptyMessage="No classes yet. Add your first class." />

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <form className="panel w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={add}>
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Add New Class</h3>
            <div className="space-y-4">
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
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Save Class</Button>
            </div>
          </form>
        </div>
      )}

      {showRoster && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 dark:bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowRoster(false)}>
          <div className="panel w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Class Roster</h3>
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
