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
  Logo:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#ag)"/><defs><linearGradient id="ag" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#ec4899"/></linearGradient></defs></svg>,
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const EMPTY = { name: '', price: '', promo_price: '', on_sale: false, stock_qty: '', image_url: '', flavors: [] }

// ─── UI helpers ────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-colors border border-white/[0.08] focus:border-purple-500/50 placeholder-white/20'
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
          boxShadow: '0 0 100px rgba(139,92,246,0.2)',
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
  const [f, setF] = useState(initial || EMPTY)
  const [fi, setFi] = useState('')          // flavor input
  const [imgFile, setImgFile] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  function addFlavor() {
    const trimmed = fi.trim()
    if (!trimmed || f.flavors.includes(trimmed)) return
    set('flavors', [...f.flavors, trimmed])
    setFi('')
  }

  function handleImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.price || f.stock_qty === '') return

    setUploading(true)
    let imageUrl = f.image_url

    if (imgFile) {
      try { imageUrl = await uploadProductImage(imgFile) }
      catch (err) { alert('Erro no upload: ' + err.message); setUploading(false); return }
    }

    onSave({ ...f, image_url: imageUrl })
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
            background: 'rgba(139,92,246,0.04)',
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

      {/* Stock + On sale */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Estoque *</label>
          <input
            className={inputCls} style={inputStyle}
            type="number" min="0"
            value={f.stock_qty}
            onChange={(e) => set('stock_qty', e.target.value)}
            placeholder="0" required
          />
        </div>
        <div>
          <label className={labelCls}>Promoção ativa</label>
          <button
            type="button"
            onClick={() => set('on_sale', !f.on_sale)}
            className="w-full h-[42px] rounded-xl text-sm font-semibold transition-all"
            style={{
              background: f.on_sale ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: f.on_sale ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: f.on_sale ? '#c084fc' : 'rgba(255,255,255,0.35)',
            }}
          >
            {f.on_sale ? '✓ Ativa' : 'Inativa'}
          </button>
        </div>
      </div>

      {/* Flavors */}
      <div>
        <label className={labelCls}>Sabores</label>
        <div className="flex gap-2 mb-2">
          <input
            className={`${inputCls} flex-1`} style={inputStyle}
            value={fi}
            onChange={(e) => setFi(e.target.value)}
            placeholder="Ex: Menta Gelada"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFlavor() } }}
          />
          <button
            type="button" onClick={addFlavor}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >+ Add</button>
        </div>
        {f.flavors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {f.flavors.map((fl) => (
              <span
                key={fl}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-purple-300"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}
              >
                {fl}
                <button
                  type="button"
                  onClick={() => set('flavors', f.flavors.filter((x) => x !== fl))}
                  className="text-purple-400/40 hover:text-red-400 transition-colors leading-none text-base"
                >×</button>
              </span>
            ))}
          </div>
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
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // null=closed | {}=new | pod=edit
  const [delTarget, setDelTarget] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchPods() }, [])

  async function fetchPods() {
    const { data } = await supabase.from('pods').select('*').order('created_at', { ascending: false })
    setPods(data || [])
    setLoading(false)
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
      stock_qty: parseInt(form.stock_qty),
      image_url: form.image_url || null,
      flavors: form.flavors,
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
    { label: 'Produtos',   val: pods.length,                                  color: '#a855f7' },
    { label: 'Em Estoque', val: pods.filter(p => p.stock_qty > 0).length,     color: '#22c55e' },
    { label: 'Promoções',  val: pods.filter(p => p.on_sale).length,           color: '#f59e0b' },
    { label: 'Esgotados',  val: pods.filter(p => p.stock_qty === 0).length,   color: '#ef4444' },
  ]

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
          <I.Logo />
          <span className="text-white font-black text-base tracking-tight">
            Smoker<span style={{ color: '#a855f7' }}>Pods</span>
          </span>
        </div>

        <div className="flex-1">
          <div
            className="px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: '#c084fc',
            }}
          >
            📦 Produtos
          </div>
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
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 0 20px rgba(139,92,246,0.3)',
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
          className="w-full max-w-xs px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-purple-500/40 transition-colors mb-5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(168,85,247,0.3)', borderTopColor: '#a855f7' }} />
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
                          style={{ background: 'rgba(139,92,246,0.07)' }}
                        >
                          {pod.image_url
                            ? <img src={pod.image_url} alt="" className="w-full h-full object-contain p-1" />
                            : <span className="text-purple-400/20 text-lg">📦</span>
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
                            className="px-2 py-0.5 rounded-full text-xs text-purple-300"
                            style={{ background: 'rgba(139,92,246,0.1)' }}
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
                        <span className="text-purple-400 text-xs font-semibold">
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
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-purple-400 border border-white/[0.08] hover:border-purple-500/40 transition-all"
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

      {/* Edit / Create Modal */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget?.id ? 'Editar Produto' : 'Novo Produto'}
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

      {/* Delete confirm */}
      <Modal
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        title="Confirmar Exclusão"
      >
        <p className="text-white/50 text-sm mb-6">
          Excluir <span className="text-white font-semibold">"{delTarget?.name}"</span>?
          A imagem também será removida do Storage. Esta ação é irreversível.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDelTarget(null)}
            className="flex-1 py-3 rounded-xl text-sm text-white/40 border border-white/[0.08] hover:border-white/20 transition-colors"
          >Cancelar</button>
          <button
            onClick={handleDelete}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
          >Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
