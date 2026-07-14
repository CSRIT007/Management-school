import { useEffect, useState } from 'react'
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

  return (
    <div>
      {label ? <label className="label">{label}</label> : null}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        className={[
          'input',
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
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  )
}
