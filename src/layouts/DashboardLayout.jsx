import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useEffect, useState } from 'react'

export default function DashboardLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer when route changes (mobile).
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close drawer when switching to desktop width.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) setMobileOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Prevent body scroll while mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((v) => !v)
    } else {
      setMobileOpen((v) => !v)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 transition-colors dark:bg-slate-950">
      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={[
          'flex min-h-[100dvh] flex-col transition-[padding] duration-300',
          'pl-0',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64',
        ].join(' ')}
      >
        <Header
          onToggleSidebar={toggleSidebar}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
        />
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
