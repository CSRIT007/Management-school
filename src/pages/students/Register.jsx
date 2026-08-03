import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { formatDisplayDate, formatDisplayDateTime, isValidIsoDate } from '../../lib/dateFormat.js'
import DateField from '../../components/ui/DateField.jsx'
import ProgramCourseField from './components/ProgramCourseField.jsx'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import {
  STUDENT_EXPORT_COLUMNS,
  STUDENT_FILTER_INITIAL,
  STUDENT_REPORT_TITLE,
  filterStudents,
  downloadStudentRegisterCsv,
} from '../../lib/exports/studentRegisterExport.js'

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

const PHONE_PREFIX = '+855'

const FORM_STEPS = [
  { id: 'personal', label: 'Personal Info', short: '1' },
  { id: 'program', label: 'Program / Course', short: '2' },
]

const emptyForm = {
  firstName: '',
  lastName: '',
  gender: '',
  email: '',
  phoneLocal: '',
  address: '',
  dob: '',
  emergency: '',
  program: '',
}

function fullName(firstName, lastName) {
  return [firstName, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ')
}

/** Digits after +855; strip country code and leading zeros. */
function toPhoneLocal(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('855')) digits = digits.slice(3)
  return digits.replace(/^0+/, '')
}

function formatPhoneSave(local) {
  const digits = toPhoneLocal(local)
  return digits ? `${PHONE_PREFIX}${digits}` : ''
}

function splitLegacyName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const i = trimmed.indexOf(' ')
  if (i < 0) return { firstName: trimmed, lastName: '' }
  return { firstName: trimmed.slice(0, i), lastName: trimmed.slice(i + 1).trim() }
}

function validatePersonal(form) {
  const errors = {}
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  const email = form.email.trim()
  const dob = form.dob.trim()
  const gender = form.gender.trim()
  const phoneLocal = toPhoneLocal(form.phoneLocal)

  if (!firstName) errors.firstName = 'First name is required.'
  if (!lastName) errors.lastName = 'Last name is required.'
  if (!gender) errors.gender = 'Gender is required.'
  if (!email) errors.email = 'Email is required.'
  else if (!email.includes('@')) errors.email = 'Email must include @.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (phoneLocal && !/^\d{7,10}$/.test(phoneLocal)) {
    errors.phoneLocal = 'Enter 7–10 digits after +855 (no leading 0).'
  }
  if (!dob) errors.dob = 'Date of birth is required.'
  else if (!isValidIsoDate(dob)) errors.dob = 'Use date format dd-mm-yyyy.'

  return errors
}

export default function StudentRegister() {
  const { t } = useLanguage()
  const [form, setForm] = useState(emptyForm)
  const [students, setStudents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [programs, setPrograms] = useState([])
  const [step, setStep] = useState(0)

  const load = async () => {
    try {
      setStudents(await get('/api/students'))
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  const loadPrograms = async () => {
    try {
      const rows = await get('/api/programs')
      const names = [...new Set(rows.map((p) => p.name).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
      setPrograms(names)
    } catch {
      setPrograms([
        'Computer Science',
        'Business Administration',
        'Design',
        'Microsoft Office',
      ])
    }
  }

  useEffect(() => { load(); loadPrograms() }, [])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
    setMessage('')
    setError(false)
    setFieldErrors({})
    setStep(0)
  }

  const startCreate = () => {
    reset()
  }

  const startEdit = (student) => {
    const fromParts = {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
    }
    if (!fromParts.firstName && !fromParts.lastName) {
      Object.assign(fromParts, splitLegacyName(student.name))
    }
    setEditingId(student.id)
    setForm({
      firstName: fromParts.firstName,
      lastName: fromParts.lastName,
      gender: student.gender || '',
      email: student.email || '',
      phoneLocal: toPhoneLocal(student.phone),
      address: student.address || '',
      dob: student.dob || '',
      emergency: student.emergency || '',
      program: student.program || '',
    })
    setMessage('')
    setError(false)
    setFieldErrors({})
    setStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const onPhoneLocalChange = (raw) => {
    const cleaned = toPhoneLocal(raw)
    setForm((f) => ({ ...f, phoneLocal: cleaned }))
    clearFieldError('phoneLocal')
  }

  const goNext = () => {
    const errors = validatePersonal(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showMsg('Please complete personal info before continuing.', true)
      return
    }
    setFieldErrors({})
    setMessage('')
    setError(false)
    setStep(1)
  }

  const goBack = () => {
    setMessage('')
    setError(false)
    setStep(0)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (step === 0) {
      goNext()
      return
    }

    const errors = validatePersonal(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setStep(0)
      showMsg('Please fill in all required fields before saving.', true)
      return
    }

    setSaving(true)
    setMessage('')
    setError(false)
    setFieldErrors({})
    try {
      const firstName = form.firstName.trim()
      const lastName = form.lastName.trim()
      const payload = {
        firstName,
        lastName,
        name: fullName(firstName, lastName),
        gender: form.gender.trim(),
        email: form.email.trim().toLowerCase(),
        phone: formatPhoneSave(form.phoneLocal),
        address: form.address,
        dob: form.dob,
        emergency: form.emergency,
        program: form.program,
      }
      if (editingId) {
        await put(`/api/students/${editingId}`, payload)
        showMsg('Student updated successfully.')
      } else {
        await post('/api/students', payload)
        showMsg('Student registered successfully.')
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
    if (!confirm(`Delete student ${id}?`)) return
    try {
      await del(`/api/students/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Student deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const addProgram = async (name) => {
    await post('/api/programs', { name })
    await loadPrograms()
  }

  const programOptions = useMemo(() => {
    const names = new Set(programs)
    if (form.program?.trim()) names.add(form.program.trim())
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [programs, form.program])

  const programFilterOptions = useMemo(() => {
    const names = [...new Set(students.map((s) => s.program).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    )
    return names
  }, [students])

  // Newest registrations first (Date Created DESC)
  const studentsNewestFirst = useMemo(() => {
    return [...students].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (tb !== ta) return tb - ta
      return String(b.id || '').localeCompare(String(a.id || ''))
    })
  }, [students])

  const columns = [
    {
      key: 'id',
      label: t('table.studentId'),
      className: 'whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100',
    },
    {
      key: 'name',
      label: t('common.fullName'),
      className: 'whitespace-nowrap',
      render: (r) => r.name || fullName(r.firstName, r.lastName) || '—',
    },
    { key: 'gender', label: t('table.gender'), className: 'whitespace-nowrap', render: (r) => r.gender || '—' },
    { key: 'email', label: t('common.email'), className: 'whitespace-nowrap' },
    { key: 'phone', label: t('common.phone'), className: 'whitespace-nowrap', render: (r) => r.phone || '—' },
    {
      key: 'program',
      label: t('table.program'),
      cellClassName: 'max-w-[11rem] break-words line-clamp-2',
    },
    {
      key: 'dob',
      label: t('table.dob'),
      className: 'whitespace-nowrap',
      render: (r) => formatDisplayDate(r.dob),
    },
    {
      key: 'createdAt',
      label: t('table.dateCreated'),
      className: 'whitespace-nowrap text-slate-600 dark:text-slate-300',
      render: (r) => formatDisplayDateTime(r.createdAt),
    },
    {
      key: 'actions',
      label: '',
      className: 'whitespace-nowrap text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>{t('common.edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>{t('common.delete')}</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.register.title')}
        subtitle={t('students.register.subtitle')}
        actions={!editingId && <Button variant="secondary" onClick={startCreate}>New Student</Button>}
      />

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
          {message}
        </div>
      )}

      <form
        onSubmit={submit}
        className="panel p-6"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && step === 0) {
            e.preventDefault()
            goNext()
          }
        }}
      >
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Student — ${editingId}` : 'Register New Student'}
        </h3>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Fields marked with <span className="text-rose-500">*</span> are required. Student ID is created automatically.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3">
          {FORM_STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (i <= step) setStep(i)
                  else if (i === 1) goNext()
                }}
                className={[
                  'rounded-xl border px-2 py-3 text-left transition-colors sm:px-4',
                  active
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
                    : done
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      active
                        ? 'bg-indigo-600 text-white'
                        : done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {done ? '✓' : s.short}
                  </span>
                  <span
                    className={[
                      'text-xs font-semibold sm:text-sm',
                      active
                        ? 'text-indigo-800 dark:text-indigo-200'
                        : done
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-slate-500 dark:text-slate-400',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="label">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.firstName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                  clearFieldError('firstName')
                }}
                className={`input ${fieldErrors.firstName ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                placeholder="Jane"
              />
              {fieldErrors.firstName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="label">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.lastName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                  clearFieldError('lastName')
                }}
                className={`input ${fieldErrors.lastName ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                placeholder="Doe"
              />
              {fieldErrors.lastName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.lastName}</p>}
            </div>
            <div>
              <label className="label">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                className={`input ${fieldErrors.gender ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                value={form.gender}
                onChange={(e) => {
                  setForm((f) => ({ ...f, gender: e.target.value }))
                  clearFieldError('gender')
                }}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.gender && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.gender}</p>}
            </div>
            <div>
              <label className="label">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }))
                  clearFieldError('email')
                }}
                className={`input ${fieldErrors.email ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                placeholder="name@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="label">Phone Number</label>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {PHONE_PREFIX}
                </span>
                <input
                  value={form.phoneLocal}
                  onChange={(e) => onPhoneLocalChange(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none dark:text-slate-100"
                  placeholder="12 345 678"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>
              {fieldErrors.phoneLocal && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.phoneLocal}</p>}
            </div>
            <DateField
              label="Date of Birth *"
              value={form.dob}
              onChange={(dob) => {
                setForm((f) => ({ ...f, dob }))
                clearFieldError('dob')
              }}
              error={fieldErrors.dob}
            />
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" placeholder="Street, City" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Emergency Contact</label>
              <input value={form.emergency} onChange={(e) => setForm((f) => ({ ...f, emergency: e.target.value }))} className="input" placeholder="Name & Phone" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-5">
            <ProgramCourseField
              value={form.program}
              onChange={(program) => setForm((f) => ({ ...f, program }))}
              programs={programOptions}
              onAdd={addProgram}
            />
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={reset}>{t('common.cancel')}</Button>
          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={goBack}>
                Back
              </Button>
            )}
            {step === 0 ? (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : editingId ? 'Update Student' : 'Register Student'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <div>
        <TableExportHeader title={STUDENT_REPORT_TITLE} count={studentsNewestFirst.length}>
          <ExportReportButton
            reportTitle={STUDENT_REPORT_TITLE}
            modalTitle="Export Register Students"
            description="Choose columns and filter by program before downloading."
            columnDefs={STUDENT_EXPORT_COLUMNS}
            filters={{
              initialState: STUDENT_FILTER_INITIAL,
              render: (state, setState) => (
                <div>
                  <label className="label">Program / Course</label>
                  <select
                    className="input"
                    value={state.program}
                    onChange={(e) => setState((s) => ({ ...s, program: e.target.value }))}
                  >
                    <option value="all">All programs</option>
                    {programFilterOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              ),
            }}
            getRows={(filterState) => filterStudents(studentsNewestFirst, filterState)}
            onDownload={downloadStudentRegisterCsv}
            disabled={studentsNewestFirst.length === 0}
            size="sm"
          />
        </TableExportHeader>
        <DataTable columns={columns} rows={studentsNewestFirst} emptyMessage="No students registered yet." />
      </div>
    </div>
  )
}
