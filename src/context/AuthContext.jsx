import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { get, post, getToken, setToken } from '../lib/api.js'

const AUTH_KEY = 'management_auth'
export const LOGOUT_REASON_KEY = 'logout_reason'
const IDLE_TIMEOUT_MS = 5 * 60 * 1000

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

function saveSession(user) {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  else localStorage.removeItem(AUTH_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    ;(async () => {
      const token = getToken()
      if (!token) {
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const { user: me } = await get('/api/auth/me')
        if (active) {
          setUser(me)
          saveSession(me)
        }
      } catch {
        setToken('')
        saveSession(null)
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [])

  const login = async (email, password) => {
    const result = await post('/api/auth/login', { email, password })
    setToken(result.token)
    setUser(result.user)
    saveSession(result.user)
    return result.user
  }

  const logout = useCallback((reason) => {
    if (reason === 'idle') {
      sessionStorage.setItem(LOGOUT_REASON_KEY, 'idle')
    }
    setToken('')
    saveSession(null)
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
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        role: user?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
