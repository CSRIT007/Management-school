import { useEffect, useState } from 'react'
import { get, post } from '../../lib/api.js'

export default function POS() {
  const [catalog, setCatalog] = useState([])
  const [cart, setCart] = useState([])
  useEffect(() => { get('/api/products').then(setCatalog) }, [])

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
    setCart((prev) => prev
      .map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
      .filter((i) => i.qty > 0))
  }

  const total = cart.reduce((s, i) => s + (Number(i.price)||0) * i.qty, 0)

  const checkout = async () => {
    if (cart.length === 0) return
    await post('/api/pos/checkout', { items: cart, customer: 'Walk-in', paymentMethod: 'Cash' })
    setCart([])
    setCatalog(await get('/api/products')) // refresh stock
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Product selection */}
      <div className="xl:col-span-2">
        <h2 className="text-xl font-semibold text-[#4361ee] mb-3">Point of Sale</h2>
        <input placeholder="Search products…" className="mb-3 w-full rounded-xl border border-gray-200 p-2.5" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {catalog.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="bg-white rounded-2xl border border-gray-100 p-3 text-left hover:shadow-sm">
              <img src={p.img} alt="" className="w-full h-24 object-cover rounded-xl mb-2" />
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-gray-500">${p.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart + Checkout */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="font-semibold mb-2">Shopping Cart</div>
          <div className="space-y-2">
            {cart.length === 0 && <div className="text-sm text-gray-500">No items yet</div>}
            {cart.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <div className="font-medium">{i.name}</div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 rounded-lg border" onClick={() => changeQty(i.id, -1)}>-</button>
                  <div>{i.qty}</div>
                  <button className="px-2 py-1 rounded-lg border" onClick={() => changeQty(i.id, +1)}>+</button>
                  <div className="w-16 text-right">${(i.price * i.qty).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between font-semibold">
            <div>Total</div>
            <div>${total.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="font-semibold mb-3">Checkout</div>
          <div className="space-y-2">
            <select className="w-full rounded-xl border border-gray-200 p-2.5 bg-white">
              <option>Walk-in</option>
              <option>Jane Doe</option>
              <option>John Smith</option>
            </select>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 bg-white">
              <option>Cash</option>
              <option>Card</option>
              <option>QR</option>
            </select>
            <button onClick={checkout} className="w-full py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>Complete Sale</button>
          </div>
        </div>
      </div>
    </div>
  )
}
