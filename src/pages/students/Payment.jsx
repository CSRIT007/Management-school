import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'

function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-green-50 text-green-700 border-green-200',
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Failed: 'bg-red-50 text-red-700 border-red-200',
  }
  return <span className={`px-2 py-1 text-xs rounded-xl border ${map[status]}`}>{status}</span>
}

export default function StudentPayment() {
  const [payments, setPayments] = useState([])
  useEffect(() => { get('/api/payments').then(setPayments) }, [])
  const record = async () => {
    await post('/api/payments', { id: `INV-${Math.floor(Math.random()*9000)+1000}`, studentName: 'Walk-in', date: new Date().toISOString().slice(0,10), amount: 10, method: 'Cash', status: 'Paid' })
    setPayments(await get('/api/payments'))
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4361ee]">Student & Payment</h2>
        <div className="flex gap-2">
          <button onClick={record} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Record New Payment</button>
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Export to CSV</button>
          <button className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Send Reminder</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="date" className="rounded-xl border border-gray-200 p-2.5" />
        <select className="rounded-xl border border-gray-200 p-2.5 bg-white">
          <option>All Status</option>
          <option>Paid</option>
          <option>Pending</option>
          <option>Failed</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Invoice #</th>
              <th className="py-2">Student Name</th>
              <th className="py-2">Date</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Payment Method</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2 font-medium">{p.id}</td>
                <td className="py-2">{p.studentName}</td>
                <td className="py-2">{p.date}</td>
                <td className="py-2">${p.amount.toFixed(2)}</td>
                <td className="py-2">{p.method}</td>
                <td className="py-2"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
