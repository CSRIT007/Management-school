import { Link } from 'react-router-dom'

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Kimheung Management System</h1>
        <p className="text-gray-500">Choose a section to get started.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Student Register" to="/students/register" />
        <Card title="Class Management" to="/students/classes" />
        <Card title="Student & Dateline" to="/students/dateline" />
        <Card title="Student & Payment" to="/students/payment" />
        <Card title="Category Management" to="/stock/category" />
        <Card title="POS" to="/stock/pos" />
      </div>
    </div>
  )
}

function Card({ title, to }) {
  return (
    <Link
      to={to}
      className="group block bg-gray-50 hover:bg-white border border-gray-100 hover:border-[#4361ee]/30 rounded-2xl p-5 shadow-sm hover:shadow transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-gray-900 font-medium">{title}</div>
          <div className="text-xs text-gray-500">Open</div>
        </div>
        <div className="text-[#4361ee] opacity-0 group-hover:opacity-100 transition">
          →
        </div>
      </div>
    </Link>
  )
}

