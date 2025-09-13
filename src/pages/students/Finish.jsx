import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'

export default function StudentFinish() {
  const [rows, setRows] = useState([])
  useEffect(() => { get('/api/alumni').then(setRows) }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4361ee]">Student & Finish</h2>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Generate Certificate</button>
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Export Alumni List</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Student Name</th>
              <th className="py-2">Program Completed</th>
              <th className="py-2">Completion Date</th>
              <th className="py-2">Final Grade</th>
              <th className="py-2">Certificate Issued</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2">{r.program}</td>
                <td className="py-2">{r.date}</td>
                <td className="py-2">{r.grade}</td>
                <td className="py-2">{r.cert ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
