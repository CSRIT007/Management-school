import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AUTH_KEY = 'management_auth'
export const LOGOUT_REASON_KEY = 'logout_reason'
const IDLE_TIMEOUT_MS = 5 * 60 * 1000

const VALID_EMAIL = 'admin@gmail.com'
const VALID_PASSWORD = '123456'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())

  const login = (email, password) => {
    const normalized = email.trim().toLowerCase()
    if (normalized === VALID_EMAIL && password === VALID_PASSWORD) {
      const session = { email: VALID_EMAIL, name: 'Admin' }
      localStorage.setItem(AUTH_KEY, JSON.stringify(session))
      setUser(session)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid email or password' }
  }

  const logout = useCallback((reason) => {
    if (reason === 'idle') {
      sessionStorage.setItem(LOGOUT_REASON_KEY, 'idle')
    }
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!user) return undefined

    let timer

    const resetIdleTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => logout('idle'), IDLE_TIMEOUT_MS)
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetIdleTimer, { passive: true })
    })

    resetIdleTimer()

    return () => {
      clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer)
      })
    }
  }, [user, logout])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
