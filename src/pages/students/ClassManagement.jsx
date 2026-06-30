import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'

export default function ClassManagement() {
  const [rows, setRows] = useState([])
  const [showRoster, setShowRoster] = useState(false)

  const load = async () => setRows(await get('/api/classes'))
  useEffect(() => { load() }, [])

  const add = async () => {
    await post('/api/classes', { name: 'New Class', instructor: 'TBD', schedule: 'TBD', capacity: '0/20' })
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
          <Button size="sm" variant="ghost">Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        subtitle="Create and manage classes, schedules, and rosters"
        actions={<Button onClick={add}>Add New Class</Button>}
      />

      <DataTable columns={columns} rows={rows} emptyMessage="No classes yet. Add your first class." />

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
