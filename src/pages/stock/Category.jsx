import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { id: '', name: '', description: '' }

export default function CategoryManagement() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setItems(await get('/api/categories'))
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
    setMessage('')
    setError(false)
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setForm({ id: c.id, name: c.name || '', description: c.description || '' })
    setMessage('')
    setError(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = { name: form.name.trim(), description: form.description }
      if (editingId) {
        await put(`/api/categories/${editingId}`, payload)
        showMsg('Category updated successfully.')
      } else {
        if (form.id.trim()) payload.id = form.id.trim().toUpperCase()
        await post('/api/categories', payload)
        showMsg('Category added successfully.')
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
    if (!confirm(`Delete category ${id}?`)) return
    try {
      await del(`/api/categories/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Category deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        subtitle="Create, view, update, and delete product categories"
      />

      <FormAlert message={message} error={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="panel p-6 lg:col-span-1">
          <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-100">
            {editingId ? `Edit Category` : 'Add New Category'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Category ID</label>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
                className="input"
                placeholder="Auto-generated if empty"
                disabled={!!editingId}
                readOnly={!!editingId}
              />
            </div>
            <div>
              <label className="label">Category Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Books" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input resize-none" rows={3} placeholder="Optional description" />
            </div>
            <div className="flex gap-2">
              {editingId && <Button type="button" variant="secondary" onClick={reset} className="flex-1">Cancel</Button>}
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Category'}
              </Button>
            </div>
          </div>
        </form>

        <div className="panel lg:col-span-2">
          <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Existing Categories</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{items.length} categories</p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 && (
              <li className="px-6 py-12 text-center text-sm text-slate-400">No categories yet</li>
            )}
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.id}</div>
                    {c.description && <div className="text-sm text-slate-500 dark:text-slate-400">{c.description}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(c)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(c.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
