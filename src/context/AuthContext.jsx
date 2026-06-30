import { createContext, useContext, useState } from 'react'

const AUTH_KEY = 'management_auth'

const VALID_EMAIL = 'admin@gmail.com'
const VALID_PASSWORD = '123456'

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

  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

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
