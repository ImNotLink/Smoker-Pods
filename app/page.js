'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Cart from '@/components/Cart'

// ─── Icons ─────────────────────────────────────────────────────────────────────
function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7"/><stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function CartIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

// ─── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ pod, onAddToCart }) {
  const [selectedFlavor, setSelectedFlavor] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const price = pod.on_sale && pod.promo_price ? pod.promo_price : pod.price
  const isOut = pod.stock_qty === 0
  const isLow = pod.stock_qty > 0 && pod.stock_qty <= 3

  function handleAdd() {
    if (!selectedFlavor || isOut) return
    onAddToCart({ ...pod, selectedFlavor, qty, unitPrice: price })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d0d12 0%, #10101a 100%)',
          minHeight: '260px',
        }}
      >
        {/* PROMOÇÃO badge */}
        {pod.on_sale && (
          <div
            className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            PROMOÇÃO
          </div>
        )}

        {/* Stock badges */}
        {isLow && !isOut && (
          <div
            className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-orange-300"
            style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}
          >
            ⚡ Apenas {pod.stock_qty} restantes
          </div>
        )}
        {isOut && (
          <div
            className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-red-400"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            Esgotado
          </div>
        )}

        {/* Product image */}
        <div className="h-[260px] flex items-center justify-center p-6">
          {pod.image_url ? (
            <img
              src={pod.image_url}
              alt={pod.name}
              className="h-full w-auto max-h-[220px] object-contain transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isOut ? 'grayscale(70%) opacity(0.5)' : 'drop-shadow(0 20px 40px rgba(139,92,246,0.25))' }}
            />
          ) : (
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-purple-400/20 text-5xl"
              style={{ background: 'rgba(139,92,246,0.05)' }}>
              🌫️
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-5">
        {/* Name */}
        <h3 className="text-white font-bold text-xl tracking-tight">{pod.name}</h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-black"
            style={{ color: '#a855f7' }}
          >
            R$ {price.toFixed(2).replace('.', ',')}
          </span>
          {pod.on_sale && pod.promo_price && (
            <span className="text-sm text-white/30 line-through">
              R$ {pod.price.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        {/* Flavor tags */}
        <div className="flex flex-wrap gap-1.5">
          {pod.flavors.map((f) => (
            <button
              key={f}
              onClick={() => !isOut && setSelectedFlavor(f)}
              disabled={isOut}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{
                background: selectedFlavor === f ? 'rgba(168,85,247,0.2)' : 'transparent',
                border: selectedFlavor === f
                  ? '1px solid rgba(168,85,247,0.6)'
                  : '1px solid rgba(255,255,255,0.12)',
                color: selectedFlavor === f ? '#c084fc' : 'rgba(255,255,255,0.5)',
                cursor: isOut ? 'default' : 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Required flavor warning */}
        {!selectedFlavor && !isOut && (
          <p className="text-white/25 text-xs">← Selecione um sabor antes de adicionar</p>
        )}

        {/* Qty + Add to cart */}
        <div className="flex gap-2 mt-1">
          {/* Qty control */}
          <div
            className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={isOut}
              className="w-9 h-11 flex items-center justify-center text-white/40 hover:text-white transition-colors font-bold disabled:opacity-30"
            >−</button>
            <span className="w-8 text-center text-white font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(pod.stock_qty, q + 1))}
              disabled={isOut || qty >= pod.stock_qty}
              className="w-9 h-11 flex items-center justify-center text-white/40 hover:text-white transition-colors font-bold disabled:opacity-30"
            >+</button>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={!selectedFlavor || isOut}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isOut
                ? 'rgba(255,255,255,0.05)'
                : added
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
              boxShadow: (!isOut && !added) ? '0 0 20px rgba(168,85,247,0.3)' : 'none',
            }}
          >
            <CartIcon size={16} />
            {isOut ? 'Esgotado' : added ? 'Adicionado ✓' : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPods()

    // Realtime subscription
    const channel = supabase
      .channel('pods-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pods' }, fetchPods)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPods() {
    const { data, error } = await supabase
      .from('pods')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Smoker Pods] Erro ao buscar produtos:', error.message)
    }
    if (data) setPods(data)
    setLoading(false)
  }

  const addToCart = useCallback((item) => {
    setCartItems((prev) => {
      const key = `${item.id}::${item.selectedFlavor}`
      const exists = prev.find((i) => i.cartKey === key)
      if (exists) {
        return prev.map((i) => i.cartKey === key ? { ...i, qty: i.qty + item.qty } : i)
      }
      return [...prev, { ...item, cartKey: key }]
    })
    setCartOpen(true)
  }, [])

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0)
  const filtered = pods.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 no-underline">
          <LogoIcon />
          <span
            className="text-white font-black text-lg tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Smoker<span style={{ color: '#a855f7' }}>Pods</span>
          </span>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Admin link */}
          <a
            href="/admin"
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            <AdminIcon />
            Admin
          </a>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <CartIcon />
            Carrinho
            {cartCount > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-black text-white flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Search bar ────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-2 max-w-screen-xl mx-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full max-w-xs px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        />
      </div>

      {/* ── Products grid ─────────────────────────────────────────────── */}
      <section className="px-6 py-6 max-w-screen-xl mx-auto pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(168,85,247,0.4)', borderTopColor: '#a855f7' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/20 py-20 text-sm">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((pod) => (
              <ProductCard key={pod.id} pod={pod} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </section>

      {/* Cart Drawer */}
      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        setItems={setCartItems}
      />
    </div>
  )
}
