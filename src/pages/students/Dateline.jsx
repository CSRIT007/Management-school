import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentDateline() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/deadlines').then(setRows) }, [])

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
      <DataTable columns={columns} rows={rows} emptyMessage="No deadlines recorded." />
    </div>
  )
}
