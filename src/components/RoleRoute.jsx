import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { canAccessRoute, getDefaultRouteForRole } from '../lib/roles.js'

export default function RoleRoute() {
  const { pathname } = useLocation()
  const { isAuthenticated, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (!canAccessRoute(role, pathname)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return <Outlet />
}
