const DISPLAY_RE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isValidParts(day, month, year) {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

function fromLocalDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Convert UI / API date values to ISO `yyyy-mm-dd`.
 * Accepts:
 * - Date objects
 * - ISO `yyyy-mm-dd`
 * - ISO datetime (`yyyy-mm-ddTHH:mm:ss…`) — used by POS orders
 * - Display `dd-mm-yyyy` (full date only)
 *
 * Partial typing like "01" or "01-07" must NOT invent a date.
 */
export function toIsoDate(value) {
  if (value == null || value === '') return ''

  if (value instanceof Date) return fromLocalDate(value)

  const s = String(value).trim()
  if (!s) return ''

  if (ISO_RE.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return isValidParts(d, m, y) ? s : ''
  }

  // Datetime → calendar day in the user's local timezone (Cambodia UTC+7).
  // Do not take the UTC yyyy-mm-dd prefix from the string (that shifts the day).
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) {
    const parsed = new Date(s)
    if (!Number.isNaN(parsed.getTime())) return fromLocalDate(parsed)
  }

  const display = DISPLAY_RE.exec(s)
  if (display) {
    const day = Number(display[1])
    const month = Number(display[2])
    const year = Number(display[3])
    if (!isValidParts(day, month, year)) return ''
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  return ''
}

export function isValidIsoDate(value) {
  return Boolean(toIsoDate(value))
}

export function formatDisplayDate(value) {
  if (value == null || value === '') return '—'
  const iso = toIsoDate(value)
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

export function todayIso() {
  return fromLocalDate(new Date())
}

/**
 * Auto-format typing as dd-mm-yyyy.
 * After 2 day digits → `dd-`
 * After 2 month digits → `dd-mm-`
 * Deleting through a dash is allowed (dash is not forced back on).
 */
export function maskDisplayDateInput(raw, previous = '') {
  const cleaned = String(raw ?? '').replace(/[^\d-]/g, '')
  const digits = cleaned.replace(/\D/g, '').slice(0, 8)
  const prevDigits = String(previous ?? '').replace(/\D/g, '')
  const isDeleting = digits.length < prevDigits.length
  const removedTrailingDash =
    String(previous).endsWith('-') &&
    !cleaned.endsWith('-') &&
    digits.length === prevDigits.length

  const skipAutoDash = isDeleting || removedTrailingDash

  if (digits.length === 0) return ''

  if (digits.length <= 2) {
    return digits.length === 2 && !skipAutoDash ? `${digits}-` : digits
  }

  if (digits.length <= 4) {
    const base = `${digits.slice(0, 2)}-${digits.slice(2)}`
    return digits.length === 4 && !skipAutoDash ? `${base}-` : base
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}
