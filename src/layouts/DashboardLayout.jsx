import { Outlet } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useState } from 'react'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <Sidebar collapsed={collapsed} />
      <div
        className={[
          'min-h-screen transition-all duration-300',
          collapsed ? 'pl-[72px]' : 'pl-64',
        ].join(' ')}
      >
        <Header onToggleSidebar={() => setCollapsed((v) => !v)} collapsed={collapsed} />
        <main className="p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
