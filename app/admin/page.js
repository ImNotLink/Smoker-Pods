'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, uploadProductImage, deleteProductImage } from '@/lib/supabase'

// ─── Tiny icon set ─────────────────────────────────────────────────────────────
const I = {
  Plus:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  X:      () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Logout: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Img:    () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Logo:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#ag)"/><defs><linearGradient id="ag" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#3b82f6"/><stop offset="1" stopColor="#60a5fa"/></linearGradient></defs></svg>,
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const CITIES = ['Buriticupu', 'Imperatriz', 'Rondon do Pará']
const EMPTY = { name: '', price: '', promo_price: '', on_sale: false, stock_qty: '0', image_url: '', flavors: [], flavor_stock: {}, cities: [] }

// ─── UI helpers ────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-colors border border-white/[0.08] focus:border-blue-500/50 placeholder-white/20'
const inputStyle = { background: 'rgba(255,255,255,0.05)' }
const labelCls = 'block text-white/35 text-xs font-semibold uppercase tracking-widest mb-1.5'

// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[2rem] p-7 z-10"
        style={{
          background: 'rgba(11,11,15,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 0 100px rgba(59,130,246,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white border border-white/[0.08] transition-all"
          >
            <I.X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Product Form ──────────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    flavor_stock: initial?.flavor_stock || {},
    cities: initial?.cities || [],
  }))
  const [fi, setFi] = useState('')
  const [imgFile, setImgFile] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const totalStock = Object.values(f.flavor_stock || {}).reduce((a, b) => a + (parseInt(b) || 0), 0)

  function addFlavor() {
    const trimmed = fi.trim()
    if (!trimmed || f.flavors.includes(trimmed)) return
    const newFlavors = [...f.flavors, trimmed]
    const newStock = { ...f.flavor_stock, [trimmed]: f.flavor_stock[trimmed] ?? 0 }
    setF(p => ({ ...p, flavors: newFlavors, flavor_stock: newStock }))
    setFi('')
  }

  function removeFlavor(fl) {
    const newFlavors = f.flavors.filter(x => x !== fl)
    const newStock = { ...f.flavor_stock }
    delete newStock[fl]
    setF(p => ({ ...p, flavors: newFlavors, flavor_stock: newStock }))
  }

  function setFlavorStock(fl, val) {
    const num = Math.max(0, parseInt(val) || 0)
    setF(p => ({ ...p, flavor_stock: { ...p.flavor_stock, [fl]: num } }))
  }

  function handleImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.price) return

    setUploading(true)
    let imageUrl = f.image_url

    if (imgFile) {
      try { imageUrl = await uploadProductImage(imgFile) }
      catch (err) { alert('Erro no upload: ' + err.message); setUploading(false); return }
    }

    onSave({ ...f, image_url: imageUrl, stock_qty: totalStock })
    setUploading(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Image */}
      <div>
        <label className={labelCls}>Imagem</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative h-44 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-all"
          style={{
            border: '2px dashed rgba(255,255,255,0.12)',
            background: 'rgba(59,130,246,0.04)',
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-contain p-4" />
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                <span className="text-white text-xs font-semibold">Trocar imagem</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/25">
              <I.Img />
              <span className="text-xs">Clique para selecionar (máx. 5MB)</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
        </div>
      </div>

      {/* Name */}
      <div>
        <label className={labelCls}>Nome *</label>
        <input
          className={inputCls} style={inputStyle}
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex: ELF Bar BC5000"
          required
        />
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Preço (R$) *</label>
          <input
            className={inputCls} style={inputStyle}
            type="number" step="0.01" min="0"
            value={f.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="0,00" required
          />
        </div>
        <div>
          <label className={labelCls}>Preço Promo (R$)</label>
          <input
            className={inputCls} style={inputStyle}
            type="number" step="0.01" min="0"
            value={f.promo_price}
            onChange={(e) => set('promo_price', e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* On sale */}
      <div>
        <label className={labelCls}>Promoção ativa</label>
        <button
          type="button"
          onClick={() => set('on_sale', !f.on_sale)}
          className="w-full h-[42px] rounded-xl text-sm font-semibold transition-all"
          style={{
            background: f.on_sale ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
            border: f.on_sale ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
            color: f.on_sale ? '#93c5fd' : 'rgba(255,255,255,0.35)',
          }}
        >
          {f.on_sale ? '✓ Ativa' : 'Inativa'}
        </button>
      </div>

      {/* Flavors + Stock Table */}
      <div>
        <label className={labelCls}>Sabores & Estoque por Sabor</label>

        <div className="flex gap-2 mb-3">
          <input
            className={`${inputCls} flex-1`} style={inputStyle}
            value={fi}
            onChange={(e) => setFi(e.target.value)}
            placeholder="Ex: Menta Gelada"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFlavor() } }}
          />
          <button
            type="button" onClick={addFlavor}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:brightness-110 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
          >+ Adicionar</button>
        </div>

        {f.flavors.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="grid grid-cols-[1fr_100px_36px] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/30"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span>Sabor</span>
              <span className="text-center">Estoque</span>
              <span></span>
            </div>
            {f.flavors.map((fl, idx) => {
              const qty = f.flavor_stock[fl] ?? 0
              const isLow = qty > 0 && qty <= 3
              const isOut = qty === 0
              return (
                <div
                  key={fl}
                  className="grid grid-cols-[1fr_100px_36px] gap-2 items-center px-4 py-2.5"
                  style={{
                    borderBottom: idx < f.flavors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: isOut ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: isOut ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)' }}
                  >
                    {fl}
                    {isOut && <span className="ml-2 text-red-400/60 text-xs">Esgotado</span>}
                    {isLow && <span className="ml-2 text-orange-400/80 text-xs">⚡ Baixo</span>}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={qty}
                    onChange={e => setFlavorStock(fl, e.target.value)}
                    className="text-center text-white text-sm font-bold rounded-lg outline-none transition-colors"
                    style={{
                      background: isOut ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(251,146,60,0.1)' : 'rgba(59,130,246,0.08)',
                      border: isOut ? '1px solid rgba(239,68,68,0.3)' : isLow ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(59,130,246,0.2)',
                      color: isOut ? '#f87171' : isLow ? '#fcd34d' : '#93c5fd',
                      padding: '6px 8px',
                      width: '100%',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeFlavor(fl)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all text-lg leading-none"
                  >×</button>
                </div>
              )
            })}
            <div
              className="grid grid-cols-[1fr_100px_36px] gap-2 items-center px-4 py-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Total</span>
              <span
                className="text-center text-sm font-black"
                style={{ color: totalStock === 0 ? '#f87171' : totalStock <= 5 ? '#fcd34d' : '#4ade80' }}
              >
                {totalStock}
              </span>
              <span></span>
            </div>
          </div>
        )}

        {f.flavors.length === 0 && (
          <p className="text-white/20 text-xs mt-1">Adicione sabores acima para configurar o estoque de cada um.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/40 border border-white/[0.08] hover:border-white/20 transition-colors"
        >Cancelar</button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)' }}
        >
          {(saving || uploading) ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Admin Page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [pods, setPods] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [delOrderTarget, setDelOrderTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCity, setActiveCity] = useState('Buriticupu')
  const [activeTab, setActiveTab] = useState('products')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace('/login')
      } else {
        setAuthChecked(true)
        fetchPods()
      }
    })
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.replace('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchPods() {
    const { data } = await supabase.from('pods').select('*').order('created_at', { ascending: false })
    setPods(data || [])
    setLoading(false)
  }

  async function fetchOrders() {
    setOrdersLoading(true)
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    setOrders(data || [])
    setOrdersLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleSave(form) {
    setSaving(true)
    const totalStock = Object.values(form.flavor_stock || {}).reduce((a, b) => a + (parseInt(b) || 0), 0)
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
      on_sale: form.on_sale,
      stock_qty: totalStock,
      image_url: form.image_url || null,
      flavors: form.flavors,
      flavor_stock: form.flavor_stock || {},
      // New products get the active city; existing products keep their cities
      cities: form.id ? (form.cities || []) : [activeCity],
    }

    if (form.id) {
      const { error } = await supabase.from('pods').update(payload).eq('id', form.id)
      if (error) { alert('Erro ao atualizar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('pods').insert(payload)
      if (error) { alert('Erro ao criar: ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    setEditTarget(null)
    fetchPods()
  }

  async function handleDeleteOrder() {
    if (!delOrderTarget) return
    const { error } = await supabase.from('orders').delete().eq('id', delOrderTarget.id)
    if (error) alert('Erro ao excluir pedido: ' + error.message)
    setDelOrderTarget(null)
    fetchOrders()
  }

  async function handleDelete() {
    if (!delTarget) return
    await deleteProductImage(delTarget.image_url)
    const { error } = await supabase.from('pods').delete().eq('id', delTarget.id)
    if (error) alert('Erro ao deletar: ' + error.message)
    setDelTarget(null)
    fetchPods()
  }

  async function quickStock(id, delta, current) {
    const newQty = Math.max(0, current + delta)
    const pod = pods.find(p => p.id === id)
    const payload = { stock_qty: newQty }
    if (newQty === 0 && pod?.flavor_stock) {
      payload.flavor_stock = Object.fromEntries(
        Object.keys(pod.flavor_stock).map((fl) => [fl, 0])
      )
    }
    await supabase.from('pods').update(payload).eq('id', id)
    fetchPods()
  }

  // ─── Derived data per active city ──────────────────────────────────────────
  const cityPods = pods.filter(p =>
    (p.cities || []).length === 0 || (p.cities || []).includes(activeCity)
  )

  const filtered = cityPods.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Filter orders by matching their items to products available in the active city
  const cityOrders = orders.filter(order => {
    const items = order.items || []
    if (items.length === 0) return true
    return items.some(item => {
      const pod = pods.find(p => p.name === item.name)
      if (!pod) return true
      return (pod.cities || []).length === 0 || (pod.cities || []).includes(activeCity)
    })
  })

  const stats = [
    { label: 'Produtos',   val: cityPods.length,                                    color: '#3b82f6' },
    { label: 'Em Estoque', val: cityPods.filter(p => p.stock_qty > 0).length,       color: '#22c55e' },
    { label: 'Promoções',  val: cityPods.filter(p => p.on_sale).length,             color: '#f59e0b' },
    { label: 'Esgotados',  val: cityPods.filter(p => p.stock_qty === 0).length,     color: '#ef4444' },
  ]

  function switchCity(city) {
    setActiveCity(city)
    setSearch('')
  }

  function switchTab(tab) {
    setActiveTab(tab)
    if (tab === 'orders' || tab === 'sales') fetchOrders()
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
          <p className="text-white/30 text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden w-full" style={{ background: '#050505' }}>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30"
        style={{ background: 'rgba(8,8,11,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Row 1: logo + section tabs + logout */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center">
            <img
              src="/Logo Nova sem fundo.png"
              alt="SmokePods"
              className="h-12 object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' }}
            />
          </div>
          <div className="flex items-center gap-1">
            {[
              { id: 'products', label: '📦' },
              { id: 'orders',   label: '📋' },
              { id: 'sales',    label: '📊' },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => switchTab(tab.id)}
                className="w-9 h-9 rounded-lg text-base transition-all"
                style={{
                  background: activeTab === tab.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                  border: activeTab === tab.id ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                {tab.label}
              </button>
            ))}
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-lg flex items-center justify-center ml-1 text-white/30 hover:text-white/60 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <I.Logout />
            </button>
          </div>
        </div>

        {/* Row 2: city tabs */}
        <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto">
          {CITIES.map(city => (
            <button key={city}
              onClick={() => switchCity(city)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: activeCity === city ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: activeCity === city ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: activeCity === city ? '#93c5fd' : 'rgba(255,255,255,0.4)',
              }}>
              📍 {city}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full w-60 flex-col py-7 px-4 z-20 hidden md:flex"
        style={{
          background: 'rgba(8,8,11,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center px-2 mb-7">
          <img
            src="/Logo Nova sem fundo.png"
            alt="SmokePods"
            className="h-14 object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' }}
          />
        </div>

        {/* City tabs */}
        <div className="mb-2">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.12em] px-2 mb-2">Cidade</p>
          <div className="space-y-0.5">
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => switchCity(city)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: activeCity === city ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: activeCity === city ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                  color: activeCity === city ? '#93c5fd' : 'rgba(255,255,255,0.35)',
                }}
              >
                📍 {city}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 mx-2" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Section tabs */}
        <div className="flex-1">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.12em] px-2 mb-2">Seção</p>
          <div className="space-y-0.5">
            {[
              { id: 'products', label: '📦 Produtos' },
              { id: 'orders',   label: '📋 Pedidos' },
              { id: 'sales',    label: '📊 Vendas' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                  color: activeTab === tab.id ? '#93c5fd' : 'rgba(255,255,255,0.35)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-0.5">
          <a
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            ← Ver Vitrine
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            <I.Logout /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="md:ml-60 flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 pt-[7.5rem] md:pt-8">

        {/* ════ PRODUTOS TAB ════ */}
        {activeTab === 'products' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-1">📍 {activeCity}</p>
                <h1 className="text-white text-2xl font-black tracking-tight">Produtos</h1>
                <p className="text-white/30 text-sm mt-0.5">Gerencie o catálogo de {activeCity}</p>
              </div>
              <button
                onClick={() => setEditTarget(EMPTY)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  boxShadow: '0 0 20px rgba(59,130,246,0.3)',
                }}
              >
                <I.Plus /> Novo Produto
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-black mt-1.5" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full max-w-xs px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-blue-500/40 transition-colors mb-5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-x-auto"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Produto', 'Sabores', 'Preço', 'Promo', 'Estoque', 'Ações'].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5 text-white/25 text-xs font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-white/20 py-12 text-sm">
                          Nenhum produto em {activeCity}.
                        </td>
                      </tr>
                    ) : filtered.map((pod, idx) => (
                      <tr
                        key={pod.id}
                        className="transition-colors hover:bg-white/[0.015]"
                        style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      >
                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                              style={{ background: 'rgba(59,130,246,0.07)' }}
                            >
                              {pod.image_url
                                ? <img src={pod.image_url} alt="" className="w-full h-full object-contain p-1" />
                                : <span className="text-blue-400/20 text-lg">📦</span>
                              }
                            </div>
                            <span className="text-white font-semibold">{pod.name}</span>
                          </div>
                        </td>

                        {/* Flavors */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(pod.flavors || []).slice(0, 2).map((fl) => (
                              <span key={fl}
                                className="px-2 py-0.5 rounded-full text-xs text-blue-300"
                                style={{ background: 'rgba(59,130,246,0.1)' }}
                              >{fl}</span>
                            ))}
                            {(pod.flavors || []).length > 2 && (
                              <span className="px-2 py-0.5 rounded-full text-xs text-white/25">
                                +{pod.flavors.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4">
                          <span className="text-white font-semibold">
                            R$ {Number(pod.price).toFixed(2).replace('.', ',')}
                          </span>
                        </td>

                        {/* Promo */}
                        <td className="px-5 py-4">
                          {pod.on_sale && pod.promo_price ? (
                            <span className="text-blue-400 text-xs font-semibold">
                              R$ {Number(pod.promo_price).toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => quickStock(pod.id, -1, pod.stock_qty)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white border border-white/[0.08] transition-all text-sm font-bold"
                            >−</button>
                            <span
                              className="min-w-[2rem] text-center font-bold text-sm"
                              style={{ color: pod.stock_qty === 0 ? '#ef4444' : pod.stock_qty <= 3 ? '#f59e0b' : '#22c55e' }}
                            >
                              {pod.stock_qty}
                            </span>
                            <button
                              onClick={() => quickStock(pod.id, 1, pod.stock_qty)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white border border-white/[0.08] transition-all text-sm font-bold"
                            >+</button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditTarget(pod)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-blue-400 border border-white/[0.08] hover:border-blue-500/40 transition-all"
                            ><I.Edit /></button>
                            <button
                              onClick={() => setDelTarget(pod)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 border border-white/[0.08] hover:border-red-500/40 transition-all"
                            ><I.Trash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ════ PEDIDOS TAB ════ */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-1">📍 {activeCity}</p>
                <h1 className="text-white text-2xl font-black tracking-tight">Pedidos</h1>
                <p className="text-white/30 text-sm mt-0.5">
                  {cityOrders.length} pedido{cityOrders.length !== 1 ? 's' : ''} em {activeCity}
                </p>
              </div>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : cityOrders.length === 0 ? (
              <div className="text-center text-white/20 py-20 text-sm">
                Nenhum pedido em {activeCity} ainda.
              </div>
            ) : (
              <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Data', 'Itens', 'Total', 'Pagamento', 'Como nos conheceu', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-white/25 text-xs font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cityOrders.map((order, idx) => (
                      <tr key={order.id}
                        className="transition-colors hover:bg-white/[0.015]"
                        style={{ borderBottom: idx < cityOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td className="px-5 py-4 text-white/50 text-xs whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {(order.items || []).map((item, i) => (
                              <div key={i} className="text-xs text-white/70">
                                <span className="font-semibold text-white">{item.name}</span>
                                <span className="text-white/40 mx-1">·</span>
                                <span className="text-blue-400">{item.flavor}</span>
                                <span className="text-white/30 ml-1">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-black text-sm" style={{ color: '#3b82f6' }}>
                            R$ {Number(order.total).toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white/70"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                            {order.payment}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-white/40 text-xs">{order.how_found}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setDelOrderTarget(order)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 border border-white/[0.08] hover:border-red-500/40 transition-all"
                          ><I.Trash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ VENDAS TAB ════ */}
        {activeTab === 'sales' && (
          <div>
            <div className="mb-8">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-1">📍 {activeCity}</p>
              <h1 className="text-white text-2xl font-black tracking-tight">Painel de Vendas</h1>
              <p className="text-white/30 text-sm mt-0.5">Resumo baseado nos pedidos de {activeCity}</p>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : (() => {
              const totalRevenue = cityOrders.reduce((s, o) => s + Number(o.total), 0)
              const totalOrders = cityOrders.length
              const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

              const productCount = {}
              cityOrders.forEach(o => (o.items || []).forEach(item => {
                productCount[item.name] = (productCount[item.name] || 0) + item.qty
              }))
              const topProducts = Object.entries(productCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
              const maxCount = topProducts[0]?.[1] || 1

              const paymentCount = {}
              cityOrders.forEach(o => { paymentCount[o.payment] = (paymentCount[o.payment] || 0) + 1 })

              const sourceCount = {}
              cityOrders.forEach(o => { sourceCount[o.how_found] = (sourceCount[o.how_found] || 0) + 1 })

              return (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Total em Pedidos', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, color: '#3b82f6' },
                      { label: 'Nº de Pedidos',    value: totalOrders,                                        color: '#22c55e' },
                      { label: 'Ticket Médio',     value: `R$ ${avgTicket.toFixed(2).replace('.', ',')}`,    color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl p-5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-black mt-1.5" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent orders */}
                  {cityOrders.length > 0 && (
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <h3 className="text-white font-bold text-sm">🕐 Últimos Pedidos</h3>
                      </div>
                      <div>
                        {cityOrders.slice(0, 10).map((order) => {
                          const d = new Date(order.created_at)
                          const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          const itemsSummary = (order.items || []).map(i => `${i.name} (${i.flavor}) ×${i.qty}`).join(', ')
                          return (
                            <div key={order.id} className="px-5 py-3.5 flex items-center gap-4"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="flex-shrink-0 text-center min-w-[80px]">
                                <p className="text-white font-bold text-xs">{date}</p>
                                <p className="text-blue-400 font-semibold text-xs mt-0.5">{time}</p>
                              </div>
                              <div className="w-px h-8 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-white/70 text-xs truncate">{itemsSummary}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-white/30 text-xs">{order.payment}</span>
                                  <span className="text-white/15 text-xs">·</span>
                                  <span className="text-white/30 text-xs">{order.how_found}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="font-black text-sm" style={{ color: '#3b82f6' }}>
                                  R$ {Number(order.total).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top products */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <h3 className="text-white font-bold text-sm mb-4">🏆 Produtos Mais Pedidos</h3>
                      {topProducts.length === 0 ? (
                        <p className="text-white/20 text-sm">Sem dados ainda.</p>
                      ) : (
                        <div className="space-y-3">
                          {topProducts.map(([name, count]) => (
                            <div key={name}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-white/70 text-xs truncate flex-1 mr-2">{name}</span>
                                <span className="text-blue-400 font-bold text-xs flex-shrink-0">{count}x</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(count / maxCount) * 100}%`,
                                    background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
                                  }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Payment methods */}
                      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 className="text-white font-bold text-sm mb-3">💳 Pagamentos</h3>
                        <div className="space-y-2">
                          {Object.entries(paymentCount).sort((a, b) => b[1] - a[1]).map(([method, count]) => (
                            <div key={method} className="flex justify-between items-center">
                              <span className="text-white/60 text-xs">{method}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white/70"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>{count}</span>
                            </div>
                          ))}
                          {Object.keys(paymentCount).length === 0 && (
                            <p className="text-white/20 text-xs">Sem dados.</p>
                          )}
                        </div>
                      </div>

                      {/* Source */}
                      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 className="text-white font-bold text-sm mb-3">📣 Como nos conheceu</h3>
                        <div className="space-y-2">
                          {Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                            <div key={source} className="flex justify-between items-center">
                              <span className="text-white/60 text-xs">{source}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white/70"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>{count}</span>
                            </div>
                          ))}
                          {Object.keys(sourceCount).length === 0 && (
                            <p className="text-white/20 text-xs">Sem dados.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>

      {/* ── Edit / Create Modal ─────────────────────────────────────── */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget?.id ? `Editar Produto — ${activeCity}` : `Novo Produto — ${activeCity}`}
      >
        {editTarget !== null && (
          <ProductForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => setEditTarget(null)}
            saving={saving}
          />
        )}
      </Modal>

      {/* ── Delete order confirm ────────────────────────────────────── */}
      <Modal open={delOrderTarget !== null} onClose={() => setDelOrderTarget(null)} title="Excluir Pedido">
        <p className="text-white/50 text-sm mb-6">
          Excluir o pedido de{' '}
          <span className="text-white font-semibold">
            R$ {Number(delOrderTarget?.total || 0).toFixed(2).replace('.', ',')}
          </span>? Esta ação é irreversível.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDelOrderTarget(null)}
            className="flex-1 py-3 rounded-xl text-sm text-white/40 border border-white/[0.08] hover:border-white/20 transition-colors">
            Cancelar
          </button>
          <button onClick={handleDeleteOrder}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
            Excluir
          </button>
        </div>
      </Modal>

      {/* ── Delete product confirm ──────────────────────────────────── */}
      <Modal open={delTarget !== null} onClose={() => setDelTarget(null)} title="Confirmar Exclusão">
        <p className="text-white/50 text-sm mb-6">
          Excluir <span className="text-white font-semibold">"{delTarget?.name}"</span>? Esta ação é irreversível.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDelTarget(null)}
            className="flex-1 py-3 rounded-xl text-sm text-white/40 border border-white/[0.08] hover:border-white/20 transition-colors">
            Cancelar
          </button>
          <button onClick={handleDelete}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  )
}
