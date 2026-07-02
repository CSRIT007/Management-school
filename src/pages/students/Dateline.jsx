import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentDateline() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', task: '', due: '', status: 'Pending' })

  const load = async () => setRows(await get('/api/deadlines'))
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    await post('/api/deadlines', form)
    setForm({ name: '', task: '', due: '', status: 'Pending' })
    await load()
  }

  const columns = [
    { key: 'name', label: 'Student Name', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'task', label: 'Task / Deadline' },
    { key: 'due', label: 'Due Date' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Dateline"
        subtitle="Track student tasks, assignments, and deadlines"
      />

      <form onSubmit={add} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Add Deadline</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input className="input" placeholder="Student name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <input className="input" placeholder="Task / assignment" value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} required />
          <input type="date" className="input" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} required />
          <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option>Pending</option>
            <option>Overdue</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Add Deadline</Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No deadlines recorded." />
    </div>
  )
}
