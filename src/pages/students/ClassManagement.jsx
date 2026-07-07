import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { id: '', name: '', instructor: '', schedule: '', capacity: '0/20' }

function parseCapacity(capacity) {
  const s = String(capacity || '0/20').trim()
  const [a, b] = s.split('/')
  return {
    enrolled: Math.max(0, parseInt(a, 10) || 0),
    max: Math.max(1, parseInt(b, 10) || parseInt(a, 10) || 20),
  }
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
          <div>
            <dt className="text-xs text-slate-500">Instructor</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{detail.instructor || '—'}</dd>
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

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          To edit class info or manage students, use <strong>Edit</strong> in the table.
        </p>
      </div>
    </div>
  )
}

export default function ClassManagement() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
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

  const load = async () => {
    try {
      const [classes, allStudents] = await Promise.all([get('/api/classes'), get('/api/students')])
      setRows(classes)
      setStudents(allStudents)
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  const loadNextId = async () => {
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
    setForm((f) => ({ ...f, capacity: data.class.capacity }))
    setRows((prev) => prev.map((r) => (r.id === classId ? data.class : r)))
    return data
  }

  const syncRoster = (classId, result) => {
    setRows((prev) => prev.map((r) => (r.id === classId ? result.class : r)))
    if (editingId === classId) {
      setForm((f) => ({ ...f, capacity: result.class.capacity }))
      setEnrolledStudents(result.students)
    }
    if (detailClass?.id === classId) {
      setDetailClass(result.class)
      setDetailStudents(result.students)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editingId) loadNextId()
  }, [editingId])

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
    await loadNextId()
  }

  const startEdit = async (row) => {
    setShowDetail(false)
    setEditingId(row.id)
    setForm({
      id: row.id,
      name: row.name || '',
      instructor: row.instructor || '',
      schedule: row.schedule || '',
      capacity: row.capacity || '0/20',
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

  const submit = async (e) => {
    e.preventDefault()
    const cap = parseCapacity(form.capacity)
    const enrolled = editingId ? enrolledStudents.length : 0
    if (editingId && enrolled > cap.max) {
      showMsg(`Capacity max (${cap.max}) cannot be less than enrolled students (${enrolled}).`, true)
      return
    }

    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        name: form.name,
        instructor: form.instructor,
        schedule: form.schedule,
        capacity: editingId ? form.capacity : `0/${cap.max}`,
      }
      if (editingId) {
        await put(`/api/classes/${editingId}`, payload)
        showMsg('Class updated successfully.')
      } else {
        await post('/api/classes', payload)
        showMsg('Class created successfully.')
      }
      reset()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const addStudentToClass = async (classId, studentId, clearPick) => {
    if (!classId || !studentId) return
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
    if (!classId || !studentId) return
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
    { key: 'instructor', label: 'Instructor' },
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
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        subtitle="Create, view, update, and delete classes"
      />

      <FormAlert message={message} error={error} />

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
          <div>
            <label className="label">Instructor</label>
            <input className="input" value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} />
          </div>
          <div>
            <label className="label">Schedule</label>
            <input className="input" value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="Mon/Wed 9-10" />
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

      <DataTable columns={columns} rows={rows} emptyMessage="No classes yet. Add your first class." />

      {showDetail && (
        <ClassDetailModal
          detail={detailClass}
          students={detailStudents}
          busy={rosterBusy}
          isFull={isDetailFull}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}
