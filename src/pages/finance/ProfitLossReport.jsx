import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import {
  buildProfitAndLoss,
  flattenProfitAndLoss,
  formatMoney,
} from '../../lib/financeReports.js'
import {
  PROFIT_LOSS_COLUMNS,
  PROFIT_LOSS_TITLE,
  downloadFinanceReport,
} from '../../lib/exports/financeExtraExport.js'

function StatementRow({ label, amount, count, strong = false, muted = false, negativeHighlight = false }) {
  const isNeg = Number(amount) < 0
  const amountClass = [
    'tabular-nums whitespace-nowrap',
    strong ? 'font-bold' : 'font-medium',
    negativeHighlight && isNeg ? 'text-rose-600 dark:text-rose-400' : '',
    muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={[
        'flex items-baseline justify-between gap-4 px-4 py-2.5',
        strong ? 'border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40' : '',
      ].join(' ')}
    >
      <div className="min-w-0">
        <span className={strong ? 'font-semibold text-slate-900 dark:text-slate-100' : muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
          {label}
        </span>
        {count != null && count !== '' ? (
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">({count})</span>
        ) : null}
      </div>
      <span className={amountClass}>{formatMoney(amount)}</span>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
      {children}
    </div>
  )
}

export default function ProfitLossReport() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, o, s, e] = await Promise.all([
          get('/api/payments'),
          get('/api/orders'),
          get('/api/finance/salary-payments'),
          get('/api/finance/expenses'),
        ])
        if (active) {
          setPayments(p)
          setOrders(o)
          setSalaryPayments(s)
          setExpenses(e)
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const pl = useMemo(
    () => buildProfitAndLoss(payments, orders, { dateFrom, dateTo, salaryPayments, expenses }),
    [payments, orders, salaryPayments, expenses, dateFrom, dateTo]
  )

  const exportRows = useMemo(() => flattenProfitAndLoss(pl), [pl])
  const hasLines = pl.revenueLines.length > 0 || pl.expenseLines.length > 0
  const memoTotal = moneySum(pl.memo)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.profitLoss.title')}
        subtitle={t('finance.profitLoss.subtitle')}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('finance.totalRevenue')} value={loading ? '…' : formatMoney(pl.totalRevenue)} accent="emerald" />
        <StatCard label={t('finance.totalExpenses')} value={loading ? '…' : formatMoney(pl.totalExpenses)} accent="rose" />
        <StatCard
          label={pl.netProfit >= 0 ? t('finance.netProfit') : t('finance.netLoss')}
          value={loading ? '…' : formatMoney(pl.netProfit)}
          accent="indigo"
        />
        <StatCard
          label={t('finance.margin')}
          value={loading ? '…' : `${pl.marginPct}%`}
          accent="amber"
        />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <DateField label={t('common.from')} value={dateFrom} onChange={setDateFrom} />
        <DateField label={t('common.to')} value={dateTo} onChange={setDateTo} />
      </div>

      <div>
        <TableExportHeader title="Profit & Loss Statement" count={exportRows.length}>
          <ExportReportButton
            label={t('common.downloadCsv')}
            reportTitle={PROFIT_LOSS_TITLE}
            columnDefs={PROFIT_LOSS_COLUMNS}
            getRows={() => exportRows}
            onDownload={({ columns, rows }) =>
              downloadFinanceReport(PROFIT_LOSS_TITLE, columns, rows)
            }
            disabled={loading || !hasLines}
          />
        </TableExportHeader>

        <div className="panel overflow-hidden p-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">{t('common.loading')}</p>
          ) : !hasLines ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            <>
              <SectionTitle>{t('finance.totalRevenue')}</SectionTitle>
              {pl.revenueLines.map((line) => (
                <StatementRow key={`rev-${line.label}`} label={line.label} amount={line.amount} count={line.count} />
              ))}
              <StatementRow label={t('finance.totalRevenue')} amount={pl.totalRevenue} strong />

              <SectionTitle>{t('finance.totalExpenses')}</SectionTitle>
              {pl.expenseLines.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No paid expenses in this period.</p>
              ) : (
                pl.expenseLines.map((line) => (
                  <StatementRow key={`exp-${line.label}`} label={line.label} amount={line.amount} count={line.count} />
                ))
              )}
              <StatementRow label={t('finance.totalExpenses')} amount={pl.totalExpenses} strong />

              <SectionTitle>{t('finance.profitLoss.title')}</SectionTitle>
              <StatementRow
                label={pl.netProfit >= 0 ? t('finance.netProfit') : t('finance.netLoss')}
                amount={pl.netProfit}
                strong
                negativeHighlight
              />

              {memoTotal > 0 ? (
                <>
                  <SectionTitle>Memo (not included in profit)</SectionTitle>
                  <StatementRow label="Pending Tuition" amount={pl.memo.pendingTuition} muted />
                  <StatementRow label="Pending Salary" amount={pl.memo.pendingSalary} muted />
                  <StatementRow label="Pending Expenses" amount={pl.memo.pendingExpenses} muted />
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function moneySum(memo) {
  if (!memo) return 0
  return (Number(memo.pendingTuition) || 0)
    + (Number(memo.pendingSalary) || 0)
    + (Number(memo.pendingExpenses) || 0)
}
