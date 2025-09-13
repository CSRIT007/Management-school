import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'

function StatusBadge({ status }) {
  const map = {
    Issued: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
    Returned: 'bg-green-50 text-green-700 border-green-200',
  }
  return <span className={`px-2 py-1 text-xs rounded-xl border ${map[status]}`}>{status}</span>
}

export default function StudentBook() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/bookIssues').then(setRows) }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4361ee]">Student & Book</h2>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Issue Book</button>
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Record Return</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Student Name</th>
              <th className="py-2">Book Title</th>
              <th className="py-2">ISBN</th>
              <th className="py-2">Date Issued</th>
              <th className="py-2">Date Due</th>
              <th className="py-2">Return Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2">{r.title}</td>
                <td className="py-2">{r.isbn}</td>
                <td className="py-2">{r.issued}</td>
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
