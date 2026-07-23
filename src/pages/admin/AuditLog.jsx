import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api.js'
import { ROLE_LABELS } from '../../lib/roles.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DateField from '../../components/ui/DateField.jsx'

const ACTION_OPTIONS = [
  '',
  'login',
  'create',
  'update',
  'delete',
  'checkout',
  'enroll',
  'unenroll',
  'assign_teachers',
  'password_reset',
  'update_password',
]

const RESOURCE_OPTIONS = [
  '',
  'auth',
  'users',
  'teachers',
  'staff',
  'students',
  'classes',
  'payments',
  'products',
  'categories',
  'orders',
  'deadlines',
  'bookIssues',
  'alumni',
  'programs',
]

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    const date = formatDisplayDate(d)
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Phnom_Penh',
    })
    return `${date} ${time}`
  } catch {
    return String(iso)
  }
}

function actionVariant(action) {
  if (action === 'delete' || action === 'unenroll') return 'danger'
  if (action === 'create' || action === 'enroll' || action === 'checkout') return 'success'
  if (action === 'login') return 'info'
  if (action?.includes('password')) return 'warning'
  return 'neutral'
}

export default function AuditLog() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState({
    q: '',
    action: '',
    resourceType: '',
    from: '',
    to: '',
  })

  const load = async (nextFilters = filters, nextOffset = offset, nextLimit = limit) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        limit: String(nextLimit),
        offset: String(nextOffset),
      })
      if (nextFilters.q.trim()) params.set('q', nextFilters.q.trim())
      if (nextFilters.action) params.set('action', nextFilters.action)
      if (nextFilters.resourceType) params.set('resourceType', nextFilters.resourceType)
      if (nextFilters.from) params.set('from', nextFilters.from)
      if (nextFilters.to) params.set('to', nextFilters.to)
      const data = await get(`/api/admin/audit-logs?${params}`)
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [limit, offset])

  const pageLabel = useMemo(() => {
    if (!total) return '0 entries'
    const start = offset + 1
    const end = Math.min(offset + limit, total)
    return `${start}–${end} of ${total}`
  }, [offset, limit, total])

  const columns = [
    {
      key: 'createdAt',
      label: 'When',
      className: 'whitespace-nowrap font-mono text-xs',
      render: (r) => formatWhen(r.createdAt),
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{r.actorName || '—'}</p>
          <p className="truncate text-xs text-slate-500">{r.actorEmail || r.actorId || ''}</p>
        </div>
      ),
    },
    {
      key: 'actorRole',
      label: 'Role',
      render: (r) => ROLE_LABELS[r.actorRole] || r.actorRole || '—',
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => <Badge variant={actionVariant(r.action)}>{r.action || '—'}</Badge>,
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-800 dark:text-slate-200">{r.resourceType || '—'}</p>
          <p className="font-mono text-xs text-slate-500">{r.resourceId || ''}</p>
        </div>
      ),
    },
    {
      key: 'summary',
      label: 'What changed',
      className: 'min-w-[18rem] max-w-2xl',
      render: (r) => {
        const changes = Array.isArray(r.meta?.changes) ? r.meta.changes : []
        return (
          <div className="space-y-1">
            <p className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
              {r.summary || '—'}
            </p>
            {changes.length > 0 ? (
              <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400">
                {changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      },
    },
  ]

  const applyFilters = (e) => {
    e.preventDefault()
    if (offset === 0) load(filters, 0, limit)
    else setOffset(0)
  }

  const resetFilters = () => {
    const empty = { q: '', action: '', resourceType: '', from: '', to: '' }
    setFilters(empty)
    if (offset === 0) load(empty, 0, limit)
    else setOffset(0)
  }

  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Who changed what — login, users, students, classes, payments, and POS"
      />

      <FormAlert message={error} error />

      <form onSubmit={applyFilters} className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="label">Search</label>
          <input
            className="input"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Actor, summary, resource ID…"
          />
        </div>
        <div>
          <label className="label">Action</label>
          <select
            className="input"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Resource</label>
          <select
            className="input"
            value={filters.resourceType}
            onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
          >
            <option value="">All resources</option>
            {RESOURCE_OPTIONS.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <DateField
            label="From"
            value={filters.from}
            onChange={(from) => setFilters((f) => ({ ...f, from }))}
          />
        </div>
        <div>
          <DateField
            label="To"
            value={filters.to}
            onChange={(to) => setFilters((f) => ({ ...f, to }))}
          />
        </div>
        <div className="flex items-end gap-2 lg:col-span-6">
          <Button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{loading ? 'Loading…' : pageLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            Rows
            <select
              className="input py-1.5 text-xs"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <Button type="button" size="sm" variant="secondary" disabled={!canPrev || loading} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
            Previous
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={!canNext || loading} onClick={() => setOffset((o) => o + limit)}>
            Next
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={loading ? 'Loading…' : 'No audit events yet. Actions will appear here after users make changes.'}
      />
    </div>
  )
}
