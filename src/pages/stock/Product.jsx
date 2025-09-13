import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', cost: '', stock: '', sku: '' })

  const load = async () => {
    const [p, c] = await Promise.all([get('/api/products'), get('/api/categories')])
    setProducts(p); setCategories(c)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const body = { ...form, price: +form.price || 0, cost: +form.cost || 0, stock: +form.stock || 0 }
    await post('/api/products', body)
    setForm({ name: '', description: '', category: '', price: '', cost: '', stock: '', sku: '' })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4361ee]">Product Management</h2>
        <button onClick={save} className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>Add New Product</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Product ID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Category</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2 font-medium">{p.id}</td>
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.category}</td>
                <td className="py-2">{p.stock}</td>
                <td className="py-2">${Number(p.price || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Add Product</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <input placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5 bg-white">
            <option value="">Category</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <input placeholder="Cost" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <input placeholder="Stock Quantity" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <input placeholder="SKU" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} className="rounded-xl border border-gray-200 p-2.5" />
          <div className="md:col-span-3 flex justify-end">
            <button onClick={save} className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>Save Product</button>
          </div>
        </div>
      </div>
    </div>
  )
}
