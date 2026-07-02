import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentBook() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ name: '', title: '', isbn: '', issued: '', due: '', status: 'Issued' })

  const load = async () => {
    const [b, s] = await Promise.all([get('/api/bookIssues'), get('/api/students')])
    setRows(b)
    setStudents(s)
  }
  useEffect(() => { load() }, [])

  const issue = async (e) => {
    e.preventDefault()
    await post('/api/bookIssues', form)
    setForm({ name: '', title: '', isbn: '', issued: '', due: '', status: 'Issued' })
    await load()
  }

  const columns = [
    { key: 'name', label: 'Student Name', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'title', label: 'Book Title' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'issued', label: 'Date Issued' },
    { key: 'due', label: 'Date Due' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Book"
        subtitle="Track book issues, returns, and overdue items"
      />

      <form onSubmit={issue} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Issue Book</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input className="input" placeholder="Book title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <input className="input" placeholder="ISBN" value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} />
          <input type="date" className="input" value={form.issued} onChange={(e) => setForm((f) => ({ ...f, issued: e.target.value }))} required />
          <input type="date" className="input" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} required />
          <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option>Issued</option>
            <option>Overdue</option>
            <option>Returned</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Issue Book</Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No book issues recorded." />
    </div>
  )
}
