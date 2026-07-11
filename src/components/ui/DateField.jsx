import { useEffect, useState } from 'react'
import { formatDisplayDate, toIsoDate } from '../../lib/dateFormat.js'

export default function DateField({
  label,
  value,
  onChange,
  required = false,
  className = '',
  error = '',
}) {
  const [text, setText] = useState('')

  useEffect(() => {
    const display = formatDisplayDate(value)
    setText(display === '—' ? '' : display)
  }, [value])

  const commit = (raw) => {
    const iso = toIsoDate(raw)
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
        className={[
          'input',
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : '',
          className,
        ].join(' ')}
        value={text}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          const iso = toIsoDate(raw)
          if (iso) onChange(iso)
        }}
        onBlur={() => {
          if (!text.trim()) {
            onChange('')
            return
          }
          if (!commit(text)) {
            setText(formatDisplayDate(value) === '—' ? '' : formatDisplayDate(value))
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
