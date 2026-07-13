import { useEffect, useState } from 'react'
import { get, post, put } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_LABELS, ROLE_OPTIONS } from '../../lib/roles.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'
import Badge from '../../components/ui/Badge.jsx'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'teacher',
  active: true,
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setRows(await get('/api/users'))
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setError(isError)
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
    setPassword('')
    setMessage('')
    setError(false)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      email: row.email || '',
      password: '',
      role: row.role || 'teacher',
      active: row.active !== false,
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

    try {
      if (editingId) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          active: form.active,
        }
        if (password.trim()) payload.password = password.trim()
        await put(`/api/users/${editingId}`, payload)
        showMsg(password.trim() ? 'User updated and password reset.' : 'User updated successfully.')
      } else {
        if (!form.password || form.password.length < 6) {
          showMsg('Password must be at least 6 characters.', true)
          setSaving(false)
          return
        }
        await post('/api/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          active: form.active,
        })
        showMsg('User created successfully.')
      }
      reset()
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'User ID', className: 'font-mono font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (r) => ROLE_LABELS[r.role] || r.role,
    },
    {
      key: 'active',
      label: 'Status',
      render: (r) => (
        <Badge variant={r.active ? 'success' : 'neutral'}>
          {r.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create accounts and assign roles: Admin, School Admin, Finance, Teacher"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit User — ${editingId}` : 'Add New User'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.active ? 'active' : 'inactive'}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'active' }))}
              disabled={editingId === currentUser?.id}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">
              {editingId ? 'New Password (optional)' : 'Password'}
            </label>
            <input
              type="password"
              className="input"
              value={editingId ? password : form.password}
              onChange={(e) =>
                editingId
                  ? setPassword(e.target.value)
                  : setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={editingId ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
              required={!editingId}
              minLength={editingId ? undefined : 6}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          System Users ({rows.length})
        </h3>
        <DataTable columns={columns} rows={rows} emptyMessage="No users yet." />
      </div>
    </div>
  )
}
