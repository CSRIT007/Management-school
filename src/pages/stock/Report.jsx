import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function StockReport() {
  const [summary, setSummary] = useState({ totalProducts: 0, lowStockItems: 0, totalSalesToday: 0 })
  const [low, setLow] = useState([])
  const [sales, setSales] = useState([])
  const [top, setTop] = useState([])

  useEffect(() => {
    const load = async () => {
      const [s, l, so, tp] = await Promise.all([
        get('/api/reports/summary'),
        get('/api/reports/low-stock'),
        get('/api/reports/sales-over-time'),
        get('/api/reports/top-products'),
      ])
      setSummary(s)
      setLow(l)
      setSales(so)
      setTop(tp)
    }
    load()
  }, [])

  const lowStockColumns = [
    { key: 'name', label: 'Product', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'category', label: 'Category' },
    { key: 'stock', label: 'Stock', render: (r) => <Badge variant="danger">{r.stock}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Report"
        subtitle="Inventory overview, sales analytics, and low stock alerts"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Products"
          value={String(summary.totalProducts)}
          accent="indigo"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
        <StatCard
          label="Low Stock Items"
          value={String(summary.lowStockItems)}
          accent="amber"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
        <StatCard
          label="Sales Today"
          value={`$${Number(summary.totalSalesToday || 0).toFixed(2)}`}
          accent="emerald"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Sales Over Time" data={sales} type="sales" />
        <ChartCard title="Top Selling Products" data={top} type="top" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Low Stock Alert</h3>
          <select className="input w-auto">
            <option>This Week</option>
            <option>This Month</option>
            <option>Custom Range</option>
          </select>
        </div>
        <DataTable columns={lowStockColumns} rows={low} emptyMessage="All products are well stocked." />
      </div>
    </div>
  )
}

function ChartCard({ title, data, type }) {
  const maxVal = Math.max(...data.map((d) => (type === 'sales' ? d.total : d.qty) || 0), 1)

  return (
    <div className="panel p-6">
      <h3 className="mb-5 font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">No data available</div>
      ) : (
        <div className="flex h-48 items-end gap-2">
          {data.slice(0, 8).map((d, i) => {
            const val = type === 'sales' ? d.total : d.qty
            const label = type === 'sales' ? d.date?.slice(5) : d.name?.slice(0, 6)
            const height = `${Math.max((val / maxVal) * 100, 4)}%`
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all hover:from-indigo-700 hover:to-indigo-300"
                    style={{ height }}
                    title={`${label}: ${val}`}
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
