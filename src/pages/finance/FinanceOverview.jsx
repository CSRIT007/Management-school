import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../../lib/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
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
import { formatMoney } from '../../lib/moneyFormat.js'

function money(n) {
  return formatMoney(n)
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
  totalExpenses: 0,
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
  const { t } = useLanguage()
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
      { key: 'metric', label: t('table.metric') },
      { key: 'value', label: t('table.value') },
    ], [
      { metric: 'Total Revenue', value: money(data.totalRevenue) },
      { metric: 'Total Expense', value: money(data.totalExpenses) },
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

  const reportLinks = useMemo(() => [
    { to: '/finance/tuition', labelKey: 'nav.tuition', descKey: 'finance.tuition.subtitle' },
    { to: '/finance/pos-revenue', labelKey: 'nav.posRevenue', descKey: 'finance.posRevenue.subtitle' },
    { to: '/finance/pending', labelKey: 'nav.pendingPayments', descKey: 'finance.pending.subtitle' },
    { to: '/finance/cash-flow', labelKey: 'nav.cashFlow', descKey: 'finance.cashFlow.subtitle' },
    { to: '/finance/methods', labelKey: 'nav.paymentMethods', descKey: 'finance.methods.subtitle' },
    { to: '/finance/purpose', labelKey: 'nav.feePurpose', descKey: 'finance.purpose.subtitle' },
    { to: '/finance/monthly', labelKey: 'nav.monthlySummary', descKey: 'finance.monthly.subtitle' },
    { to: '/finance/profit-loss', labelKey: 'nav.profitLoss', descKey: 'finance.profitLoss.subtitle' },
    { to: '/finance/student-ledger', labelKey: 'nav.studentLedger', descKey: 'finance.ledger.subtitle' },
    { to: '/finance/salary', labelKey: 'nav.salary', descKey: 'finance.salary.subtitle' },
    { to: '/finance/expenses', labelKey: 'nav.expenses', descKey: 'finance.expenses.subtitle' },
  ], [])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.overview.title')}
        subtitle={t('finance.overview.subtitle')}
      />

      <div className="panel flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField label={t('common.from')} value={dateFrom} onChange={setDateFrom} />
          <DateField label={t('common.to')} value={dateTo} onChange={setDateTo} />
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
            {t('common.reset')}
          </Button>
          <Button type="button" variant="secondary" onClick={exportOverview} disabled={loading}>
            {t('common.downloadCsv')}
          </Button>
          <Button type="button" onClick={() => load()} disabled={loading}>
            {loading ? t('common.loading') : t('common.applyFilters')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('finance.totalRevenue')} value={loading ? '…' : money(data.totalRevenue)} accent="indigo" />
        <StatCard label={t('finance.tuitionCollected')} value={loading ? '…' : money(data.tuitionCollected)} accent="emerald" />
        <StatCard label={t('finance.posRevenueLabel')} value={loading ? '…' : money(data.posRevenue)} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('finance.totalExpenses')}
          value={loading ? '…' : money(data.totalExpenses ?? (Number(data.salaryPaid || 0) + Number(data.expensesPaid || 0)))}
          accent="amber"
        />
        <StatCard label={t('finance.salaryPaid')} value={loading ? '…' : money(data.salaryPaid)} accent="rose" />
        <StatCard label={t('finance.expensesPaid')} value={loading ? '…' : money(data.expensesPaid)} accent="rose" />
        <StatCard label={t('finance.netCash')} value={loading ? '…' : money(data.netCash)} accent="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Tuition</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.tuitionToday)}</p>
        </div>
        <div className="panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · POS</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.posToday)}</p>
        </div>
        <div className="panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Salary</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.salaryToday)}</p>
          <Link to="/finance/salary" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View salary →
          </Link>
        </div>
        <div className="panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today · Expenses</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : money(data.expensesToday)}</p>
          <Link to="/finance/expenses" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View expenses →
          </Link>
        </div>
        <div className="panel p-4 sm:p-5">
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
              { key: 'method', label: t('common.method') },
              { key: 'total', label: t('common.total'), render: (r) => money(r.total) },
            ]}
            rows={methodRows}
            emptyMessage="No revenue in this period."
          />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Tuition by Purpose</h3>
          <DataTable
            columns={[
              { key: 'purpose', label: t('common.purpose') },
              { key: 'total', label: t('common.total'), render: (r) => money(r.total) },
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
              { key: 'id', label: t('table.inv'), className: 'font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'studentName', label: t('table.student') },
              { key: 'date', label: t('common.date'), render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: t('common.amount'), render: (r) => money(r.amount) },
              {
                key: 'status',
                label: t('common.status'),
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
              { key: 'id', label: t('table.inv'), className: 'font-mono', render: (r) => formatInvNo(r.id) },
              { key: 'customer', label: t('table.customer') },
              { key: 'date', label: t('common.date'), render: (r) => formatDisplayDate(r.date) },
              { key: 'total', label: t('common.total'), render: (r) => money(r.total) },
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
              { key: 'id', label: t('table.id'), className: 'font-mono' },
              { key: 'userName', label: t('table.employee') },
              { key: 'date', label: t('common.date'), render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: t('common.amount'), render: (r) => money(r.amount) },
              {
                key: 'status',
                label: t('common.status'),
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
              { key: 'id', label: t('table.id'), className: 'font-mono' },
              { key: 'category', label: t('common.category') },
              { key: 'date', label: t('common.date'), render: (r) => formatDisplayDate(r.date) },
              { key: 'amount', label: t('common.amount'), render: (r) => money(r.amount) },
              {
                key: 'status',
                label: t('common.status'),
                render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : 'warning'}>{r.status}</Badge>,
              },
            ]}
            rows={data.recentExpenses || []}
            emptyMessage="No recent expenses."
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{t('finance.reports')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="panel block p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100">{t(item.labelKey)}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(item.descKey)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
