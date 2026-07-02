import { useEffect, useState } from 'react'
import { get, post, put, del } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FormAlert from '../../components/ui/FormAlert.jsx'

const emptyForm = { id: '', name: '', description: '', category: '', price: '', cost: '', stock: '', sku: '' }

function nextProductId(products) {
  const nums = products
    .map((p) => /^P(\d+)$/.exec(p.id))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `P${String(next).padStart(3, '0')}`
}

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const [p, c] = await Promise.all([get('/api/products'), get('/api/categories')])
      setProducts(p)
      setCategories(c)
      if (!editingId) {
        setForm((f) => ({ ...f, id: f.id || nextProductId(p) }))
      }
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
    setForm({ ...emptyForm, id: nextProductId(products) })
    setEditingId(null)
    setMessage('')
    setError(false)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      id: row.id,
      name: row.name || '',
      description: row.description || '',
      category: row.category || '',
      price: String(row.price ?? ''),
      cost: String(row.cost ?? ''),
      stock: String(row.stock ?? ''),
      sku: row.sku || '',
    })
    setMessage('')
    setError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    setError(false)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        category: form.category,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        sku: form.sku,
      }
      if (editingId) {
        await put(`/api/products/${editingId}`, payload)
        showMsg('Product updated successfully.')
      } else {
        payload.id = form.id.trim() || nextProductId(products)
        await post('/api/products', payload)
        showMsg('Product added successfully.')
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
    if (!confirm(`Delete product ${id}?`)) return
    try {
      await del(`/api/products/${id}`)
      if (editingId === id) reset()
      await load()
      showMsg('Product deleted.')
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'font-semibold text-slate-900 dark:text-slate-100' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'sku', label: 'SKU' },
    {
      key: 'stock',
      label: 'Stock',
      render: (r) => (
        <Badge variant={(r.stock ?? 0) <= 3 ? 'danger' : 'success'}>{r.stock}</Badge>
      ),
    },
    { key: 'price', label: 'Price', render: (r) => `$${Number(r.price || 0).toFixed(2)}` },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Management"
        subtitle="Manage inventory, pricing, and stock levels"
      />

      <FormAlert message={message} error={error} />

      <form onSubmit={submit} className="panel p-6">
        <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? `Edit Product — ${editingId}` : 'Add New Product'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Product ID</label>
            <input
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))}
              className="input"
              placeholder="P001"
              disabled={!!editingId}
              readOnly={!!editingId}
            />
          </div>
          <div>
            <label className="label">Product Name</label>
            <input placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">Description</label>
            <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Price</label>
            <input placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Cost</label>
            <input placeholder="0.00" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Stock</label>
            <input placeholder="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">SKU</label>
            <input placeholder="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="input" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </form>

      <DataTable columns={columns} rows={products} emptyMessage="No products yet." />
    </div>
  )
}
