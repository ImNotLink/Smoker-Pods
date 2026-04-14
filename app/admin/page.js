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
const EMPTY = { name: '', price: '', promo_price: '', on_sale: false, stock_qty: '0', image_url: '', flavors: [], flavor_stock: {} }

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
  }))
  const [fi, setFi] = useState('')
  const [imgFile, setImgFile] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  // Calcula stock_qty como soma de todos os sabores
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

      {/* On sale only (stock is now per-flavor) */}
      <div>
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
      </div>

      {/* Flavors + Stock Table */}
      <div>
        <label className={labelCls}>Sabores & Estoque por Sabor</label>

        {/* Add flavor input */}
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

        {/* Flavor stock table */}
        {f.flavors.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_100px_36px] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/30"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span>Sabor</span>
              <span className="text-center">Estoque</span>
              <span></span>
            </div>
            {/* Rows */}
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
            {/* Total row */}
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
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('products')

  // ── Proteção client-side: verifica sessão antes de mostrar qualquer coisa ──
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

  // Escuta mudanças de auth (ex: token expirado)
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
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
      on_sale: form.on_sale,
      stock_qty: form.stock_qty || 0,
      image_url: form.image_url || null,
      flavors: form.flavors,
      flavor_stock: form.flavor_stock || {},
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
    await supabase.from('pods').update({ stock_qty: newQty }).eq('id', id)
    fetchPods()
  }

  const filtered = pods.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const stats = [
    { label: 'Produtos',   val: pods.length,                                  color: '#3b82f6' },
    { label: 'Em Estoque', val: pods.filter(p => p.stock_qty > 0).length,     color: '#22c55e' },
    { label: 'Promoções',  val: pods.filter(p => p.on_sale).length,           color: '#f59e0b' },
    { label: 'Esgotados',  val: pods.filter(p => p.stock_qty === 0).length,   color: '#ef4444' },
  ]

  // Não renderiza nada até confirmar autenticação
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
    <div className="min-h-screen flex" style={{ background: '#050505' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full w-56 flex flex-col py-7 px-4 z-20"
        style={{
          background: 'rgba(8,8,11,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2 px-2 mb-8">
          <img
            src="/Logo_pod.png"
            alt="SmokePods"
            className="w-7 h-7 object-contain flex-shrink-0"
            style={{ filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' }}
          />
          <span className="font-black text-base tracking-tight flex items-center gap-1.5">
            <span style={{ color: '#9ca3af' }}>Smoke</span><span style={{ color: '#ffffff', textShadow: '0 0 12px #60a5fa, 0 0 24px #3b82f6' }}>Pods</span>
            <I.Logo />
          </span>
        </div>

        <div className="flex-1 space-y-1">
          {[
            { id: 'products', label: '📦 Produtos' },
            { id: 'orders',   label: '📋 Pedidos' },
            { id: 'sales',    label: '📊 Vendas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'orders' || tab.id === 'sales') fetchOrders()
              }}
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

        <div className="space-y-1">
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

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="ml-56 flex-1 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight">Produtos</h1>
            <p className="text-white/30 text-sm mt-0.5">Gerencie o catálogo da loja</p>
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
        <div className="grid grid-cols-4 gap-4 mb-8">
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
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <table className="w-full text-sm">
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
                  <tr><td colSpan={6} className="text-center text-white/20 py-12 text-sm">Nenhum produto.</td></tr>
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
                        {pod.flavors.slice(0, 2).map((fl) => (
                          <span key={fl}
                            className="px-2 py-0.5 rounded-full text-xs text-blue-300"
                            style={{ background: 'rgba(59,130,246,0.1)' }}
                          >{fl}</span>
                        ))}
                        {pod.flavors.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs text-white/25">+{pod.flavors.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4">
                      <span className="text-white font-semibold">R$ {pod.price.toFixed(2).replace('.', ',')}</span>
                    </td>

                    {/* Promo */}
                    <td className="px-5 py-4">
                      {pod.on_sale && pod.promo_price ? (
                        <span className="text-blue-400 text-xs font-semibold">
                          R$ {pod.promo_price.toFixed(2).replace('.', ',')}
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
      </main>

       

        {/* ════ PEDIDOS TAB ════ */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-white text-2xl font-black tracking-tight">Pedidos</h1>
                <p className="text-white/30 text-sm mt-0.5">{orders.length} pedido{orders.length !== 1 ? 's' : ''} registrado{orders.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center text-white/20 py-20 text-sm">Nenhum pedido ainda.</div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Data', 'Itens', 'Total', 'Pagamento', 'Como nos conheceu'].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-white/25 text-xs font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr key={order.id}
                        className="transition-colors hover:bg-white/[0.015]"
                        style={{ borderBottom: idx < orders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
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
              <h1 className="text-white text-2xl font-black tracking-tight">Painel de Vendas</h1>
              <p className="text-white/30 text-sm mt-0.5">Resumo baseado nos pedidos registrados</p>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
              </div>
            ) : (() => {
              // Calcula métricas
              const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0)
              const totalOrders = orders.length
              const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

              // Produtos mais pedidos
              const productCount = {}
              orders.forEach(o => (o.items || []).forEach(item => {
                const key = item.name
                productCount[key] = (productCount[key] || 0) + item.qty
              }))
              const topProducts = Object.entries(productCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
              const maxCount = topProducts[0]?.[1] || 1

              // Pagamentos
              const paymentCount = {}
              orders.forEach(o => { paymentCount[o.payment] = (paymentCount[o.payment] || 0) + 1 })

              // Como nos conheceu
              const sourceCount = {}
              orders.forEach(o => { sourceCount[o.how_found] = (sourceCount[o.how_found] || 0) + 1 })

              return (
                <div className="space-y-6">
                  {/* Cards de resumo */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total em Pedidos', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, color: '#3b82f6' },
                      { label: 'Nº de Pedidos', value: totalOrders, color: '#22c55e' },
                      { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2).replace('.', ',')}`, color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl p-5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-black mt-1.5" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Produtos mais pedidos */}
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
                      {/* Formas de pagamento */}
                      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 className="text-white font-bold text-sm mb-3">💳 Pagamentos</h3>
                        <div className="space-y-2">
                          {Object.entries(paymentCount).sort((a,b)=>b[1]-a[1]).map(([method, count]) => (
                            <div key={method} className="flex justify-between items-center">
                              <span className="text-white/60 text-xs">{method}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white/70"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>{count}</span>
                            </div>
                          ))}
                          {Object.keys(paymentCount).length === 0 && <p className="text-white/20 text-xs">Sem dados.</p>}
                        </div>
                      </div>

                      {/* Como nos conheceu */}
                      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 className="text-white font-bold text-sm mb-3">📣 Como nos conheceu</h3>
                        <div className="space-y-2">
                          {Object.entries(sourceCount).sort((a,b)=>b[1]-a[1]).map(([source, count]) => (
                            <div key={source} className="flex justify-between items-center">
                              <span className="text-white/60 text-xs">{source}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white/70"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>{count}</span>
                            </div>
                          ))}
                          {Object.keys(sourceCount).length === 0 && <p className="text-white/20 text-xs">Sem dados.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      {/* Edit / Create Modal */}
      <Modal open={editTarget !== null} onClose={() => setEditTarget(null)}
        title={editTarget?.id ? 'Editar Produto' : 'Novo Produto'}>
        {editTarget !== null && (
          <ProductForm initial={editTarget} onSave={handleSave} onCancel={() => setEditTarget(null)} saving={saving} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={delTarget !== null} onClose={() => setDelTarget(null)} title="Confirmar Exclusão">
        <p className="text-white/50 text-sm mb-6">
          Excluir <span className="text-white font-semibold">"{delTarget?.name}"</span>? Esta ação é irreversível.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDelTarget(null)}
            className="flex-1 py-3 rounded-xl text-sm text-white/40 border border-white/[0.08] hover:border-white/20 transition-colors">Cancelar</button>
          <button onClick={handleDelete}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
