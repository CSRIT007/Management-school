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

const EMPLOYMENT_LABELS = {
  full_time: 'Full time',
  part_time: 'Part time',
}

const emptyProfile = {
  name: '',
  email: '',
  password: '',
  phone: '',
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
  return `$${v.toFixed(2)}`
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
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      email: row.email || '',
      password: '',
      phone: row.phone || '',
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      showMsg('Name and email are required.', true)
      return
    }

    setSaving(true)
    setMessage('')
    setError(false)

    const empType = form.employmentType || ''
    const profile = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
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
        if (!form.password || form.password.length < 6) {
          showMsg('Password must be at least 6 characters.', true)
          setSaving(false)
          return
        }
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
    { key: 'id', label: 'ID', className: 'font-mono font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'position', label: 'Position', render: (r) => r.position || '—' },
    {
      key: 'employmentType',
      label: 'Type',
      render: (r) => EMPLOYMENT_LABELS[r.employmentType] || '—',
    },
    {
      key: 'pay',
      label: 'Pay',
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
      render: (r) => r.educationDegree || '—',
    },
    {
      key: 'majorSkill',
      label: 'Major / Skill',
      render: (r) => r.majorSkill || '—',
    },
    ...(isStaff
      ? [{
          key: 'role',
          label: 'Role',
          render: (r) => ROLE_LABELS[r.role] || r.role,
        }]
      : []),
    {
      key: 'hireDate',
      label: 'Hire Date',
      render: (r) => (r.hireDate ? formatDisplayDate(r.hireDate) : '—'),
    },
    {
      key: 'active',
      label: 'Status',
      render: (r) => (
        <Badge variant={r.active !== false ? 'success' : 'danger'}>
          {r.active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
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

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit — ${editingId}` : `Add ${isStaff ? 'Staff' : 'Teacher'}`}
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Email (login)</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="012 345 678"
            />
          </div>
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
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <textarea
              className="input min-h-[80px]"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
          {!editingId ? (
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
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
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
          </Button>
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
