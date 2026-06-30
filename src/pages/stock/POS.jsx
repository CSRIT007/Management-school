import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'

function ProductThumb({ name }) {
  const initial = (name || '?')[0].toUpperCase()
  const colors = ['from-indigo-500 to-violet-600', 'from-sky-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-600']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div className={`flex h-24 w-full items-center justify-center rounded-xl bg-gradient-to-br ${color} text-2xl font-bold text-white shadow-inner`}>
      {initial}
    </div>
  )
}

export default function POS() {
  const [catalog, setCatalog] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { get('/api/products').then(setCatalog) }, [])

  const filtered = catalog.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const addToCart = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { ...p, qty: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    )
  }

  const total = cart.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0)

  const checkout = async () => {
    if (cart.length === 0) return
    await post('/api/pos/checkout', { items: cart, customer: 'Walk-in', paymentMethod: 'Cash' })
    setCart([])
    setCatalog(await get('/api/products'))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point of Sale"
        subtitle="Select products and process checkout"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="panel group p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {p.img ? (
                  <img src={p.img} alt="" className="mb-2 h-24 w-full rounded-xl object-cover" />
                ) : (
                  <div className="mb-2"><ProductThumb name={p.name} /></div>
                )}
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{p.name}</div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">${Number(p.price).toFixed(2)}</span>
                  <span className="text-xs text-slate-400">Stock: {p.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Shopping Cart</h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">{cart.length} items</span>
            </div>
            <div className="space-y-3">
              {cart.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">No items in cart</div>
              )}
              {cart.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">{i.name}</div>
                  <div className="flex items-center gap-2 ml-2">
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" onClick={() => changeQty(i.id, -1)}>−</button>
                    <span className="w-5 text-center font-semibold">{i.qty}</span>
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" onClick={() => changeQty(i.id, +1)}>+</button>
                    <span className="w-16 text-right font-semibold text-slate-900 dark:text-slate-100">${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-slate-100">Checkout</h3>
            <div className="space-y-3">
              <select className="input">
                <option>Walk-in</option>
                <option>Jane Doe</option>
                <option>John Smith</option>
              </select>
              <select className="input">
                <option>Cash</option>
                <option>Card</option>
                <option>QR</option>
              </select>
              <Button onClick={checkout} className="w-full" size="lg">Complete Sale</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
