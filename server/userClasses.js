import { pool } from './db.js'
import {
  findTeacherScheduleConflicts,
  formatConflictMessage,
} from './scheduleConflict.js'

async function loadClassesWithTeachers(excludeClassId = null) {
  const { rows: classes } = await pool.query(
    'SELECT id, name, schedule, instructor FROM classes ORDER BY id'
  )
  const ids = classes.map((c) => c.id)
  if (!ids.length) return []

  const { rows: links } = await pool.query(
    `SELECT uc.class_id, u.id, u.name, u.email
     FROM user_classes uc
     JOIN users u ON u.id = uc.user_id
     WHERE uc.class_id = ANY($1::text[])`,
    [ids]
  )
  const byClass = new Map()
  for (const r of links) {
    if (!byClass.has(r.class_id)) byClass.set(r.class_id, [])
    byClass.get(r.class_id).push({ id: r.id, name: r.name, email: r.email })
  }

  return classes
    .filter((c) => c.id !== excludeClassId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      schedule: c.schedule || '',
      teachers: byClass.get(c.id) || [],
    }))
}

/**
 * Throws 409 if any teacher is already assigned to another class at overlapping time.
 */
export async function assertNoTeacherScheduleConflicts(classId, teacherIds, schedule) {
  const unique = [...new Set((teacherIds || []).filter(Boolean))]
  if (!unique.length || !String(schedule || '').trim()) return

  const { rows: teachers } = await pool.query(
    `SELECT id, name, email FROM users
     WHERE id = ANY($1::text[]) AND role = 'teacher'`,
    [unique]
  )
  if (!teachers.length) return

  const otherClasses = await loadClassesWithTeachers(null)
  const conflicts = findTeacherScheduleConflicts({
    classId,
    schedule,
    teachers,
    otherClasses,
  })
  if (!conflicts.length) return

  const err = new Error(formatConflictMessage(conflicts))
  err.status = 409
  err.conflicts = conflicts
  throw err
}

export async function ensureUserClassesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_classes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, class_id)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_classes_user ON user_classes(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_classes_class ON user_classes(class_id)`)
}

export async function getClassIdsForUser(userId) {
  const { rows } = await pool.query(
    'SELECT class_id FROM user_classes WHERE user_id = $1',
    [userId]
  )
  return rows.map((r) => r.class_id)
}

export async function userHasClass(userId, classId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM user_classes WHERE user_id = $1 AND class_id = $2 LIMIT 1',
    [userId, classId]
  )
  return rows.length > 0
}

export async function getTeachersForClass(classId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.active
     FROM user_classes uc
     JOIN users u ON u.id = uc.user_id
     WHERE uc.class_id = $1
     ORDER BY u.name ASC`,
    [classId]
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    active: r.active,
  }))
}

export async function getTeachersByClassIds(classIds = []) {
  if (!classIds.length) return new Map()
  const { rows } = await pool.query(
    `SELECT uc.class_id, u.id, u.name, u.email, u.role, u.active
     FROM user_classes uc
     JOIN users u ON u.id = uc.user_id
     WHERE uc.class_id = ANY($1::text[])
     ORDER BY u.name ASC`,
    [classIds]
  )
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.class_id)) map.set(r.class_id, [])
    map.get(r.class_id).push({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      active: r.active,
    })
  }
  return map
}

export async function setClassTeachers(classId, teacherIds = []) {
  const unique = [...new Set((teacherIds || []).filter(Boolean))]

  if (unique.length) {
    const { rows } = await pool.query(
      `SELECT id, name FROM users
       WHERE id = ANY($1::text[])
         AND role = 'teacher'
         AND active = TRUE`,
      [unique]
    )
    if (rows.length !== unique.length) {
      const err = new Error('One or more teachers are invalid or inactive')
      err.status = 400
      throw err
    }

    const { rows: classRows } = await pool.query(
      'SELECT schedule FROM classes WHERE id = $1',
      [classId]
    )
    await assertNoTeacherScheduleConflicts(
      classId,
      unique,
      classRows[0]?.schedule || ''
    )

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM user_classes WHERE class_id = $1', [classId])
      for (const userId of unique) {
        await client.query(
          'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
          [userId, classId]
        )
      }
      const instructor = rows.map((r) => r.name).join(', ')
      await client.query(
        'UPDATE classes SET instructor = $2, updated_at = NOW() WHERE id = $1',
        [classId, instructor]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } else {
    await pool.query('DELETE FROM user_classes WHERE class_id = $1', [classId])
  }

  return getTeachersForClass(classId)
}

export async function getStudentIdsForTeacher(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT cs.student_id
     FROM user_classes uc
     JOIN class_students cs ON cs.class_id = uc.class_id
     WHERE uc.user_id = $1`,
    [userId]
  )
  return rows.map((r) => r.student_id)
}

export async function listActiveTeachers() {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, active
     FROM users
     WHERE role = 'teacher' AND active = TRUE
     ORDER BY name ASC`
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    active: r.active,
  }))
}

/** Link demo teacher to sample classes once (idempotent). */
export async function seedDemoTeacherClasses() {
  const { rows: teachers } = await pool.query(
    `SELECT id FROM users WHERE email = 'teacher@school.csrsms.com' AND role = 'teacher' LIMIT 1`
  )
  if (!teachers[0]) return

  const { rows: existing } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM user_classes WHERE user_id = $1',
    [teachers[0].id]
  )
  if (existing[0].count > 0) return

  let { rows: classes } = await pool.query(
    `SELECT id FROM classes WHERE id IN ('C101', 'C205') ORDER BY id`
  )
  if (!classes.length) {
    const fallback = await pool.query(
      `SELECT id FROM classes ORDER BY created_at ASC LIMIT 2`
    )
    classes = fallback.rows
  }
  for (const cls of classes) {
    await pool.query(
      `INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [teachers[0].id, cls.id]
    )
  }
  if (classes.length) {
    console.log(`Linked demo teacher to ${classes.length} class(es)`)
  }
}
