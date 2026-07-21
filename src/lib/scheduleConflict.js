/** Day name → weekday index (Sun=0 … Sat=6). */
const DAY_ALIASES = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}

/**
 * Parse free-text schedules like "Mon/Wed 9-10", "Tue/Thu 14:00-16:00".
 * Returns slots: { day, startMin, endMin }[] or [] if unparseable.
 */
export function parseSchedule(raw) {
  if (!raw || !String(raw).trim()) return []
  const text = String(raw).trim().toLowerCase()

  const days = []
  const dayRe =
    /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/g
  let m
  while ((m = dayRe.exec(text))) {
    const key = m[1].replace(/\./g, '')
    const day = DAY_ALIASES[key] ?? DAY_ALIASES[key.slice(0, 3)]
    if (day != null && !days.includes(day)) days.push(day)
  }
  if (!days.length) return []

  const timeRe =
    /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i
  const tm = text.match(timeRe)
  if (!tm) return []

  const startMin = toMinutes(Number(tm[1]), tm[2] ? Number(tm[2]) : 0, tm[3])
  const endMin = toMinutes(Number(tm[4]), tm[5] ? Number(tm[5]) : 0, tm[6] || tm[3])
  if (startMin == null || endMin == null || endMin <= startMin) return []

  return days.map((day) => ({ day, startMin, endMin }))
}

function toMinutes(hour, minute, meridiem) {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null
  let h = hour
  const mer = (meridiem || '').replace(/\./g, '').toLowerCase()
  if (mer === 'am' || mer === 'pm') {
    if (h < 1 || h > 12) return null
    if (mer === 'am') h = h === 12 ? 0 : h
    else h = h === 12 ? 12 : h + 12
  }
  return h * 60 + minute
}

export function slotsOverlap(a, b) {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin
}

export function schedulesOverlap(scheduleA, scheduleB) {
  const a = parseSchedule(scheduleA)
  const b = parseSchedule(scheduleB)
  if (!a.length || !b.length) return false
  return a.some((sa) => b.some((sb) => slotsOverlap(sa, sb)))
}

/**
 * Find teacher double-bookings for a class being saved/assigned.
 * @param {{ classId: string, schedule: string, teachers: {id,name}[], otherClasses: {id,name,schedule,teachers:{id,name}[]}[] }}
 */
export function findTeacherScheduleConflicts({ classId, schedule, teachers, otherClasses }) {
  const thisSlots = parseSchedule(schedule)
  if (!thisSlots.length || !teachers?.length) return []

  const conflicts = []
  for (const teacher of teachers) {
    for (const other of otherClasses || []) {
      if (!other || other.id === classId) continue
      const onOther = (other.teachers || []).some((t) => t.id === teacher.id)
      if (!onOther) continue
      if (!schedulesOverlap(schedule, other.schedule)) continue
      conflicts.push({
        teacherId: teacher.id,
        teacherName: teacher.name || teacher.email || teacher.id,
        otherClassId: other.id,
        otherClassName: other.name || other.id,
        otherSchedule: other.schedule || '',
        thisSchedule: schedule || '',
      })
    }
  }
  return conflicts
}

export function formatConflictMessage(conflicts) {
  if (!conflicts?.length) return ''
  const lines = conflicts.map(
    (c) =>
      `• ${c.teacherName} already teaches ${c.otherClassId} (${c.otherClassName}) at ${c.otherSchedule || 'overlapping time'}`
  )
  return [
    'Teacher schedule conflict — the same teacher cannot teach two classes at the same time.',
    `This class schedule: ${conflicts[0].thisSchedule || '—'}`,
    ...lines,
    'Change the schedule or assign a different teacher.',
  ].join('\n')
}
