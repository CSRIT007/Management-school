import { useEffect, useState } from 'react'
import { get } from '../../lib/api.js'

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
      setSummary(s); setLow(l); setSales(so); setTop(tp)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#4361ee]">Stock Report Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total Products" value={String(summary.totalProducts)} />
        <SummaryCard label="Low Stock Items" value={String(summary.lowStockItems)} accent="warning" />
        <SummaryCard label="Total Sales (Today)" value={`$${Number(summary.totalSalesToday||0).toFixed(2)}`} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder title={`Sales Over Time (${sales.length} pts)`} />
        <ChartPlaceholder title={`Top Selling Products (${top.length})`} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Low Stock Alert</div>
          <select className="rounded-xl border border-gray-200 p-2.5 bg-white">
            <option>This Week</option>
            <option>This Month</option>
            <option>Custom Range</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Product</th>
              <th className="py-2">Category</th>
              <th className="py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {low.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2">{r.category}</td>
                <td className="py-2 text-red-600">{r.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  const styles =
    accent === 'success'
      ? 'bg-green-50 border-green-100'
      : accent === 'warning'
      ? 'bg-yellow-50 border-yellow-100'
      : 'bg-gray-50 border-gray-100'
  return (
    <div className={`rounded-2xl p-4 border ${styles}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function ChartPlaceholder({ title }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-64 grid place-items-center text-gray-400 text-sm">
      {title}
    </div>
  )
}
