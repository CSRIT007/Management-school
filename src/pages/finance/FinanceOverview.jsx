import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../../lib/api.js'
import { formatInvNo } from '../../lib/invoiceId.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DateField from '../../components/ui/DateField.jsx'
import Button from '../../components/ui/Button.jsx'
import { downloadCsv, reportFilename } from '../../lib/exportCsv.js'
import { SCHOOL_NAME } from '../../lib/schoolBrand.js'

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

const emptyOverview = {
  tuitionCollected: 0,
  tuitionPending: 0,
  pendingCount: 0,
  posRevenue: 0,
  totalRevenue: 0,
  salaryPaid: 0,
  salaryPending: 0,
  salaryCount: 0,
  salaryPaidCount: 0,
  expensesPaid: 0,
  expensesPending: 0,
  expensesCount: 0,
  expensesPaidCount: 0,
  netCash: 0,
  tuitionToday: 0,
  posToday: 0,
  salaryToday: 0,
  expensesToday: 0,
  paymentCount: 0,
  orderCount: 0,
  byMethod: [],
  byPurpose: [],
  recentPayments: [],
  recentOrders: [],
  recentSalary: [],
  recentExpenses: [],
}

export default function FinanceOverview() {
  const [data, setData] = useState(emptyOverview)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (from = dateFrom, to = dateTo) => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (from) qs.set('dateFrom', from)
      if (to) qs.set('dateTo', to)
      const query = qs.toString()
      setData(await get(`/api/finance/overview${query ? `?${query}` : ''}`))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const purposeRows = useMemo(() => data.byPurpose || [], [data.byPurpose])
  const methodRows = useMemo(() => data.byMethod || [], [data.byMethod])

  const exportOverview = () => {
    downloadCsv(reportFilename('Financial Overview'), [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ], [
      { metric: 'Total Revenue', value: money(data.totalRevenue) },
      { metric: 'Salary Paid', value: money(data.salaryPaid) },
      { metric: 'Expenses Paid', value: money(data.expensesPaid) },
      { metric: 'Net Cash', value: money(data.netCash) },
      { metric: 'Tuition Collected', value: money(data.tuitionCollected) },
      { metric: 'Tuition Pending', value: money(data.tuitionPending) },
      { metric: 'Pending Count', value: data.pendingCount },
      { metric: 'POS Revenue', value: money(data.posRevenue) },
      { metric: 'Salary Pending', value: money(data.salaryPending) },
      { metric: 'Expenses Pending', value: money(data.expensesPending) },
      { metric: 'Tuition Today', value: money(data.tuitionToday) },
      { metric: 'POS Today', value: money(data.posToday) },
      { metric: 'Salary Today', value: money(data.salaryToday) },
      { metric: 'Expenses Today', value: money(data.expensesToday) },
      { metric: 'Payment Records', value: data.paymentCount },
      { metric: 'POS Orders', value: data.orderCount },
      { metric: 'Salary Payouts', value: data.salaryCount },
      { metric: 'Expense Records', value: data.expensesCount },
      ...methodRows.map((r) => ({ metric: `Method · ${r.method}`, value: money(r.total) })),
      ...purposeRows.map((r) => ({ metric: `Purpose · ${r.purpose}`, value: money(r.total) })),
    ], {
      schoolName: SCHOOL_NAME,
      reportTitle: 'Financial Overview',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Overview"
        subtitle="Tuition, POS, salary, school expenses, and net cash in one place"
      />

      <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField label="From" value={dateFrom} onChange={setDateFrom} />
          <DateField label="To" value={dateTo} onChange={setDateTo} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              load('', '')
            }}
          >
            Clear
          </Button>
          <Button type="button" variant="secondary" onClick={exportOverview} disabled={loading}>
            Download
          </Button>
          <Button type="button" onClick={() => load()} disabled={loading}>
            {loading ? 'Loading…' : 'Apply Filter'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Revenue" value={loading ? '…' : money(data.totalRevenue)} accent="indigo" />
        <StatCard label="Tuition Collected" value={loading ? '…' : money(data.tuitionCollected)} accent="emerald" />
        <StatCard label="POS Revenue" value={loading ? '…' : money(data.posRevenue)} accent="amber" />
        <StatCard label="Salary Paid" value={loading ? '…' : money(data.salaryPaid)} accent="rose" />
        <StatCard label="Expenses Paid" value={loading ? '…' : money(data.expensesPaid)} accent="rose" />
        <StatCard label="Net Cash" value={loading ? '…' : money(data.netCash)} accent="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Tuition</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.tuitionToday)}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · POS</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.posToday)}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Salary</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.salaryToday)}</p>
          <Link to="/finance/salary" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View salary →
          </Link>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Expenses</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.expensesToday)}</p>
          <Link to="/finance/expenses" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View expenses →
          </Link>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pending Invoices</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : data.pendingCount}</p>
          <Link to="/finance/pending" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View pending →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">By Payment Method</h3>
          <DataTable
            columns={[
              { key: 'method', label: 'Method' },
              { key: 'total', label: 'Total', render: (r) => money(r.total) },
            ]}
            rows={methodRows}
            emptyMessage="No revenue in this period."
          />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Tuition by Purpose</h3>
          <DataTable
            columns={[
              { key: 'purpose', label: 'Purpose' },
              { key: 'total', label: 'Total', render: (r) => money(r.total) },
            ]}
            rows={purposeRows}
            emptyMessage="No tuition in this period."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Payments</h3>
            <Link to="/finance/tuition" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">All tuition →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'INV', className: 'font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'studentName', label: 'Student' },
              { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>,
              },
            ]}
            rows={data.recentPayments}
            emptyMessage="No recent payments."
          />
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent POS Sales</h3>
            <Link to="/finance/pos-revenue" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">All POS →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'INV', className: 'font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'customer', label: 'Customer' },
              { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
              { key: 'total', label: 'Total', render: (r) => money(r.total) },
            ]}
            rows={data.recentOrders}
            emptyMessage="No recent POS sales."
          />
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Salary</h3>
            <Link to="/finance/salary" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">All salary →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'ID', className: 'font-mono' },
              { key: 'userName', label: 'Employee' },
              { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>,
              },
            ]}
            rows={data.recentSalary || []}
            emptyMessage="No recent salary payouts."
          />
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Expenses</h3>
            <Link to="/finance/expenses" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">All expenses →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'ID', className: 'font-mono' },
              { key: 'category', label: 'Category' },
              { key: 'date', label: 'Date', render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>,
              },
            ]}
            rows={data.recentExpenses || []}
            emptyMessage="No recent expenses."
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Finance Reports</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/finance/tuition', label: 'Tuition & Fees', desc: 'All student fee invoices' },
            { to: '/finance/pos-revenue', label: 'POS Revenue', desc: 'Shop and counter sales' },
            { to: '/finance/pending', label: 'Pending Payments', desc: 'Outstanding invoices' },
            { to: '/finance/cash-flow', label: 'Daily Cash Flow', desc: 'Inflows, outflows, net by day' },
            { to: '/finance/methods', label: 'Payment Methods', desc: 'Cash, Card, QR totals' },
            { to: '/finance/purpose', label: 'Fee Purpose', desc: 'Tuition vs other fees' },
            { to: '/finance/monthly', label: 'Monthly Summary', desc: 'Revenue, salary, expenses by month' },
            { to: '/finance/student-ledger', label: 'Student Ledger', desc: 'Balance per student' },
            { to: '/finance/salary', label: 'Staff & Teacher Salary', desc: 'Pay roster and salary payouts' },
            { to: '/finance/expenses', label: 'School Expenses', desc: 'Rental, utility, commission, and more' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="panel block p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
