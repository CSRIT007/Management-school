import { useEffect, useMemo, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import DateField from '../../components/ui/DateField.jsx'

const emptyForm = { studentId: '', name: '', program: '', date: '', grade: '', cert: false }

function studentLabel(s) {
  const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || '—'
  return `${s.id} — ${name}`
}

function sameStudentProgram(row, studentId, program) {
  const sid = String(studentId || '').trim()
  const rowSid = String(row.studentId || '').trim()
  if (!sid || !rowSid || sid !== rowSid) return false

  const prog = String(program || '').trim().toLowerCase()
  const rowProg = String(row.program || '').trim().toLowerCase()
  return Boolean(prog && rowProg === prog)
}

/** Find existing graduation for same student ID + program (optional exclude editing id). */
function findExistingFinish(rows, { studentId, program, excludeId }) {
  return rows.find((r) => {
    if (excludeId && r.id === excludeId) return false
    return sameStudentProgram(r, studentId, program)
  }) || null
}

export default function StudentFinish() {
  const { t } = useLanguage()
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const [a, s] = await Promise.all([get('/api/alumni'), get('/api/students')])
      setRows(a)
      setStudents(s)
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  useEffect(() => { load() }, [])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.studentId) || null,
    [students, form.studentId]
  )

  const existingFinish = useMemo(
    () => findExistingFinish(rows, {
      studentId: form.studentId,
      program: form.program,
      excludeId: editingId,
    }),
    [rows, form.studentId, form.program, editingId]
  )

  const certificateIssued = Boolean(existingFinish?.cert)
  const missingProgram = Boolean(form.studentId && !String(form.program || '').trim())
  const blockSave = missingProgram || certificateIssued || (!editingId && !!existingFinish)

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
    setMessage('')
    setError(false)
  }

  const warnIfBlocked = (studentId, name, program, excludeId = null) => {
    if (!studentId || !program) {
      setMessage('')
      setError(false)
      return
    }
    const existing = findExistingFinish(rows, { studentId, program, excludeId })
    if (!existing) {
      setMessage('')
      setError(false)
      return
    }
    if (existing.cert) {
      showMsg(
        `Certificate already issued for ${name} · ${program} (${studentId}). Re-issue is not allowed.`,
        true
      )
      return
    }
    if (!excludeId) {
      showMsg(
        `A graduation record already exists for ${name} · ${program} (${studentId}). Edit that record instead.`,
        true
      )
    }
  }

  const onSelectStudent = (studentId) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      setForm((f) => ({ ...f, studentId: '', name: '', program: '' }))
      return
    }
    const name = student.name || [student.firstName, student.lastName].filter(Boolean).join(' ')
    const program = String(student.program || '').trim()
    setForm((f) => ({
      ...f,
      studentId: student.id,
      name,
      program,
      // Cannot request a new issued cert when one already exists
      cert: false,
    }))
    if (!program) {
      showMsg(
        `${name} has no program on Student Register. Update their program first, then finish them.`,
        true
      )
      return
    }
    warnIfBlocked(student.id, name, program, editingId)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    const match = (row.studentId && students.find((s) => s.id === row.studentId))
      || students.find((s) => s.name === row.name)
      || students.find((s) => {
        const full = [s.firstName, s.lastName].filter(Boolean).join(' ')
        return full && full === row.name
      })
    const programFromStudent = match ? String(match.program || '').trim() : ''
    const studentId = match?.id || row.studentId || ''
    const name = row.name || ''
    const program = programFromStudent || row.program || ''
    setForm({
      studentId,
      name,
      program,
      date: row.date || '',
      grade: row.grade || '',
      cert: !!row.cert,
    })
    if (match && !programFromStudent && !row.program) {
      showMsg(
        `${row.name} has no program on Student Register. Update their program first.`,
        true
      )
    } else {
      // Editing the issued record itself is allowed; warn only if ANOTHER issued exists
      warnIfBlocked(studentId, name, program, row.id)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.studentId) {
      showMsg('Select a student.', true)
      return
    }
    if (!form.name.trim()) {
      showMsg('Select a student.', true)
      return
    }
    if (!String(form.program || '').trim()) {
      showMsg(
        'This student has no program. Set their program in Student Register before saving graduation.',
        true
      )
      return
    }
    if (certificateIssued) {
      showMsg(
        `Certificate already issued for ${form.name} · ${form.program} (${form.studentId}). Re-issue is not allowed.`,
        true
      )
      return
    }
    if (!editingId && existingFinish) {
      showMsg(
        `A graduation record already exists for ${form.name} · ${form.program} (${form.studentId}). Edit that record instead.`,
        true
      )
      return
    }
    if (!form.date) {
      showMsg('Completion date is required.', true)
      return
    }
    if (!form.grade) {
      showMsg('Final grade is required.', true)
      return
    }

    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        studentId: form.studentId || '',
        name: form.name.trim(),
        program: form.program.trim(),
        date: form.date,
        grade: form.grade,
        cert: form.cert === true || form.cert === 'true',
      }
      if (editingId) {
        await put(`/api/alumni/${editingId}`, payload)
        showMsg('Graduation record updated successfully.')
      } else {
        await post('/api/alumni', payload)
        showMsg('Graduation record saved successfully.')
      }
      reset()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this graduation record?')) return
    try {
      await del(`/api/alumni/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Record deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    {
      key: 'studentId',
      label: t('table.studentId'),
      className: 'whitespace-nowrap font-mono text-sm',
      render: (r) => r.studentId || '—',
    },
    { key: 'name', label: t('table.studentName'), className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'program', label: t('table.programCompleted') },
    { key: 'date', label: t('table.completionDate'), render: (r) => formatDisplayDate(r.date) },
    { key: 'grade', label: t('table.finalGrade') },
    {
      key: 'cert',
      label: t('table.certificate'),
      render: (r) => <Badge variant={r.cert ? 'success' : 'neutral'}>{r.cert ? 'Issued' : t('common.pending')}</Badge>,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>{t('common.edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>{t('common.delete')}</Button>
        </div>
      ),
    },
  ]

  const editingIssuedSelf = Boolean(editingId && rows.find((r) => r.id === editingId)?.cert)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.finish.title')}
        subtitle={t('students.finish.subtitle')}
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? 'Edit Graduation Record' : 'Add Graduation Record'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Student <span className="text-rose-500">*</span></label>
            <select
              className="input"
              value={form.studentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              required
              disabled={editingIssuedSelf}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{studentLabel(s)}</option>
              ))}
            </select>
            {editingIssuedSelf && (
              <p className="mt-1 text-xs text-slate-400">
                Certificate issued — student/program locked; re-issue not allowed.
              </p>
            )}
          </div>
          <div>
            <label className="label">Program Completed <span className="text-rose-500">*</span></label>
            <input
              className="input bg-slate-50 dark:bg-slate-800/60"
              value={form.program}
              readOnly
              required
              placeholder={form.studentId ? 'No program on student record' : 'Select a student first'}
            />
            {selectedStudent && form.program && (
              <p className="mt-1 text-xs text-slate-400">
                From Student Register · {selectedStudent.id}
              </p>
            )}
            {missingProgram && (
              <p className="mt-1 text-xs text-rose-500">
                Missing program — fix this student in Student Register.
              </p>
            )}
            {certificateIssued && (
              <p className="mt-1 text-xs text-rose-500">
                Certificate already issued for this student + program. Re-issue is not allowed.
              </p>
            )}
          </div>
          <DateField label="Completion Date" value={form.date} onChange={(date) => setForm((f) => ({ ...f, date }))} required />
          <div>
            <label className="label">Final Grade</label>
            <select className="input" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} required>
              <option value="">Final grade</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
            </select>
          </div>
          <div>
            <label className="label">Certificate</label>
            <select
              className="input"
              value={form.cert ? 'true' : 'false'}
              onChange={(e) => setForm((f) => ({ ...f, cert: e.target.value === 'true' }))}
              disabled={certificateIssued}
            >
              <option value="false">Certificate pending</option>
              <option value="true">Certificate issued</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving || (blockSave && !editingIssuedSelf)}>
            {saving ? t('common.saving') : editingId ? 'Update Record' : 'Save Record'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} emptyMessage="No graduation records yet." />
    </div>
  )
}
