import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentBook() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/bookIssues').then(setRows) }, [])

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
        actions={
          <>
            <Button variant="secondary">Issue Book</Button>
            <Button variant="secondary">Record Return</Button>
          </>
        }
      />
      <DataTable columns={columns} rows={rows} emptyMessage="No book issues recorded." />
    </div>
  )
}
