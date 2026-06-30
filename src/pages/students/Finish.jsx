import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentFinish() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/alumni').then(setRows) }, [])

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
        actions={
          <>
            <Button variant="secondary">Generate Certificate</Button>
            <Button variant="secondary">Export Alumni</Button>
          </>
        }
      />
      <DataTable columns={columns} rows={rows} emptyMessage="No graduation records yet." />
    </div>
  )
}
