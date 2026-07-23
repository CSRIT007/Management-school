/** School calendar timezone (Cambodia). */
export const APP_TIMEZONE = 'Asia/Phnom_Penh'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Calendar yyyy-mm-dd in Asia/Phnom_Penh.
 * - Date-only strings are kept as-is (already a calendar day).
 * - Datetimes / Date objects are converted using Cambodia time (not UTC).
 */
export function calendarDate(value = new Date(), timeZone = APP_TIMEZONE) {
  if (value == null || value === '') return ''

  if (typeof value === 'string') {
    const s = value.trim()
    if (DATE_ONLY.test(s)) return s
  }

  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function todayCalendarDate(timeZone = APP_TIMEZONE) {
  return calendarDate(new Date(), timeZone)
}
