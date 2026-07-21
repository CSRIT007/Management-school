import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { canManageClasses } from '../../lib/roles.js'
import { findTeacherScheduleConflicts } from '../../lib/scheduleConflict.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { id: '', name: '', instructor: '', schedule: '', capacity: '0/20', teacherIds: [] }

function parseCapacity(capacity) {
  const s = String(capacity || '0/20').trim()
  const [a, b] = s.split('/')
  return {
    enrolled: Math.max(0, parseInt(a, 10) || 0),
    max: Math.max(1, parseInt(b, 10) || parseInt(a, 10) || 20),
  }
}

function teacherLabel(teachers = []) {
  if (!teachers.length) return '—'
  return teachers.map((t) => t.name).join(', ')
}

function ScheduleConflictModal({ conflicts, onClose }) {
  if (!conflicts?.length) return null
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-conflict-title"
    >
      <div
        className="panel w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="schedule-conflict-title" className="text-lg font-bold text-rose-700 dark:text-rose-400">
          Teacher double time
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The same teacher cannot teach two classes at the same time. Fix the schedule or choose another teacher.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
          This class: <span className="font-normal">{conflicts[0].thisSchedule || '—'}</span>
        </p>
        <ul className="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          {conflicts.map((c) => (
            <li key={`${c.teacherId}-${c.otherClassId}`} className="text-rose-800 dark:text-rose-300">
              <span className="font-semibold">{c.teacherName}</span>
              {' '}already teaches{' '}
              <span className="font-mono">{c.otherClassId}</span>
              {' '}({c.otherClassName}) at {c.otherSchedule || 'overlapping time'}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  )
}

function ClassDetailModal({ detail, students, isFull, busy, onClose }) {
  if (!detail) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 dark:bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Class Detail (view only)</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{detail.name}</h3>
            <p className="mt-1 font-mono text-sm text-slate-500">{detail.id}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <dl className="mb-6 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/80 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Assigned Teachers</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{teacherLabel(detail.teachers)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Schedule</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{detail.schedule || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Maximum Students</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{detail.capacity}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Status</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{isFull ? 'Full' : 'Open'}</dd>
          </div>
        </dl>

        <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
          Students ({students.length})
        </h4>

        {busy ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : students.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800">
            No students enrolled yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Program</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-mono font-medium">{student.id}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{student.email || '—'}</td>
                    <td className="px-4 py-3">{student.program || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClassManagement() {
  const { role } = useAuth()
  const canManage = canManageClasses(role)

  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [pickStudentId, setPickStudentId] = useState('')
  const [rosterBusy, setRosterBusy] = useState(false)
  const [detailClass, setDetailClass] = useState(null)
  const [detailStudents, setDetailStudents] = useState([])
  const [showDetail, setShowDetail] = useState(false)
  const [scheduleConflicts, setScheduleConflicts] = useState(null)

  const load = async () => {
    try {
      const requests = [get('/api/classes'), get('/api/students')]
      if (canManage) requests.push(get('/api/teachers'))
      const [classes, allStudents, teacherList] = await Promise.all(requests)
      setRows(classes)
      setStudents(allStudents)
      if (teacherList) setTeachers(teacherList)
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  const loadNextId = async () => {
    if (!canManage) return
    try {
      const { id } = await get('/api/classes/next-id')
      setForm((f) => ({ ...f, id }))
    } catch {
      // server auto-generates on save
    }
  }

  const loadEnrolled = async (classId) => {
    const data = await get(`/api/classes/${classId}/roster`)
    setEnrolledStudents(data.students)
    setForm((f) => ({
      ...f,
      capacity: data.class.capacity,
      teacherIds: data.class.teacherIds || [],
      instructor: data.class.instructor || '',
    }))
    setRows((prev) => prev.map((r) => (r.id === classId ? data.class : r)))
    return data
  }

  const syncRoster = (classId, result) => {
    setRows((prev) => prev.map((r) => (r.id === classId ? result.class : r)))
    if (editingId === classId) {
      setForm((f) => ({
        ...f,
        capacity: result.class.capacity,
        teacherIds: result.class.teacherIds || f.teacherIds,
        instructor: result.class.instructor || f.instructor,
      }))
      setEnrolledStudents(result.students)
    }
    if (detailClass?.id === classId) {
      setDetailClass(result.class)
      setDetailStudents(result.students)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (canManage && !editingId) loadNextId()
  }, [editingId, canManage])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = async () => {
    setForm(emptyForm)
    setEditingId(null)
    setEnrolledStudents([])
    setPickStudentId('')
    setMessage('')
    setError(false)
    setScheduleConflicts(null)
    await loadNextId()
  }

  const toggleTeacher = (teacherId) => {
    setForm((f) => {
      const has = f.teacherIds.includes(teacherId)
      return {
        ...f,
        teacherIds: has
          ? f.teacherIds.filter((id) => id !== teacherId)
          : [...f.teacherIds, teacherId],
      }
    })
  }

  const startEdit = async (row) => {
    if (!canManage) return
    setShowDetail(false)
    setEditingId(row.id)
    setForm({
      id: row.id,
      name: row.name || '',
      instructor: row.instructor || '',
      schedule: row.schedule || '',
      capacity: row.capacity || '0/20',
      teacherIds: row.teacherIds || [],
    })
    setPickStudentId('')
    setMessage('')
    setError(false)
    try {
      await loadEnrolled(row.id)
    } catch (e) {
      showMsg(e.message, true)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openClassDetail = async (row) => {
    setShowDetail(true)
    setDetailClass(row)
    setDetailStudents([])
    setRosterBusy(true)
    try {
      const data = await get(`/api/classes/${row.id}/roster`)
      setDetailClass(data.class)
      setDetailStudents(data.students)
    } catch (e) {
      showMsg(e.message, true)
    } finally {
      setRosterBusy(false)
    }
  }

  const checkTeacherConflicts = (classId, schedule, teacherIds) => {
    const selected = teachers.filter((t) => teacherIds.includes(t.id))
    return findTeacherScheduleConflicts({
      classId,
      schedule,
      teachers: selected,
      otherClasses: rows,
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canManage) return

    const cap = parseCapacity(form.capacity)
    const enrolled = editingId ? enrolledStudents.length : 0
    if (editingId && enrolled > cap.max) {
      showMsg(`Capacity max (${cap.max}) cannot be less than enrolled students (${enrolled}).`, true)
      return
    }

    const conflicts = checkTeacherConflicts(
      editingId || form.id || '__new__',
      form.schedule,
      form.teacherIds
    )
    if (conflicts.length) {
      setScheduleConflicts(conflicts)
      showMsg('Teacher schedule conflict — same teacher cannot teach at overlapping times.', true)
      return
    }

    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        name: form.name,
        schedule: form.schedule,
        capacity: editingId ? form.capacity : `0/${cap.max}`,
        instructor: form.instructor,
        teacherIds: form.teacherIds,
      }
      let classId = editingId
      if (editingId) {
        await put(`/api/classes/${editingId}`, payload)
      } else {
        const created = await post('/api/classes', payload)
        classId = created.id
      }
      await put(`/api/classes/${classId}/teachers`, { teacherIds: form.teacherIds })
      showMsg(editingId ? 'Class updated successfully.' : 'Class created successfully.')
      reset()
      await load()
    } catch (err) {
      const text = err.message || 'Save failed'
      if (/schedule conflict|double time|already teaches/i.test(text)) {
        const again = checkTeacherConflicts(
          editingId || form.id || '__new__',
          form.schedule,
          form.teacherIds
        )
        setScheduleConflicts(again.length ? again : [{
          teacherId: '?',
          teacherName: 'Teacher',
          otherClassId: '',
          otherClassName: '',
          otherSchedule: '',
          thisSchedule: form.schedule,
        }])
      }
      showMsg(text, true)
    } finally {
      setSaving(false)
    }
  }

  const addStudentToClass = async (classId, studentId, clearPick) => {
    if (!classId || !studentId || !canManage) return
    setRosterBusy(true)
    try {
      const result = await post(`/api/classes/${classId}/students`, { studentId })
      syncRoster(classId, result)
      clearPick('')
      showMsg('Student added to class.')
    } catch (e) {
      showMsg(e.message, true)
    } finally {
      setRosterBusy(false)
    }
  }

  const removeStudentFromClass = async (classId, studentId) => {
    if (!classId || !studentId || !canManage) return
    setRosterBusy(true)
    try {
      const result = await del(`/api/classes/${classId}/students/${studentId}`)
      syncRoster(classId, result)
      showMsg('Student removed from class.')
    } catch (e) {
      showMsg(e.message, true)
    } finally {
      setRosterBusy(false)
    }
  }

  const remove = async (id) => {
    if (!canManage) return
    if (!confirm(`Delete class ${id}?`)) return
    try {
      await del(`/api/classes/${id}`)
      if (editingId === id) reset()
      if (detailClass?.id === id) setShowDetail(false)
      await load()
      showMsg('Class deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const formCapacity = parseCapacity(form.capacity)
  const formEnrolled = enrolledStudents.length
  const isFormFull = formEnrolled >= formCapacity.max
  const availableStudents = students.filter(
    (s) => !enrolledStudents.some((r) => r.id === s.id)
  )

  const detailCapacity = detailClass ? parseCapacity(detailClass.capacity) : { enrolled: 0, max: 20 }
  const isDetailFull = detailStudents.length >= detailCapacity.max

  const columns = [
    {
      key: 'id',
      label: 'Class ID',
      className: 'font-mono font-semibold text-slate-900 dark:text-slate-100',
    },
    { key: 'name', label: 'Class Name' },
    {
      key: 'teachers',
      label: 'Teachers',
      render: (r) => teacherLabel(r.teachers) || r.instructor || '—',
    },
    { key: 'schedule', label: 'Schedule' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => openClassDetail(row)}>
            Detail
          </Button>
          {canManage && (
            <>
              <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(row.id)}>
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        subtitle={
          canManage
            ? 'Create classes, assign teachers, and manage student rosters'
            : 'View your assigned classes and student rosters'
        }
      />

      <FormAlert message={message} error={error} />

      {canManage && (
        <form onSubmit={submit} className="panel p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {editingId ? `Edit Class — ${editingId}` : 'Add New Class'}
          </h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="label">Class ID</label>
              <input
                className="input font-mono"
                value={form.id}
                placeholder="Auto-generated"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="label">Class Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Assigned Teachers</label>
              {teachers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800">
                  No active teacher accounts yet. Create teachers in User Management first.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
                  {teachers.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={form.teacherIds.includes(t.id)}
                        onChange={() => toggleTeacher(t.id)}
                      />
                      <span>
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-1 text-xs text-slate-400">{t.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Teachers only see classes assigned here. Overlapping schedule for the same teacher is blocked.
              </p>
            </div>
            <div>
              <label className="label">Schedule</label>
              <input className="input" value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="Mon/Wed 9-10" />
              <p className="mt-1 text-xs text-slate-500">Use day + time like Mon/Wed 9-10 so overlaps can be detected.</p>
            </div>
            <div>
              <label className="label">Student Select</label>
              <div className="flex gap-2">
                <select
                  className="input min-w-0 flex-1"
                  value={pickStudentId}
                  onChange={(e) => setPickStudentId(e.target.value)}
                  disabled={!editingId || rosterBusy || isFormFull || availableStudents.length === 0}
                >
                  <option value="">
                    {!editingId
                      ? 'Save class first'
                      : isFormFull
                        ? 'Class full — use − to remove'
                        : availableStudents.length === 0
                          ? 'No students available'
                          : 'Select student'}
                  </option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!editingId || rosterBusy || isFormFull || !pickStudentId}
                  onClick={() => addStudentToClass(editingId, pickStudentId, setPickStudentId)}
                >
                  Add
                </Button>
              </div>
            </div>
            <div>
              <label className="label">Maximum Students</label>
              <input
                className="input"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="0/20"
              />
              {editingId && isFormFull && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Class is full. Remove a student below to add more.</p>
              )}
            </div>
          </div>

          {editingId && enrolledStudents.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                Enrolled Students ({formEnrolled}/{formCapacity.max})
              </h4>
              <ul className="space-y-2">
                {enrolledStudents.map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{student.name}</p>
                      <p className="truncate text-xs font-mono text-slate-500">{student.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={rosterBusy}
                      onClick={() => removeStudentFromClass(editingId, student.id)}
                      title="Remove student"
                    >
                      −
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Class' : 'Save Class'}
            </Button>
          </div>
        </form>
      )}

      {!canManage && rows.length === 0 && (
        <div className="panel p-6 text-sm text-slate-500">
          No classes are assigned to your account yet. Ask an Admin or School Admin to assign you in Class Management.
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={canManage ? 'No classes yet. Add your first class.' : 'No assigned classes.'}
      />

      {showDetail && (
        <ClassDetailModal
          detail={detailClass}
          students={detailStudents}
          busy={rosterBusy}
          isFull={isDetailFull}
          onClose={() => setShowDetail(false)}
        />
      )}

      <ScheduleConflictModal
        conflicts={scheduleConflicts}
        onClose={() => setScheduleConflicts(null)}
      />
    </div>
  )
}
