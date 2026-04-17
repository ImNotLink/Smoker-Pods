'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Cart from '@/components/Cart'

// ─── Icons ─────────────────────────────────────────────────────────────────────
function LogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6"/><stop offset="1" stopColor="#60a5fa"/>
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
function WAFloatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

// ─── Image Zoom Modal ─────────────────────────────────────────────────────────
function ImageZoomModal({ src, alt, onClose }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
      />
      <div className="relative z-10 max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors z-20"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          ✕
        </button>
        <img
          src={src}
          alt={alt}
          className="w-full h-auto rounded-2xl object-contain max-h-[80vh]"
          style={{ boxShadow: '0 0 60px rgba(59,130,246,0.2)' }}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ pod, onAddToCart, onZoom }) {
  const [selectedFlavor, setSelectedFlavor] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const flavorStock = pod.flavor_stock || {}
  const hasFlavorStock = Object.keys(flavorStock).length > 0

  function getFlavorQty(flavor) {
    if (hasFlavorStock) return flavorStock[flavor] ?? 0
    return pod.stock_qty
  }

  const totalStock = hasFlavorStock
    ? Object.values(flavorStock).reduce((a, b) => a + b, 0)
    : pod.stock_qty

  const isGlobalOut = totalStock === 0
  const selectedFlavorQty = selectedFlavor ? getFlavorQty(selectedFlavor) : 0
  const isSelectedOut = selectedFlavor ? selectedFlavorQty === 0 : false
  const isSelectedLow = selectedFlavor ? selectedFlavorQty > 0 && selectedFlavorQty <= 3 : false
  const price = pod.on_sale && pod.promo_price ? pod.promo_price : pod.price

  function toggleFlavor(flavor) {
    if (isGlobalOut || getFlavorQty(flavor) === 0) return
    setSelectedFlavor(prev => prev === flavor ? '' : flavor)
    setQty(1)
  }

  function handleAdd() {
    if (isGlobalOut) return
    if (!selectedFlavor) {
      // Mostra toast e pulsa as tags de sabor
      setShowToast(true)
      setPulsing(false)
      // força re-render para reiniciar animação mesmo se clicar várias vezes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPulsing(true))
      })
      setTimeout(() => setShowToast(false), 2200)
      setTimeout(() => setPulsing(false), 1650)
      return
    }
    if (isSelectedOut) return
    onAddToCart({ ...pod, selectedFlavor, qty, unitPrice: price })
    setAdded(true)
    setSelectedFlavor('')
    setQty(1)
    setTimeout(() => setAdded(false), 1800)
  }

  // Singular/plural correto
  const stockLabel = selectedFlavorQty === 1 ? 'restante' : 'restantes'

  return (
    <>
    <style>{`
      @keyframes flavorPulse {
        0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        12%  { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(59,130,246,0.3); }
        24%  { transform: scale(1);    box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        36%  { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(59,130,246,0.3); }
        48%  { transform: scale(1);    box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        60%  { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(59,130,246,0.25); }
        72%  { transform: scale(1);    box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        84%  { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(59,130,246,0.2); }
        100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(59,130,246,0); }
      }
      .flavor-pulse { animation: flavorPulse 1.6s ease-out; }
    `}</style>
    <div
      className="group relative flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden cursor-zoom-in"
        style={{ background: 'linear-gradient(160deg, #080c14 0%, #0d1220 100%)', minHeight: '260px' }}
        onClick={() => pod.image_url && onZoom(pod.image_url, pod.name)}
      >
        {pod.on_sale && (
          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            PROMOÇÃO
          </div>
        )}
        {selectedFlavor && isSelectedLow && (
          <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-orange-300"
            style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}>
            ⚡ Apenas {selectedFlavorQty} {stockLabel}
          </div>
        )}
        {isGlobalOut && (
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-red-400"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            Esgotado
          </div>
        )}
        {pod.image_url && (
          <div className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded-lg text-white/30 text-xs"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            🔍
          </div>
        )}
        <div className="h-[260px] flex items-center justify-center p-6">
          {pod.image_url ? (
            <img
              src={pod.image_url}
              alt={pod.name}
              className="h-full w-auto max-h-[220px] object-contain transition-transform duration-500 group-hover:scale-105"
              style={{ filter: isGlobalOut ? 'grayscale(70%) opacity(0.5)' : 'drop-shadow(0 20px 40px rgba(59,130,246,0.2))' }}
            />
          ) : (
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'rgba(59,130,246,0.05)' }}>🌫️</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-5">
        <h3 className="text-white font-bold text-xl tracking-tight">{pod.name}</h3>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black" style={{ color: '#3b82f6' }}>
            R$ {price.toFixed(2).replace('.', ',')}
          </span>
          {pod.on_sale && pod.promo_price && (
            <span className="text-sm text-white/30 line-through">R$ {pod.price.toFixed(2).replace('.', ',')}</span>
          )}
        </div>

        {/* Flavor tags */}
        <div>
          <p className="text-white/30 text-xs mb-2 font-medium">
            Escolha o sabor{selectedFlavor ? <span className="text-blue-400/70"> — clique para desmarcar</span> : ''}
          </p>
          <div className={`flex flex-wrap gap-1.5 rounded-xl transition-all ${pulsing ? 'flavor-pulse' : ''}`}>
            {pod.flavors.map(f => {
              const fQty = getFlavorQty(f)
              const fOut = fQty === 0
              const fLow = fQty > 0 && fQty <= 3
              const isSelected = selectedFlavor === f
              return (
                <button key={f} onClick={() => toggleFlavor(f)}
                  disabled={isGlobalOut || fOut}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: isSelected ? 'rgba(59,130,246,0.2)' : fOut ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: isSelected ? '1px solid rgba(59,130,246,0.7)' : fOut ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.15)',
                    color: isSelected ? '#60a5fa' : fOut ? 'rgba(255,255,255,0.2)' : fLow ? '#fcd34d' : 'rgba(255,255,255,0.6)',
                    cursor: fOut || isGlobalOut ? 'not-allowed' : 'pointer',
                    textDecoration: fOut ? 'line-through' : 'none',
                  }}
                >
                  {f}
                  {fLow && !fOut && <span className="ml-1 text-orange-400 text-[10px]">({fQty})</span>}
                  {fOut && <span className="ml-1 text-red-400/60 text-[10px]">✗</span>}
                  {isSelected && <span className="ml-1 text-blue-400 text-[10px]">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Toast inline abaixo dos sabores */}
        {showToast && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{
              background: 'rgba(10,14,26,0.97)',
              border: '1px solid rgba(59,130,246,0.55)',
              boxShadow: '0 0 18px rgba(59,130,246,0.2)',
            }}
          >
            <span className="text-lg">👆</span>
            Selecione um sabor antes.
          </div>
        )}

        {!selectedFlavor && !isGlobalOut && !showToast && (
          <p className="text-white/25 text-xs">← Selecione um sabor para adicionar</p>
        )}
        {selectedFlavor && isSelectedOut && (
          <p className="text-red-400/70 text-xs">Este sabor está esgotado</p>
        )}

        {/* Qty + Add */}
        <div className="flex gap-2 mt-1">
          <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={isGlobalOut}
              className="w-9 h-11 flex items-center justify-center text-white/40 hover:text-white transition-colors font-bold disabled:opacity-30">−</button>
            <span className="w-8 text-center text-white font-semibold text-sm">{qty}</span>
            <button onClick={() => setQty(q => Math.min(selectedFlavorQty || pod.stock_qty, q + 1))}
              disabled={isGlobalOut || !selectedFlavor || qty >= selectedFlavorQty}
              className="w-9 h-11 flex items-center justify-center text-white/40 hover:text-white transition-colors font-bold disabled:opacity-30">+</button>
          </div>
          <button onClick={handleAdd} disabled={isGlobalOut}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isGlobalOut ? 'rgba(255,255,255,0.05)' : added ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
              boxShadow: (!isGlobalOut && !added) ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
            }}>
            <CartIcon size={16} />
            {isGlobalOut ? 'Esgotado' : added ? 'Adicionado ✓' : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = '559991036173'

export default function HomePage() {
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [flavorSearch, setFlavorSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [zoomImg, setZoomImg] = useState(null)
  const [zoomAlt, setZoomAlt] = useState('')

  useEffect(() => {
    fetchPods()
    const channel = supabase
      .channel('pods-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pods' }, fetchPods)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPods() {
    const { data, error } = await supabase.from('pods').select('*').order('created_at', { ascending: false })
    if (error) console.error('[Smoke Pods] Erro:', error.message)
    if (data) setPods(data)
    setLoading(false)
  }

  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      const key = `${item.id}::${item.selectedFlavor}`
      const exists = prev.find(i => i.cartKey === key)
      if (exists) return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + item.qty } : i)
      return [...prev, { ...item, cartKey: key }]
    })
    setCartOpen(true)
  }, [])

  // Filter + sort
  let filtered = pods.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(search.toLowerCase())
    const flavorMatch = flavorSearch === '' ||
      p.flavors.some(f => f.toLowerCase().includes(flavorSearch.toLowerCase()))
    return nameMatch && flavorMatch
  })

  if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => (a.promo_price || a.price) - (b.promo_price || b.price))
  else if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => (b.promo_price || b.price) - (a.promo_price || a.price))
  else if (sortBy === 'promo') filtered = [...filtered].sort((a, b) => (b.on_sale ? 1 : 0) - (a.on_sale ? 1 : 0))
  // 'newest' = default order from Supabase

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0)

  const sortOptions = [
    { value: 'newest', label: '🕐 Mais Recentes' },
    { value: 'price_asc', label: '💲 Menor Preço' },
    { value: 'price_desc', label: '💰 Maior Preço' },
    { value: 'promo', label: '🔥 Promoções' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
        <a href="/" className="flex items-center gap-2 no-underline">
          <img src="/Logo_pod.png" alt="SmokePods" className="w-8 h-8 object-contain"
            style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }} />
          <span className="font-black text-lg tracking-tight flex items-center gap-1.5" style={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: '#9ca3af' }}>Smoke</span>
            <span style={{ color: '#ffffff', textShadow: '0 0 12px #60a5fa, 0 0 24px #3b82f6' }}>Pods</span>
            <LogoIcon />
          </span>
        </a>
        <div className="flex items-center gap-3">
          <a href="/admin" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
            <AdminIcon />Admin
          </a>
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <CartIcon />Carrinho
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-black text-white flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Filtros e Ordenação ───────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 max-w-screen-xl mx-auto">
        <div className="flex flex-wrap gap-3">
          {/* Busca por nome */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar produto..."
            className="px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none transition-colors flex-1 min-w-[160px]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          {/* Busca por sabor */}
          <input
            type="text"
            value={flavorSearch}
            onChange={e => setFlavorSearch(e.target.value)}
            placeholder="🍓 Buscar por sabor..."
            className="px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none transition-colors flex-1 min-w-[160px]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}
          />
          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              appearance: 'none',
              WebkitAppearance: 'none',
              minWidth: '160px',
              cursor: 'pointer',
            }}
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Flavor search result info */}
        {flavorSearch && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-white/30 text-xs">
              Sabor: <span className="text-blue-400 font-semibold">"{flavorSearch}"</span>
              {' '}— {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setFlavorSearch('')}
              className="text-white/20 hover:text-white/50 text-xs transition-colors">✕ limpar</button>
          </div>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-28 max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(59,130,246,0.4)', borderTopColor: '#3b82f6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/20 py-20 text-sm">
            {flavorSearch ? `Nenhum produto com o sabor "${flavorSearch}".` : 'Nenhum produto encontrado.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(pod => (
              <ProductCard key={pod.id} pod={pod} onAddToCart={addToCart}
                onZoom={(src, alt) => { setZoomImg(src); setZoomAlt(alt) }} />
            ))}
          </div>
        )}
      </section>

      {/* ── WhatsApp flutuante ────────────────────────────────────── */}
      <a
        href={`https://wa.me/559991036173`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        style={{
          width: '58px',
          height: '58px',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow: '0 4px 24px rgba(34,197,94,0.45)',
        }}
        title="Fale conosco no WhatsApp"
      >
        <WAFloatIcon />
      </a>

      {/* Cart */}
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} setItems={setCartItems} />

      {/* Image Zoom */}
      <ImageZoomModal src={zoomImg} alt={zoomAlt} onClose={() => setZoomImg(null)} />
    </div>
  )
}
