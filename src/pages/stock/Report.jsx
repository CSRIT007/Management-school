import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { formatInvNo } from '../../lib/invoiceId.js'
import { formatDisplayDate, todayIso } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import {
  STOCK_REPORT_SECTIONS,
  STOCK_FILTER_INITIAL,
  STOCK_REPORT_TITLE,
  countStockExportRows,
  downloadStockReportCsv,
} from '../../lib/exports/stockReportExport.js'

function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function formatItemsLine(items = []) {
  if (!items.length) return '—'
  return items.map((i) => `${i.name} ×${i.qty}`).join(', ')
}

function todayKey() {
  return todayIso()
}

const paymentVariant = {
  Cash: 'success',
  Card: 'info',
  QR: 'warning',
}

export default function StockReport() {
  const [summary, setSummary] = useState({ totalProducts: 0, lowStockItems: 0, totalSalesToday: 0 })
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [low, setLow] = useState([])
  const [sales, setSales] = useState([])
  const [top, setTop] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [s, productList, orderList, l, so, tp] = await Promise.all([
          get('/api/reports/summary'),
          get('/api/products'),
          get('/api/orders'),
          get('/api/reports/low-stock'),
          get('/api/reports/sales-over-time'),
          get('/api/reports/top-products'),
        ])
        setSummary(s)
        setProducts(productList)
        setOrders(orderList)
        setLow(l)
        setSales(so)
        setTop(tp)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const unitsInStock = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    [products]
  )

  const ordersToday = useMemo(
    () => orders.filter((o) => (o.date || '').startsWith(todayKey())).length,
    [orders]
  )

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 10),
    [orders]
  )

  const salesChart = useMemo(
    () =>
      [...sales]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .slice(-7),
    [sales]
  )

  const stockExportData = useMemo(
    () => ({
      summary,
      orders,
      low,
      sales,
      top,
      products,
      unitsInStock,
      ordersToday,
    }),
    [summary, orders, low, sales, top, products, unitsInStock, ordersToday]
  )

  const lowStockColumns = [
    { key: 'name', label: 'Product', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'category', label: 'Category' },
    { key: 'sku', label: 'SKU', className: 'font-mono text-xs' },
    { key: 'price', label: 'Price', render: (r) => formatMoney(r.price) },
    {
      key: 'stock',
      label: 'Stock',
      render: (r) => (
        <Badge variant={Number(r.stock) === 0 ? 'danger' : 'warning'}>{r.stock}</Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Report"
        subtitle="POS sales, inventory levels, and low-stock alerts"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          Could not load report data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={loading ? '…' : String(summary.totalProducts)}
          accent="indigo"
          icon={<BoxIcon />}
        />
        <StatCard
          label="Units in Stock"
          value={loading ? '…' : unitsInStock.toLocaleString()}
          accent="rose"
          icon={<StackIcon />}
        />
        <StatCard
          label="Sales Today"
          value={loading ? '…' : formatMoney(summary.totalSalesToday)}
          accent="emerald"
          icon={<TrendIcon />}
        />
        <StatCard
          label="Orders Today"
          value={loading ? '…' : String(ordersToday)}
          accent="amber"
          icon={<ReceiptIcon />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesChart data={salesChart} loading={loading} />
        <TopProductsCard data={top} loading={loading} />
      </div>

      <TableExportHeader
        title={STOCK_REPORT_TITLE}
        subtitle="Download POS sales, inventory, and summary data below."
      >
        <ExportReportButton
          label="Download CSV"
          reportTitle={STOCK_REPORT_TITLE}
          modalTitle="Export Stock Report"
          description="Choose report sections and filters, then download as one CSV file."
          columnDefs={STOCK_REPORT_SECTIONS}
          columnsLabel="Sections to include"
          filters={{
            initialState: STOCK_FILTER_INITIAL,
            render: (state, setState) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">POS sales — date from</label>
                  <input
                    type="date"
                    className="input"
                    value={state.dateFrom}
                    onChange={(e) => setState((s) => ({ ...s, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">POS sales — date to</label>
                  <input
                    type="date"
                    className="input"
                    value={state.dateTo}
                    onChange={(e) => setState((s) => ({ ...s, dateTo: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">POS sales — payment method</label>
                  <select
                    className="input"
                    value={state.paymentMethod}
                    onChange={(e) => setState((s) => ({ ...s, paymentMethod: e.target.value }))}
                  >
                    <option value="all">All methods</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>QR</option>
                  </select>
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                  Date and payment filters apply to the <strong>POS sales</strong> section only.
                </p>
              </div>
            ),
          }}
          getPreviewCount={(selectedKeys, filterState) =>
            countStockExportRows(selectedKeys, filterState, stockExportData)
          }
          onDownload={({ selectedKeys, filterState, reportTitle }) =>
            downloadStockReportCsv({
              selectedKeys,
              filters: filterState,
              reportTitle,
              ...stockExportData,
            })
          }
          disabled={loading}
          size="sm"
        />
      </TableExportHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Recent POS Sales</h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Latest checkout records from Point of Sale
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              {recentOrders.length} shown
            </span>
          </div>
          <RecentSalesList orders={recentOrders} loading={loading} />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Low Stock Alert</h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Products with 3 units or fewer remaining
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              {low.length} items
            </span>
          </div>
          <DataTable
            columns={lowStockColumns}
            rows={low}
            emptyMessage="All products are well stocked."
          />
        </section>
      </div>
    </div>
  )
}

function RecentSalesList({ orders, loading }) {
  const emptyMessage = 'No POS sales yet. Complete a sale from Point of Sale.'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">INV No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment</th>
              <th className="min-w-[10rem] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Items</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">{emptyMessage}</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                    {formatInvNo(order.id)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700 dark:text-slate-300">
                    {formatDisplayDate(order.date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                    {order.customer || 'Walk-in'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <Badge variant={paymentVariant[order.paymentMethod] || 'neutral'}>
                      {order.paymentMethod || 'Cash'}
                    </Badge>
                  </td>
                  <td
                    className="max-w-[14rem] truncate whitespace-nowrap px-4 py-3.5 text-slate-600 dark:text-slate-400"
                    title={formatItemsLine(order.items)}
                  >
                    {formatItemsLine(order.items)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatMoney(order.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SalesChart({ data, loading }) {
  const maxVal = Math.max(...data.map((d) => d.total || 0), 1)

  return (
    <div className="panel p-6">
      <div className="mb-5">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Sales Over Time</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Daily revenue from POS orders (last 7 days)</p>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">No sales recorded yet</div>
      ) : (
        <div className="flex h-52 items-end gap-2">
          {data.map((d) => {
            const val = Number(d.total) || 0
            const label = formatDisplayDate(d.date).slice(0, 5)
            const height = `${Math.max((val / maxVal) * 100, 6)}%`
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-slate-500">{formatMoney(val)}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height }}
                    title={`${d.date}: ${formatMoney(val)}`}
                  />
                </div>
                <span className="truncate text-[10px] text-slate-400">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopProductsCard({ data, loading }) {
  const maxQty = Math.max(...data.map((d) => d.qty || 0), 1)

  return (
    <div className="panel p-6">
      <div className="mb-5">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Top Selling Products</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Most sold items from POS checkout</p>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">No product sales yet</div>
      ) : (
        <div className="space-y-4">
          {data.slice(0, 8).map((d, i) => (
            <div key={d.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                  <span className="mr-2 text-xs text-slate-400">#{i + 1}</span>
                  {d.name}
                </span>
                <span className="shrink-0 text-slate-500">{d.qty} sold</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                  style={{ width: `${Math.max((d.qty / maxQty) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BoxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function StackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v9a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 18V9a2.25 2.25 0 00-2.25-2.25h-10.5A2.25 2.25 0 004.5 6.878z" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  )
}
