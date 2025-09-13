import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'

function StatusBadge({ status }) {
  const map = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
    Completed: 'bg-green-50 text-green-700 border-green-200',
  }
  return <span className={`px-2 py-1 text-xs rounded-xl border ${map[status]}`}>{status}</span>
}

export default function StudentDateline() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/deadlines').then(setRows) }, [])
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#4361ee]">Student & Dateline</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Student Name</th>
              <th className="py-2">Task/Dateline</th>
              <th className="py-2">Due Date</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2">{r.task}</td>
                <td className="py-2">{r.due}</td>
                <td className="py-2"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
