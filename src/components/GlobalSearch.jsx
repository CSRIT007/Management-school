import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getNavItemsForRole } from '../lib/roles.js'

/** Extra words so short queries like "finance" / "pos" / "stock" find pages. */
const PAGE_KEYWORDS = {
  '/': ['home', 'dashboard', 'overview', 'main'],
  '/students/register': ['student', 'students', 'register', 'enrollment', 'admit'],
  '/students/classes': ['class', 'classes', 'course', 'schedule', 'teacher'],
  '/students/dateline': ['deadline', 'dateline', 'due', 'task'],
  '/students/payment': ['payment', 'payments', 'invoice', 'fee', 'tuition', 'finance'],
  '/students/book': ['book', 'library', 'issue'],
  '/students/finish': ['finish', 'graduate', 'graduation', 'alumni'],
  '/stock/category': ['category', 'categories', 'stock', 'inventory'],
  '/stock/product': ['product', 'products', 'stock', 'inventory', 'sku', 'item'],
  '/stock/pos': ['pos', 'sale', 'sales', 'checkout', 'cart', 'point of sale', 'stock'],
  '/stock/report': ['stock', 'report', 'sales', 'inventory', 'invoice'],
  '/finance/overview': ['finance', 'financial', 'money', 'revenue', 'overview', 'report'],
  '/finance/tuition': ['finance', 'tuition', 'fees', 'payment', 'student'],
  '/finance/pos-revenue': ['finance', 'pos', 'revenue', 'sales', 'stock'],
  '/finance/pending': ['finance', 'pending', 'unpaid', 'due', 'payment'],
  '/finance/cash-flow': ['finance', 'cash', 'cashflow', 'daily', 'flow', 'money'],
  '/finance/methods': ['finance', 'method', 'methods', 'cash', 'card', 'qr', 'payment'],
  '/finance/purpose': ['finance', 'purpose', 'fee', 'tuition'],
  '/finance/monthly': ['finance', 'monthly', 'summary', 'report', 'month'],
  '/finance/student-ledger': ['finance', 'ledger', 'student', 'history', 'account'],
  '/admin/teachers': ['admin', 'teacher', 'teachers', 'staff', 'people'],
  '/admin/staff': ['admin', 'staff', 'employee', 'people'],
  '/admin/users': ['admin', 'user', 'users', 'account', 'role', 'login'],
  '/admin/audit-log': ['admin', 'audit', 'log', 'history', 'track', 'change'],
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(query) {
  return normalize(query).split(' ').filter(Boolean)
}

/**
 * Score how well haystack matches query tokens.
 * Higher = better. 0 = no match.
 */
function scoreMatch(query, ...parts) {
  const tokens = tokenize(query)
  if (!tokens.length) return 0

  const hay = normalize(parts.filter(Boolean).join(' '))
  if (!hay) return 0

  let score = 0
  for (const token of tokens) {
    if (hay === token) {
      score += 100
      continue
    }
    if (hay.startsWith(token)) {
      score += 70
      continue
    }
    // Word-boundary / includes
    const words = hay.split(' ')
    if (words.some((w) => w === token)) {
      score += 60
      continue
    }
    if (words.some((w) => w.startsWith(token))) {
      score += 45
      continue
    }
    if (hay.includes(token)) {
      score += 25
      continue
    }
    // Soft: all chars of token appear in order (helps typos-ish short queries)
    let i = 0
    for (const ch of hay) {
      if (ch === token[i]) i += 1
      if (i >= token.length) break
    }
    if (i >= token.length && token.length >= 3) {
      score += 10
      continue
    }
    return 0
  }
  return score
}

function buildPageCatalog(role) {
  const groups = getNavItemsForRole(role)
  const pages = []
  for (const group of groups) {
    for (const item of group.items) {
      pages.push({
        id: `page-${item.to}`,
        type: 'Page',
        title: item.label,
        subtitle: group.section,
        path: item.to,
        keywords: PAGE_KEYWORDS[item.to] || [],
        section: group.section,
      })
    }
  }
  return pages
}

function searchPages(pages, query) {
  const results = []
  for (const page of pages) {
    const score = scoreMatch(
      query,
      page.title,
      page.subtitle,
      page.section,
      page.path,
      ...(page.keywords || [])
    )
    if (score > 0) {
      results.push({ ...page, score: score + 40 }) // prefer pages slightly
    }
  }
  return results
}

function searchRecords(students, products, classes, query) {
  const results = []

  for (const s of students) {
    const score = scoreMatch(query, s.name, s.id, s.email, s.phone, s.program)
    if (score > 0) {
      results.push({
        id: `student-${s.id}`,
        type: 'Student',
        title: s.name || s.id,
        subtitle: [s.id, s.program].filter(Boolean).join(' · '),
        path: '/students/register',
        score,
      })
    }
  }

  for (const p of products) {
    const score = scoreMatch(query, p.name, p.id, p.sku, p.category)
    if (score > 0) {
      results.push({
        id: `product-${p.id}`,
        type: 'Product',
        title: p.name || p.id,
        subtitle: [p.id, p.category].filter(Boolean).join(' · '),
        path: '/stock/product',
        score,
      })
    }
  }

  for (const c of classes) {
    const score = scoreMatch(query, c.name, c.id, c.instructor, c.schedule)
    if (score > 0) {
      results.push({
        id: `class-${c.id}`,
        type: 'Class',
        title: c.name || c.id,
        subtitle: [c.id, c.instructor].filter(Boolean).join(' · '),
        path: '/students/classes',
        score,
      })
    }
  }

  return results
}

function mergeRanked(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const item of list) {
      const prev = map.get(item.id)
      if (!prev || item.score > prev.score) map.set(item.id, item)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 12)
}

const typeColors = {
  Page: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
  Student: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  Product: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Class: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
}

export default function GlobalSearch() {
  const { role } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const cacheRef = useRef(null)
  const navigate = useNavigate()

  const pages = useMemo(() => buildPageCatalog(role), [role])

  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }

    // Pages match instantly (e.g. "finance")
    const pageHits = searchPages(pages, q)
    setResults(mergeRanked(pageHits))

    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        if (!cacheRef.current) {
          const settled = await Promise.allSettled([
            get('/api/students'),
            get('/api/products'),
            get('/api/classes'),
          ])
          cacheRef.current = {
            students: settled[0].status === 'fulfilled' ? settled[0].value : [],
            products: settled[1].status === 'fulfilled' ? settled[1].value : [],
            classes: settled[2].status === 'fulfilled' ? settled[2].value : [],
          }
        }
        if (cancelled) return
        const { students, products, classes } = cacheRef.current
        const recordHits = searchRecords(students, products, classes, q)
        setResults(mergeRanked(pageHits, recordHits))
        setError('')
      } catch (e) {
        if (!cancelled) {
          // Keep page results even if record search fails
          setResults(mergeRanked(pageHits))
          if (!pageHits.length) setError(e.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, pages])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }

      if (e.key === 'Escape' && wrapRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        setOpen(false)
        setQuery('')
        setResults([])
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const goTo = (path) => {
    navigate(path)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const showPanel = open && query.trim().length > 0
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K'

  return (
    <div ref={wrapRef} className="relative w-44 sm:w-56 lg:w-72">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 015.132 11.205l4.206 4.207-1.061 1.06-4.206-4.206A6.75 6.75 0 1110.5 3.75zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" clipRule="evenodd" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search pages, students…"
          className={`input w-full py-2 !pl-10 ${query ? '!pr-9' : '!pr-[3.25rem]'}`}
          aria-label="Quick search (Ctrl or Cmd + K)"
          title={`Quick search (${shortcutLabel})`}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <kbd
            className="pointer-events-none absolute inset-y-0 right-2 my-auto hidden h-6 items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-400 sm:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
            aria-hidden="true"
          >
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[20rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Searching…</div>
          )}

          {!loading && error && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>
          )}

          {!error && results.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.path)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[item.type] || typeColors.Page}`}>
                      {item.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
