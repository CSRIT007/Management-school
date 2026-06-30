import { useEffect, useState } from 'react'
import { get, post, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'

export default function CategoryManagement() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async () => setItems(await get('/api/categories'))
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!name.trim()) return
    await post('/api/categories', { name: name.trim(), description })
    setName('')
    setDescription('')
    await load()
  }

  const remove = async (id) => {
    await del(`/api/categories/${id}`)
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        subtitle="Organize products into categories"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-1">
          <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-100">Add New Category</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Category Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Books" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" rows={3} placeholder="Optional description" />
            </div>
            <Button onClick={add} className="w-full">Add Category</Button>
          </div>
        </div>

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
                    {c.description && <div className="text-sm text-slate-500 dark:text-slate-400">{c.description}</div>}
                  </div>
                </div>
                <Button size="sm" variant="danger" onClick={() => remove(c.id)}>Delete</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
