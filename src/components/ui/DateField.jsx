import { useEffect, useRef, useState } from 'react'
import { formatDisplayDate, maskDisplayDateInput, toIsoDate } from '../../lib/dateFormat.js'

export default function DateField({
  label,
  value,
  onChange,
  required = false,
  className = '',
  error = '',
}) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const pickerRef = useRef(null)

  const isoValue = toIsoDate(value) || ''

  useEffect(() => {
    // Do not rewrite the field while the user is still typing.
    if (focused) return
    const display = formatDisplayDate(value)
    setText(display === '—' ? '' : display)
  }, [value, focused])

  const commit = (raw) => {
    const cleaned = String(raw || '').trim()
    if (!cleaned) {
      setText('')
      onChange('')
      return true
    }
    const iso = toIsoDate(cleaned)
    if (iso) {
      setText(formatDisplayDate(iso))
      onChange(iso)
      return true
    }
    return false
  }

  const applyIso = (iso) => {
    if (!iso) {
      setText('')
      onChange('')
      return
    }
    setText(formatDisplayDate(iso))
    onChange(iso)
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === 'function') el.showPicker()
      else el.click()
    } catch {
      el.click()
    }
  }

  return (
    <div>
      {label ? <label className="label">{label}</label> : null}
      <div className="relative flex">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd-mm-yyyy"
          maxLength={10}
          className={[
            'input rounded-r-none border-r-0 pr-10',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : '',
            className,
          ].join(' ')}
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const masked = maskDisplayDateInput(e.target.value, text)
            setText(masked)
            // Only commit when dd-mm-yyyy is complete and valid.
            const iso = toIsoDate(masked)
            if (iso) onChange(iso)
          }}
          onBlur={() => {
            setFocused(false)
            if (!text.trim()) {
              setText('')
              onChange('')
              return
            }
            if (!commit(text)) {
              const display = formatDisplayDate(value)
              setText(display === '—' ? '' : display)
            }
          }}
          required={required}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          title="Open calendar"
          aria-label="Open calendar"
          className={[
            'inline-flex items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-3 text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300',
            error ? 'border-rose-400' : '',
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18h-10.5A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
          value={isoValue}
          onChange={(e) => applyIso(e.target.value)}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  )
}
