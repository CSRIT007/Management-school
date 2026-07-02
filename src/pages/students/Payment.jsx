import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentPayment() {
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ studentName: '', amount: '', method: 'Cash', status: 'Paid' })

  const load = async () => {
    const [p, s] = await Promise.all([get('/api/payments'), get('/api/students')])
    setPayments(p)
    setStudents(s)
  }
  useEffect(() => { load() }, [])

  const record = async (e) => {
    e.preventDefault()
    await post('/api/payments', {
      id: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
      studentName: form.studentName,
      date: new Date().toISOString().slice(0, 10),
      amount: Number(form.amount) || 0,
      method: form.method,
      status: form.status,
    })
    setForm({ studentName: '', amount: '', method: 'Cash', status: 'Paid' })
    await load()
  }

  const columns = [
    { key: 'id', label: 'Invoice #', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => `$${Number(r.amount || 0).toFixed(2)}` },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Payment"
        subtitle="Manage invoices, payments, and billing records"
      />

      <form onSubmit={record} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Record Payment</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select className="input" value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            <option value="Walk-in">Walk-in</option>
          </select>
          <input type="number" step="0.01" className="input" placeholder="Amount" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
            <option>Cash</option>
            <option>Card</option>
            <option>QR</option>
          </select>
          <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option>Paid</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Save Payment</Button>
        </div>
      </form>

      <DataTable columns={columns} rows={payments} emptyMessage="No payment records found." />
    </div>
  )
}
