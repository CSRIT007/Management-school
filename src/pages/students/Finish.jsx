import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentFinish() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ name: '', program: '', date: '', grade: '', cert: false })

  const load = async () => {
    const [a, s] = await Promise.all([get('/api/alumni'), get('/api/students')])
    setRows(a)
    setStudents(s)
  }
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    await post('/api/alumni', { ...form, cert: form.cert === true || form.cert === 'true' })
    setForm({ name: '', program: '', date: '', grade: '', cert: false })
    await load()
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
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Finish"
        subtitle="Graduation records, final grades, and certificates"
      />

      <form onSubmit={add} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Add Graduation Record</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input className="input" placeholder="Program completed" value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} required />
          <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          <select className="input" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} required>
            <option value="">Final grade</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
            <option>D</option>
          </select>
          <select className="input" value={form.cert ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, cert: e.target.value === 'true' }))}>
            <option value="false">Certificate pending</option>
            <option value="true">Certificate issued</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Save Record</Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No graduation records yet." />
    </div>
  )
}
