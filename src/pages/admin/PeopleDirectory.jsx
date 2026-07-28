import { useEffect, useMemo, useState } from 'react'
import { get, post, put } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_LABELS, ROLES } from '../../lib/roles.js'
import { formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DateField from '../../components/ui/DateField.jsx'
import { formatMoney as formatMoneyDisplay } from '../../lib/moneyFormat.js'

const EMPLOYMENT_LABELS = {
  full_time: 'Full time',
  part_time: 'Part time',
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

const PHONE_PREFIX = '+855'

const FORM_STEPS = [
  { id: 'personal', label: 'Personal Info', short: '1' },
  { id: 'education', label: 'Education Info', short: '2' },
  { id: 'other', label: 'Other', short: '3' },
]

const emptyProfile = {
  firstName: '',
  lastName: '',
  gender: '',
  email: '',
  password: '',
  phoneLocal: '',
  dob: '',
  address: '',
  position: '',
  department: '',
  hireDate: '',
  note: '',
  role: '',
  active: true,
  employmentType: '',
  salary: '',
  hourlyRate: '',
  educationDegree: '',
  majorSkill: '',
}

function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return '—'
  return formatMoneyDisplay(v)
}

function fullName(firstName, lastName) {
  return [firstName, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ')
}

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

/**
 * Shared directory form for Teacher Info / Staff Info.
 * @param {{ kind: 'teachers' | 'staff', title: string, subtitle: string, defaultRole: string, roleOptions?: {value:string,label:string}[] }}
 */
export default function PeopleDirectory({
  kind,
  title,
  subtitle,
  defaultRole,
  roleOptions = null,
}) {
  const { user: currentUser, role: actorRole } = useAuth()
  const listUrl = `/api/people/${kind}`
  const isStaff = kind === 'staff'

  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ ...emptyProfile, role: defaultRole })
  const [editingId, setEditingId] = useState(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [step, setStep] = useState(0)

  const selectableRoles = useMemo(() => {
    if (!roleOptions) return null
    if (actorRole === ROLES.ADMIN) return roleOptions
    return roleOptions.filter((o) => o.value !== ROLES.ADMIN)
  }, [roleOptions, actorRole])

  const load = async () => {
    try {
      setRows(await get(listUrl))
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  useEffect(() => { load() }, [listUrl])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = () => {
    setForm({ ...emptyProfile, role: defaultRole })
    setEditingId(null)
    setPassword('')
    setMessage('')
    setError(false)
    setStep(0)
  }

  const canEditRow = (row) => {
    if (actorRole === ROLES.ADMIN) return true
    return row.role !== ROLES.ADMIN
  }

  const startEdit = (row) => {
    if (!canEditRow(row)) {
      showMsg('Only Admin can edit Admin accounts.', true)
      return
    }
    const fromParts = {
      firstName: row.firstName || '',
      lastName: row.lastName || '',
    }
    if (!fromParts.firstName && !fromParts.lastName) {
      Object.assign(fromParts, splitLegacyName(row.name))
    }
    setEditingId(row.id)
    setForm({
      firstName: fromParts.firstName,
      lastName: fromParts.lastName,
      gender: row.gender || '',
      email: row.email || '',
      password: '',
      phoneLocal: toPhoneLocal(row.phone),
      dob: row.dob || '',
      address: row.address || '',
      position: row.position || '',
      department: row.department || '',
      hireDate: row.hireDate || '',
      note: row.note || '',
      role: row.role || defaultRole,
      active: row.active !== false,
      employmentType: row.employmentType || '',
      salary: row.salary ? String(row.salary) : '',
      hourlyRate: row.hourlyRate ? String(row.hourlyRate) : '',
      educationDegree: row.educationDegree || '',
      majorSkill: row.majorSkill || '',
    })
    setPassword('')
    setMessage('')
    setError(false)
    setStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        showMsg('First name and last name are required.', true)
        return false
      }
      if (!form.gender) {
        showMsg('Gender is required.', true)
        return false
      }
      if (!form.email.trim()) {
        showMsg('Email is required.', true)
        return false
      }
      if (!form.email.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        showMsg('Enter a valid email address with @.', true)
        return false
      }
      const phoneLocal = toPhoneLocal(form.phoneLocal)
      if (phoneLocal && !/^\d{7,10}$/.test(phoneLocal)) {
        showMsg('Phone: enter 7–10 digits after +855 (no leading 0).', true)
        return false
      }
      return true
    }
    if (stepIndex === 1) {
      // Education optional — allow continue
      return true
    }
    if (stepIndex === 2) {
      if (!editingId && (!form.password || form.password.length < 6)) {
        showMsg('Password must be at least 6 characters.', true)
        return false
      }
      if (editingId && password.trim() && password.trim().length < 6) {
        showMsg('Password must be at least 6 characters.', true)
        return false
      }
      return true
    }
    return true
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setMessage('')
    setError(false)
    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1))
  }

  const goBack = () => {
    setMessage('')
    setError(false)
    setStep((s) => Math.max(s - 1, 0))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (step !== FORM_STEPS.length - 1) {
      goNext()
      return
    }
    for (let i = 0; i < FORM_STEPS.length; i += 1) {
      if (!validateStep(i)) {
        setStep(i)
        return
      }
    }

    setSaving(true)
    setMessage('')
    setError(false)

    const empType = form.employmentType || ''
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const profile = {
      firstName,
      lastName,
      name: fullName(firstName, lastName),
      gender: form.gender,
      email: form.email.trim(),
      phone: formatPhoneSave(form.phoneLocal),
      dob: form.dob || '',
      address: form.address.trim(),
      position: form.position.trim(),
      department: form.department.trim(),
      hireDate: form.hireDate || '',
      note: form.note.trim(),
      active: form.active,
      employmentType: empType,
      salary: empType === 'full_time' ? Number(form.salary) || 0 : 0,
      hourlyRate: empType === 'part_time' ? Number(form.hourlyRate) || 0 : 0,
      educationDegree: form.educationDegree.trim(),
      majorSkill: form.majorSkill.trim(),
    }
    if (isStaff) profile.role = form.role || defaultRole

    try {
      if (editingId) {
        if (password.trim()) profile.password = password.trim()
        await put(`${listUrl}/${editingId}`, profile)
        const okMsg = password.trim() ? 'Updated and password reset.' : 'Updated successfully.'
        reset()
        showMsg(okMsg)
      } else {
        await post(listUrl, { ...profile, password: form.password })
        const okMsg = `${isStaff ? 'Staff' : 'Teacher'} saved successfully.`
        reset()
        showMsg(okMsg)
      }
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'whitespace-nowrap font-mono font-semibold text-slate-900 dark:text-slate-100' },
    {
      key: 'name',
      label: 'Full Name',
      className: 'whitespace-nowrap',
      render: (r) => r.name || fullName(r.firstName, r.lastName) || '—',
    },
    { key: 'gender', label: 'Gender', className: 'whitespace-nowrap', render: (r) => r.gender || '—' },
    { key: 'email', label: 'Email', className: 'whitespace-nowrap' },
    { key: 'phone', label: 'Phone', className: 'whitespace-nowrap', render: (r) => r.phone || '—' },
    {
      key: 'dob',
      label: 'Date of Birth',
      className: 'whitespace-nowrap',
      render: (r) => (r.dob ? formatDisplayDate(r.dob) : '—'),
    },
    { key: 'position', label: 'Position', className: 'whitespace-nowrap', render: (r) => r.position || '—' },
    {
      key: 'employmentType',
      label: 'Type',
      className: 'whitespace-nowrap',
      render: (r) => EMPLOYMENT_LABELS[r.employmentType] || '—',
    },
    {
      key: 'pay',
      label: 'Pay',
      className: 'whitespace-nowrap',
      render: (r) => {
        if (r.employmentType === 'full_time') return formatMoney(r.salary)
        if (r.employmentType === 'part_time') {
          const v = formatMoney(r.hourlyRate)
          return v === '—' ? '—' : `${v}/hr`
        }
        return '—'
      },
    },
    {
      key: 'educationDegree',
      label: 'Degree',
      className: 'whitespace-nowrap',
      render: (r) => r.educationDegree || '—',
    },
    {
      key: 'majorSkill',
      label: 'Major / Skill',
      cellClassName: 'max-w-[10rem] break-words line-clamp-2',
      render: (r) => r.majorSkill || '—',
    },
    ...(isStaff
      ? [{
          key: 'role',
          label: 'Role',
          className: 'whitespace-nowrap',
          render: (r) => ROLE_LABELS[r.role] || r.role,
        }]
      : []),
    {
      key: 'hireDate',
      label: 'Hire Date',
      className: 'whitespace-nowrap',
      render: (r) => (r.hireDate ? formatDisplayDate(r.hireDate) : '—'),
    },
    {
      key: 'active',
      label: 'Status',
      className: 'whitespace-nowrap',
      render: (r) => (
        <Badge variant={r.active !== false ? 'success' : 'danger'}>
          {r.active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'whitespace-nowrap text-right',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={!canEditRow(row)}
          onClick={() => startEdit(row)}
        >
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <FormAlert message={message} error={error} />

      <form
        onSubmit={submit}
        className="panel p-6"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && step < FORM_STEPS.length - 1) {
            e.preventDefault()
            goNext()
          }
        }}
      >
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit — ${editingId}` : `Add ${isStaff ? 'Staff' : 'Teacher'}`}
        </h3>

        {/* Left → right sections */}
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          {FORM_STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (i <= step) setStep(i)
                  else if (i === step + 1 && validateStep(step)) {
                    setMessage('')
                    setError(false)
                    setStep(i)
                  }
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
              <label className="label">First Name <span className="text-rose-500">*</span></label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="label">Last Name <span className="text-rose-500">*</span></label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="label">Gender <span className="text-rose-500">*</span></label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Email (login) <span className="text-rose-500">*</span></label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {PHONE_PREFIX}
                </span>
                <input
                  value={form.phoneLocal}
                  onChange={(e) => setForm((f) => ({ ...f, phoneLocal: toPhoneLocal(e.target.value) }))}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none dark:text-slate-100"
                  placeholder="12 345 678"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>
            </div>
            <div>
              <DateField
                label="Date of Birth"
                value={form.dob}
                onChange={(dob) => setForm((f) => ({ ...f, dob }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="label">Degree of Education</label>
              <input
                className="input"
                value={form.educationDegree}
                onChange={(e) => setForm((f) => ({ ...f, educationDegree: e.target.value }))}
                placeholder="e.g. Bachelor, Master, PhD"
              />
            </div>
            <div>
              <label className="label">Major / Skill</label>
              <input
                className="input"
                value={form.majorSkill}
                onChange={(e) => setForm((f) => ({ ...f, majorSkill: e.target.value }))}
                placeholder={isStaff ? 'e.g. Accounting, HR' : 'e.g. Mathematics, English'}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="label">Position / Title</label>
              <input
                className="input"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder={isStaff ? 'Office Manager' : 'Math Teacher'}
              />
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder={isStaff ? 'Administration' : 'Academics'}
              />
            </div>
            <div>
              <DateField
                label="Hire Date"
                value={form.hireDate}
                onChange={(hireDate) => setForm((f) => ({ ...f, hireDate }))}
              />
            </div>
            <div>
              <label className="label">Employment Type</label>
              <select
                className="input"
                value={form.employmentType}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  employmentType: e.target.value,
                  salary: e.target.value === 'full_time' ? f.salary : '',
                  hourlyRate: e.target.value === 'part_time' ? f.hourlyRate : '',
                }))}
              >
                <option value="">Select type</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
              </select>
            </div>

            {form.employmentType === 'full_time' && (
              <div>
                <label className="label">Salary ($ / month)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}

            {form.employmentType === 'part_time' && (
              <div>
                <label className="label">Amount / Hour ($)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}

            {isStaff && selectableRoles && (
              <div>
                <label className="label">Staff Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {selectableRoles.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
                disabled={editingId === currentUser?.id}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            {!editingId ? (
              <div>
                <label className="label">Password <span className="text-rose-500">*</span></label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={6}
                  placeholder="Min. 6 characters"
                />
              </div>
            ) : (
              <div>
                <label className="label">Reset Password (optional)</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="Leave blank to keep current"
                />
              </div>
            )}
            <div className={isStaff ? 'md:col-span-2' : ''}>
              <label className="label">Note</label>
              <textarea
                className={`input resize-y ${isStaff ? 'min-h-[80px]' : 'min-h-[42px]'}`}
                rows={isStaff ? 3 : 1}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={goBack}>
                Back
              </Button>
            )}
            {step < FORM_STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={`No ${isStaff ? 'staff' : 'teachers'} yet.`}
      />
    </div>
  )
}
