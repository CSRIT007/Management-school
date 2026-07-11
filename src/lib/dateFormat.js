const DISPLAY_RE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toIsoDate(value) {
  if (!value) return ''
  const s = String(value).trim()
  if (ISO_RE.test(s)) return s

  const display = DISPLAY_RE.exec(s)
  if (display) {
    const day = Number(display[1])
    const month = Number(display[2])
    const year = Number(display[3])
    if (!isValidParts(day, month, year)) return ''
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isValidParts(day, month, year) {
  if (month < 1 || month > 12 || day < 1 || year < 1000) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

export function isValidIsoDate(value) {
  return Boolean(toIsoDate(value))
}

export function formatDisplayDate(value) {
  if (!value) return '—'
  const iso = toIsoDate(value)
  if (!iso) return String(value)
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
