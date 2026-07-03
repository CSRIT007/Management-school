import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../lib/api.js'

function matchesQuery(obj, query, fields) {
  const q = query.toLowerCase()
  return fields.some((field) => String(obj[field] ?? '').toLowerCase().includes(q))
}

function buildResults(students, products, classes, query) {
  const q = query.trim()
  if (!q) return []

  const results = []

  for (const s of students) {
    if (matchesQuery(s, q, ['name', 'id', 'email', 'phone', 'program'])) {
      results.push({
        id: `student-${s.id}`,
        type: 'Student',
        title: s.name || s.id,
        subtitle: [s.id, s.program].filter(Boolean).join(' · '),
        path: '/students/register',
      })
    }
  }

  for (const p of products) {
    if (matchesQuery(p, q, ['name', 'id', 'sku', 'category'])) {
      results.push({
        id: `product-${p.id}`,
        type: 'Product',
        title: p.name || p.id,
        subtitle: [p.id, p.category].filter(Boolean).join(' · '),
        path: '/stock/product',
      })
    }
  }

  for (const c of classes) {
    if (matchesQuery(c, q, ['name', 'id', 'instructor', 'schedule'])) {
      results.push({
        id: `class-${c.id}`,
        type: 'Class',
        title: c.name || c.id,
        subtitle: [c.id, c.instructor].filter(Boolean).join(' · '),
        path: '/students/classes',
      })
    }
  }

  return results.slice(0, 10)
}

const typeColors = {
  Student: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  Product: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Class: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const [students, products, classes] = await Promise.all([
          get('/api/students'),
          get('/api/products'),
          get('/api/classes'),
        ])
        setResults(buildResults(students, products, classes, q))
        setError('')
      } catch (e) {
        setResults([])
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const goTo = (path) => {
    navigate(path)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const showPanel = open && query.trim().length > 0

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
          placeholder="Search students, products…"
          className={`input w-full py-2 !pl-10 ${query ? '!pr-9' : '!pr-3'}`}
          aria-label="Search"
          autoComplete="off"
        />
        {query && (
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
        )}
      </div>

      {showPanel && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[18rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Searching…</div>
          )}

          {!loading && error && (
            <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.path)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[item.type]}`}>
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
