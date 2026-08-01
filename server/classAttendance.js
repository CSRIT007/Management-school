import { pool } from './db.js'
import { calendarDate } from './calendarDate.js'

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused']

function formatDate(value) {
  return calendarDate(value) || ''
}

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    classId: row.class_id || '',
    studentId: row.student_id || '',
    studentName: row.student_name || '',
    date: formatDate(row.attendance_date),
    status: row.status || 'Present',
    note: row.note || '',
    recordedBy: row.recorded_by || '',
    recordedByName: row.recorded_by_name || '',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function normalizeStatus(value) {
  const s = String(value || '').trim()
  if (ATTENDANCE_STATUSES.includes(s)) return s
  throw Object.assign(
    new Error(`Status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
    { status: 400 }
  )
}

export async function ensureClassAttendanceTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_attendance (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL DEFAULT '',
      attendance_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      note TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL DEFAULT '',
      recorded_by_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (class_id, student_id, attendance_date)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_attendance_class ON class_attendance(class_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_attendance_date ON class_attendance(attendance_date)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_attendance_student ON class_attendance(student_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_attendance_status ON class_attendance(status)`)
}

async function getClassName(classId) {
  const { rows } = await pool.query(`SELECT name FROM classes WHERE id = $1`, [classId])
  return rows[0]?.name || ''
}

async function getRosterStudents(classId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.name
     FROM class_students cs
     JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id = $1
     ORDER BY s.name ASC`,
    [classId]
  )
  return rows.map((r) => ({ id: r.id, name: r.name || '' }))
}

function emptyCounts() {
  return { Present: 0, Absent: 0, Late: 0, Excused: 0 }
}

function countStatuses(rows) {
  const counts = emptyCounts()
  for (const r of rows) {
    if (counts[r.status] != null) counts[r.status] += 1
  }
  return counts
}

/**
 * Attendance sheet for one class + date.
 * Merges roster with saved marks; unsaved students default to Present.
 */
export async function getAttendanceSheet(classId, date) {
  const cid = String(classId || '').trim()
  const d = formatDate(date)
  if (!cid) {
    throw Object.assign(new Error('classId is required'), { status: 400 })
  }
  if (!d) {
    throw Object.assign(new Error('date is required (yyyy-mm-dd)'), { status: 400 })
  }

  const { rows: classRows } = await pool.query(`SELECT id, name FROM classes WHERE id = $1`, [cid])
  if (!classRows[0]) {
    throw Object.assign(new Error('Class not found'), { status: 404 })
  }

  const roster = await getRosterStudents(cid)
  const { rows: saved } = await pool.query(
    `SELECT * FROM class_attendance
     WHERE class_id = $1 AND attendance_date = $2::date`,
    [cid, d]
  )
  const byStudent = new Map(saved.map((r) => [r.student_id, toApi(r)]))

  const rows = roster.map((s) => {
    const existing = byStudent.get(s.id)
    if (existing) {
      return {
        id: existing.id,
        studentId: s.id,
        studentName: existing.studentName || s.name,
        status: existing.status,
        note: existing.note,
        saved: true,
      }
    }
    return {
      id: null,
      studentId: s.id,
      studentName: s.name,
      status: 'Present',
      note: '',
      saved: false,
    }
  })

  return {
    classId: cid,
    className: classRows[0].name || '',
    date: d,
    rows,
    counts: countStatuses(rows),
    savedCount: rows.filter((r) => r.saved).length,
  }
}

/**
 * Upsert attendance for a class + date.
 * actor: { id, name }
 */
export async function upsertAttendanceSheet({ classId, date, rows = [], actor = {} } = {}) {
  const cid = String(classId || '').trim()
  const d = formatDate(date)
  if (!cid) {
    throw Object.assign(new Error('classId is required'), { status: 400 })
  }
  if (!d) {
    throw Object.assign(new Error('date is required (yyyy-mm-dd)'), { status: 400 })
  }

  const { rows: classRows } = await pool.query(`SELECT id FROM classes WHERE id = $1`, [cid])
  if (!classRows[0]) {
    throw Object.assign(new Error('Class not found'), { status: 404 })
  }

  const roster = await getRosterStudents(cid)
  const rosterMap = new Map(roster.map((s) => [s.id, s.name]))
  if (!roster.length) {
    throw Object.assign(new Error('Class has no enrolled students'), { status: 400 })
  }

  const recordedBy = String(actor.id || '').trim()
  const recordedByName = String(actor.name || '').trim()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Lock table so concurrent roll-call saves get unique ATT ids
    await client.query('LOCK TABLE class_attendance IN EXCLUSIVE MODE')

    let nextNum = 0
    {
      const { rows } = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) AS max
        FROM class_attendance
        WHERE id ~ '^ATT-[0-9]+$'
      `)
      nextNum = Number(rows[0].max) || 0
    }

    for (const row of rows) {
      const studentId = String(row.studentId || '').trim()
      if (!studentId || !rosterMap.has(studentId)) continue

      const status = normalizeStatus(row.status || 'Present')
      const note = String(row.note || '').trim()
      const studentName = rosterMap.get(studentId) || String(row.studentName || '').trim()

      const { rows: existing } = await client.query(
        `SELECT id FROM class_attendance
         WHERE class_id = $1 AND student_id = $2 AND attendance_date = $3::date`,
        [cid, studentId, d]
      )

      if (existing[0]) {
        await client.query(
          `UPDATE class_attendance SET
             student_name = $2,
             status = $3,
             note = $4,
             recorded_by = $5,
             recorded_by_name = $6,
             updated_at = NOW()
           WHERE id = $1`,
          [existing[0].id, studentName, status, note, recordedBy, recordedByName]
        )
      } else {
        nextNum += 1
        const id = `ATT-${String(nextNum).padStart(4, '0')}`
        await client.query(
          `INSERT INTO class_attendance (
             id, class_id, student_id, student_name, attendance_date,
             status, note, recorded_by, recorded_by_name
           ) VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9)`,
          [id, cid, studentId, studentName, d, status, note, recordedBy, recordedByName]
        )
      }
    }

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return getAttendanceSheet(cid, d)
}

export async function getAttendanceSummary({ classId = '', dateFrom = '', dateTo = '' } = {}) {
  const cid = String(classId || '').trim()
  const from = formatDate(dateFrom)
  const to = formatDate(dateTo)

  const params = []
  const where = []

  if (cid) {
    params.push(cid)
    where.push(`class_id = $${params.length}`)
  }
  if (from) {
    params.push(from)
    where.push(`attendance_date >= $${params.length}::date`)
  }
  if (to) {
    params.push(to)
    where.push(`attendance_date <= $${params.length}::date`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM class_attendance
     ${whereSql}
     GROUP BY status`,
    params
  )

  const counts = emptyCounts()
  let total = 0
  for (const r of rows) {
    if (counts[r.status] != null) {
      counts[r.status] = r.count
      total += r.count
    }
  }

  const className = cid ? await getClassName(cid) : ''

  return {
    classId: cid || null,
    className,
    dateFrom: from || null,
    dateTo: to || null,
    total,
    counts,
  }
}
