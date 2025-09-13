import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'

export default function ClassManagement() {
  const [rows, setRows] = useState([])
  const [showRoster, setShowRoster] = useState(false)
  const load = async () => setRows(await get('/api/classes'))
  useEffect(() => { load() }, [])
  const add = async () => { await post('/api/classes', { name: 'New Class', instructor: 'TBD', schedule: 'TBD', capacity: '0/20' }); await load() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4361ee]">Class Management</h2>
        <button onClick={add} className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>
          Add New Class
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Class ID</th>
              <th className="py-2">Class Name</th>
              <th className="py-2">Instructor</th>
              <th className="py-2">Schedule</th>
              <th className="py-2">Current Capacity</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="py-2 font-medium">{c.id}</td>
                <td className="py-2">{c.name}</td>
                <td className="py-2">{c.instructor}</td>
                <td className="py-2">{c.schedule}</td>
                <td className="py-2">{c.capacity}</td>
                <td className="py-2 flex gap-2 justify-end">
                  <button className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50" onClick={() => setShowRoster(true)}>View Roster</button>
                  <button className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50">Edit Class</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRoster && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center p-4" onClick={() => setShowRoster(false)}>
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Class Roster</h3>
              <button className="p-2 rounded-xl border border-gray-200" onClick={() => setShowRoster(false)}>Close</button>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Jane Doe</li>
              <li>• John Smith</li>
              <li>• Chan Dara</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
