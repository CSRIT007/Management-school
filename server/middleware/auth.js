import { verifyToken } from '../auth.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const payload = verifyToken(token)
  if (!payload?.sub) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action' })
    }
    next()
  }
}
