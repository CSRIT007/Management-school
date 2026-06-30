import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StudentPayment() {
  const [payments, setPayments] = useState([])
  useEffect(() => { get('/api/payments').then(setPayments) }, [])

  const record = async () => {
    await post('/api/payments', {
      id: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
      studentName: 'Walk-in',
      date: new Date().toISOString().slice(0, 10),
      amount: 10,
      method: 'Cash',
      status: 'Paid',
    })
    setPayments(await get('/api/payments'))
  }

  const columns = [
    { key: 'id', label: 'Invoice #', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toFixed(2)}` },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student & Payment"
        subtitle="Manage invoices, payments, and billing records"
        actions={
          <>
            <Button variant="secondary" onClick={record}>Record Payment</Button>
            <Button variant="secondary">Export CSV</Button>
            <Button variant="secondary">Send Reminder</Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input type="date" className="input w-auto" />
        <select className="input w-auto">
          <option>All Status</option>
          <option>Paid</option>
          <option>Pending</option>
          <option>Failed</option>
        </select>
      </div>

      <DataTable columns={columns} rows={payments} emptyMessage="No payment records found." />
    </div>
  )
}
