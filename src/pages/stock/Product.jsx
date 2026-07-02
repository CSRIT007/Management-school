import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', cost: '', stock: '', sku: '' })

  const load = async () => {
    const [p, c] = await Promise.all([get('/api/products'), get('/api/categories')])
    setProducts(p)
    setCategories(c)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) return
    const body = { ...form, price: +form.price || 0, cost: +form.cost || 0, stock: +form.stock || 0 }
    await post('/api/products', body)
    setForm({ name: '', description: '', category: '', price: '', cost: '', stock: '', sku: '' })
    await load()
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'stock',
      label: 'Stock',
      render: (r) => (
        <Badge variant={(r.stock ?? 0) <= 3 ? 'danger' : 'success'}>{r.stock}</Badge>
      ),
    },
    { key: 'price', label: 'Price', render: (r) => `$${Number(r.price || 0).toFixed(2)}` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Management"
        subtitle="Manage inventory, pricing, and stock levels"
        actions={<Button onClick={save}>Add Product</Button>}
      />

      <DataTable columns={columns} rows={products} emptyMessage="No products yet." />

      <div className="panel p-6">
        <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-100">Add New Product</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" />
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input" />
          <input placeholder="Cost" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className="input" />
          <input placeholder="Stock quantity" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="input" />
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="input md:col-span-2" />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save}>Save Product</Button>
        </div>
      </div>
    </div>
  )
}
