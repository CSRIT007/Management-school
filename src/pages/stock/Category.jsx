import { useEffect, useState } from 'react'
import { get, post, del } from '../../lib/api.js'

export default function CategoryManagement() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async () => setItems(await get('/api/categories'))
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!name.trim()) return
    await post('/api/categories', { name: name.trim(), description })
    setName(''); setDescription('')
    await load()
  }

  const remove = async (id) => { await del(`/api/categories/${id}`); await load() }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <h3 className="font-semibold mb-4 text-[#4361ee]">Add New Category</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="Books" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" rows={3} placeholder="Optional" />
          </div>
          <button onClick={add} className="w-full py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>Add Category</button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Existing Categories</h3>
        <ul className="divide-y divide-gray-100">
          {items.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <div className="flex gap-2">
                <button onClick={() => remove(c.id)} className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-red-50 text-red-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
