import { Outlet } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useState } from 'react'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <Header onToggleSidebar={() => setCollapsed(v => !v)} />
      <div className="flex">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

