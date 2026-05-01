'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Cart from '@/components/Cart'

const CITIES = ['Buriticupu', 'Imperatriz', 'Rondon do Pará']

// ─── Icons ─────────────────────────────────────────────────────────────────────

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

// ─── City Selector Modal ──────────────────────────────────────────────────────
function CityModal({ onSelect }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo_trimmed.png" alt="SmokePods" className="h-20 w-auto object-contain mb-4"
            style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.6))' }} />
          <p className="text-white/40 text-sm mt-2">Selecione sua cidade para continuar</p>
        </div>

        {/* City buttons */}
        <div className="space-y-3">
          {CITIES.map(city => (
            <button
              key={city}
              onClick={() => onSelect(city)}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.15)'
                e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              📍 {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Image Zoom Modal ─────────────────────────────────────────────────────────
function ImageZoomModal({ src, alt, onClose }) {
  if (!src) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }} />
      <div className="relative z-10 max-w-lg w-full">
        <button onClick={onClose}
          className="absolute -top-4 -right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors z-20"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>✕</button>
        <img src={src} alt={alt}
          className="w-full h-auto rounded-2xl object-contain max-h-[80vh]"
          style={{ boxShadow: '0 0 60px rgba(59,130,246,0.2)' }}
          onClick={e => e.stopPropagation()} />
      </div>
    </div>
  )
}

// ─── Flavor Picker Modal ──────────────────────────────────────────────────────
// Aparece quando cliente clica em "Adicionar ao Carrinho" sem sabor selecionado
function FlavorModal({ pod, onConfirm, onClose }) {
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState(1)

  const flavorStock = pod.flavor_stock || {}
  const hasFlavorStock = Object.keys(flavorStock).length > 0
  function getQty(f) { return hasFlavorStock ? (flavorStock[f] ?? 0) : pod.stock_qty }
  const selectedQty = selected ? getQty(selected) : 0
  const price = pod.on_sale && pod.promo_price ? pod.promo_price : pod.price

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />
      <div
        className="relative z-10 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6"
        style={{
          background: 'rgba(10,12,20,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar mobile */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">{pod.name}</h3>
            <p className="text-blue-400 font-black text-xl mt-1">
              R$ {price.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <p className="text-white/40 text-sm mb-3">Escolha o sabor:</p>

        {/* Flavor grid */}
        <div className="flex flex-wrap gap-2 mb-5">
          {pod.flavors.map(f => {
            const fQty = getQty(f)
            const fOut = fQty === 0
            const fLow = fQty > 0 && fQty <= 3
            const isSel = selected === f
            return (
              <button key={f}
                onClick={() => { if (!fOut) { setSelected(prev => prev === f ? '' : f); setQty(1) } }}
                disabled={fOut}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: isSel ? 'rgba(59,130,246,0.2)' : fOut ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                  border: isSel ? '1px solid rgba(59,130,246,0.7)' : fOut ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.15)',
                  color: isSel ? '#60a5fa' : fOut ? 'rgba(255,255,255,0.2)' : fLow ? '#fcd34d' : 'rgba(255,255,255,0.7)',
                  cursor: fOut ? 'not-allowed' : 'pointer',
                  textDecoration: fOut ? 'line-through' : 'none',
                }}>
                {f}
                {isSel && ' ✓'}
                {fLow && !fOut && <span className="ml-1 text-orange-400 text-xs">({fQty})</span>}
                {fOut && <span className="ml-1 text-red-400/50 text-xs">✗</span>}
              </button>
            )
          })}
        </div>

        {/* Qty row */}
        {selected && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-white/40 text-sm">Quantidade:</span>
            <div className="flex items-center rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white font-bold">−</button>
              <span className="w-8 text-center text-white font-semibold text-sm">{qty}</span>
              <button onClick={() => setQty(q => Math.min(selectedQty, q + 1))}
                disabled={qty >= selectedQty}
                className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white font-bold disabled:opacity-30">+</button>
            </div>
            {selectedQty <= 3 && (
              <span className="text-orange-400 text-xs">⚡ {selectedQty} {selectedQty === 1 ? 'restante' : 'restantes'}</span>
            )}
          </div>
        )}

        <button
          onClick={() => { if (selected) { onConfirm({ selectedFlavor: selected, qty, unitPrice: price }); onClose() } }}
          disabled={!selected}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: selected ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.05)',
            boxShadow: selected ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
          }}>
          {selected ? `Comprar agora` : 'Selecione um sabor'}
        </button>
      </div>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ pod, onAddToCart, onZoom }) {
  const [showFlavorModal, setShowFlavorModal] = useState(false)
  const [added, setAdded] = useState(false)

  const flavorStock = pod.flavor_stock || {}
  const hasFlavorStock = Object.keys(flavorStock).length > 0
  function getFlavorQty(f) { return hasFlavorStock ? (flavorStock[f] ?? 0) : pod.stock_qty }

  const totalStock = hasFlavorStock
    ? Object.values(flavorStock).reduce((a, b) => a + b, 0)
    : pod.stock_qty

  const isGlobalOut = totalStock === 0
  const price = pod.on_sale && pod.promo_price ? pod.promo_price : pod.price

  // Sabores disponíveis (estoque > 0)
  const availableFlavors = pod.flavors.filter(f => getFlavorQty(f) > 0)

  function handleAddClick() {
    if (isGlobalOut) return
    setShowFlavorModal(true)
  }

  function handleConfirm({ selectedFlavor, qty, unitPrice }) {
    onAddToCart({ ...pod, selectedFlavor, qty, unitPrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <>
      <div
        className="group relative flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden cursor-zoom-in"
          style={{ background: 'linear-gradient(160deg, #080c14 0%, #0d1220 100%)', minHeight: '260px' }}
          onClick={() => pod.image_url && onZoom(pod.image_url, pod.name)}>
          {pod.on_sale && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>PROMOÇÃO</div>
          )}
          {isGlobalOut && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-red-400"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>Esgotado</div>
          )}
          {!isGlobalOut && availableFlavors.length > 0 && availableFlavors.every(f => getFlavorQty(f) <= 3) && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-orange-300"
              style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}>
              ⚡ Últimas unidades
            </div>
          )}
          {pod.image_url && (
            <div className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded-lg text-white/30 text-xs"
              style={{ background: 'rgba(0,0,0,0.4)' }}>🔍</div>
          )}
          <div className="h-[260px] flex items-center justify-center p-6">
            {pod.image_url ? (
              <img src={pod.image_url} alt={pod.name}
                className="h-full w-auto max-h-[220px] object-contain transition-transform duration-500 group-hover:scale-105"
                style={{ filter: isGlobalOut ? 'grayscale(70%) opacity(0.5)' : 'drop-shadow(0 20px 40px rgba(59,130,246,0.2))' }} />
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

          {isGlobalOut && (
            <p className="text-red-400/60 text-xs">Produto temporariamente indisponível</p>
          )}

          {/* Add button */}
          <button
            onClick={handleAddClick}
            disabled={isGlobalOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isGlobalOut ? 'rgba(255,255,255,0.05)' : added ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
              boxShadow: (!isGlobalOut && !added) ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
            }}>
            <CartIcon size={16} />
            {isGlobalOut ? 'Esgotado' : added ? 'Adicionado ✓' : 'Escolher Sabor'}
          </button>
        </div>
      </div>

      {/* Flavor picker modal */}
      {showFlavorModal && (
        <FlavorModal
          pod={pod}
          onConfirm={handleConfirm}
          onClose={() => setShowFlavorModal(false)}
        />
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [flavorSearch, setFlavorSearch] = useState('')
  const [sortBy, setSortBy] = useState('price_asc')
  const [zoomImg, setZoomImg] = useState(null)
  const [zoomAlt, setZoomAlt] = useState('')
  const [selectedCity, setSelectedCity] = useState(null)

  useEffect(() => {
    // Recupera cidade salva
    const saved = localStorage.getItem('smokepods_city')
    if (saved && CITIES.includes(saved)) setSelectedCity(saved)
  }, [])

  useEffect(() => {
    if (!selectedCity) return
    fetchPods()
    const channel = supabase
      .channel('pods-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pods' }, fetchPods)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selectedCity])

  async function fetchPods() {
    const { data, error } = await supabase.from('pods').select('*').order('created_at', { ascending: false })
    if (error) console.error('[Smoke Pods] Erro:', error.message)
    if (data) setPods(data)
    setLoading(false)
  }

  function handleCitySelect(city) {
    localStorage.setItem('smokepods_city', city)
    setSelectedCity(city)
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

  // Filtra por cidade + busca + ordenação
  let filtered = pods.filter(p => {
    const cityMatch = !selectedCity || !p.cities || p.cities.length === 0 || p.cities.includes(selectedCity)
    const nameMatch = p.name.toLowerCase().includes(search.toLowerCase())
    const flavorMatch = flavorSearch === '' || p.flavors.some(f => f.toLowerCase().includes(flavorSearch.toLowerCase()))
    return cityMatch && nameMatch && flavorMatch
  })

  // Esgotados no final; dentro de cada grupo, menor preço primeiro
  filtered = [...filtered].sort((a, b) => {
    const stockOf = p => {
      const fs = p.flavor_stock || {}
      return Object.keys(fs).length > 0
        ? Object.values(fs).reduce((s, v) => s + v, 0)
        : (p.stock_qty ?? 0)
    }
    const aOut = stockOf(a) === 0
    const bOut = stockOf(b) === 0
    if (aOut !== bOut) return aOut ? 1 : -1

    const priceOf = p => (p.on_sale && p.promo_price) ? p.promo_price : p.price
    return priceOf(a) - priceOf(b)
  })

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0)

  const sortOptions = [
    { value: 'newest', label: '🕐 Mais Recentes' },
    { value: 'price_asc', label: '💲 Menor Preço' },
    { value: 'price_desc', label: '💰 Maior Preço' },
    { value: 'promo', label: '🔥 Promoções' },
  ]

  // Mostra seletor de cidade se não selecionada
  if (!selectedCity) return <CityModal onSelect={handleCitySelect} />

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
        <a href="/" className="flex items-center no-underline">
          <img src="/logo_trimmed.png" alt="SmokePods"
            style={{ height: 'clamp(40px, 5vw, 64px)', width: 'auto', objectFit: 'contain' }} />
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cidade selecionada */}
          <button
            onClick={() => { localStorage.removeItem('smokepods_city'); setSelectedCity(null) }}
            className="hidden sm:flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors text-xs"
          >
            📍 {selectedCity}
          </button>
          <a href="/admin" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
            <AdminIcon />Admin
          </a>
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <CartIcon />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-black text-white flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="px-4 sm:px-6 pt-5 pb-3 max-w-screen-xl mx-auto">
        {/* Cidade mobile */}
        <button onClick={() => { localStorage.removeItem('smokepods_city'); setSelectedCity(null) }}
          className="sm:hidden flex items-center gap-1 text-white/30 text-xs mb-3 hover:text-white/50 transition-colors">
          📍 {selectedCity} <span className="ml-1 text-white/20">— trocar</span>
        </button>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar produto..."
            className="px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none flex-1 min-w-[140px]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }} />
          <input type="text" value={flavorSearch} onChange={e => setFlavorSearch(e.target.value)}
            placeholder="🍓 Buscar sabor..."
            className="px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none flex-1 min-w-[140px]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.2)' }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', appearance: 'none', WebkitAppearance: 'none', minWidth: '150px', cursor: 'pointer' }}>
            {sortOptions.map(o => <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>)}
          </select>
        </div>
        {flavorSearch && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-white/30 text-xs">
              Sabor: <span className="text-blue-400 font-semibold">"{flavorSearch}"</span> — {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setFlavorSearch('')} className="text-white/20 hover:text-white/50 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Grid */}
      <section className="px-4 sm:px-6 pb-28 max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(59,130,246,0.4)', borderTopColor: '#3b82f6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/20 py-20 text-sm">
            {flavorSearch ? `Nenhum produto com o sabor "${flavorSearch}".` : `Nenhum produto disponível em ${selectedCity}.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map(pod => (
              <ProductCard key={pod.id} pod={pod} onAddToCart={addToCart}
                onZoom={(src, alt) => { setZoomImg(src); setZoomAlt(alt) }} />
            ))}
          </div>
        )}
      </section>

      {/* WhatsApp flutuante */}
      <a href="https://wa.me/559991036173" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        style={{ width: '58px', height: '58px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.45)' }}
        title="Fale conosco no WhatsApp">
        <WAFloatIcon />
      </a>

      <Cart open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} setItems={setCartItems} />
      <ImageZoomModal src={zoomImg} alt={zoomAlt} onClose={() => setZoomImg(null)} />
    </div>
  )
}
