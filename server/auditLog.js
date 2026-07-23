import { pool } from './db.js'

export async function ensureAuditLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_id TEXT NOT NULL DEFAULT '',
      actor_email TEXT NOT NULL DEFAULT '',
      actor_name TEXT NOT NULL DEFAULT '',
      actor_role TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL DEFAULT '',
      resource_type TEXT NOT NULL DEFAULT '',
      resource_id TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `)
  // Always add missing columns before any index/query that uses them
  await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT ''`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address)`)
}

function safeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {}
  const out = { ...meta }
  delete out.password
  delete out.password_hash
  delete out.passwordHash
  return out
}

/** Best-effort client IP (works behind Cloudflare / nginx when trust proxy is on). */
export function getClientIp(req) {
  if (!req) return ''

  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(',')[0].trim()
  }

  const realIp = req.headers?.['x-real-ip'] || req.headers?.['cf-connecting-ip']
  if (realIp) return String(realIp).trim()

  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || ''
  return String(ip).replace(/^::ffff:/, '').trim()
}

/** Append-only audit entry. Never throws to the caller (logs failure). */
export async function writeAuditLog(req, {
  action,
  resourceType,
  resourceId = '',
  summary = '',
  meta = {},
} = {}) {
  try {
    const actor = req?.user || {}
    const ipAddress = getClientIp(req)
    await pool.query(
      `INSERT INTO audit_logs (
         actor_id, actor_email, actor_name, actor_role,
         action, resource_type, resource_id, summary, meta, ip_address
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
      [
        actor.id || '',
        actor.email || '',
        actor.name || '',
        actor.role || '',
        String(action || ''),
        String(resourceType || ''),
        String(resourceId || ''),
        String(summary || '').slice(0, 1000),
        JSON.stringify(safeMeta(meta)),
        ipAddress.slice(0, 64),
      ]
    )
  } catch (e) {
    console.error('audit log failed:', e.message)
  }
}

export async function listAuditLogs({
  limit = 50,
  offset = 0,
  resourceType = '',
  action = '',
  actorId = '',
  q = '',
  from = '',
  to = '',
} = {}) {
  const where = []
  const params = []
  const add = (sql, value) => {
    params.push(value)
    where.push(sql.replace('?', `$${params.length}`))
  }

  if (resourceType) add('resource_type = ?', resourceType)
  if (action) add('action = ?', action)
  if (actorId) add('actor_id = ?', actorId)
  if (from) add('created_at >= ?::timestamptz', from)
  if (to) add('created_at <= ?::timestamptz', `${to}T23:59:59.999Z`)
  if (q) {
    params.push(`%${q}%`)
    const i = `$${params.length}`
    where.push(`(
      summary ILIKE ${i}
      OR actor_name ILIKE ${i}
      OR actor_email ILIKE ${i}
      OR resource_id ILIKE ${i}
      OR resource_type ILIKE ${i}
      OR ip_address ILIKE ${i}
    )`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200)
  const off = Math.max(Number(offset) || 0, 0)

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_logs ${whereSql}`,
    params
  )
  const listParams = [...params, lim, off]
  const { rows } = await pool.query(
    `SELECT id, created_at, actor_id, actor_email, actor_name, actor_role,
            action, resource_type, resource_id, summary, meta, ip_address
     FROM audit_logs
     ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams
  )

  return {
    total: countRes.rows[0].total,
    limit: lim,
    offset: off,
    rows: rows.map((r) => ({
      id: String(r.id),
      createdAt: r.created_at,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      summary: r.summary,
      meta: r.meta || {},
      ipAddress: r.ip_address || '',
    })),
  }
}
