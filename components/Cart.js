'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ⚠️  SUBSTITUA pelo número real com DDI+DDD (sem espaços ou hífen)
const WHATSAPP_NUMBER = '559991036173'

const PAYMENT_OPTIONS = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito']
const HOW_FOUND_OPTIONS = ['Instagram', 'Indicação de amigo', 'Google', 'TikTok', 'Facebook', 'Outro']

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}
function WAIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

export default function Cart({ open, onClose, items, setItems, availableFlavors = [] }) {
  const [payment, setPayment] = useState('')
  const [howFound, setHowFound] = useState('')
  const [formError, setFormError] = useState('')


  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const uniqueFlavors = Array.from(new Set(availableFlavors.map(f => f?.trim()).filter(Boolean))).sort()

  function removeItem(key) {
    setItems(prev => prev.filter(i => i.cartKey !== key))
  }

  function changeQty(key, delta) {
    setItems(prev =>
      prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    )
  }

  function checkout() {
    setFormError('')
    if (!payment) { setFormError('Selecione a forma de pagamento.'); return }
    if (!howFound) { setFormError('Informe como nos conheceu.'); return }
    if (items.length === 0) { setFormError('Seu carrinho está vazio.'); return }

    const lines = [
      '🛒 *Novo Pedido — Smoke Pods*',
      '',
      '*Itens:*',
      ...items.map((i, n) =>
        `${n + 1}. *${i.name}*\n   Sabor: ${i.selectedFlavor}\n   Qtd: ${i.qty}x\n   Valor: R$ ${(i.unitPrice * i.qty).toFixed(2).replace('.', ',')}`
      ),
      '',
      `💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`,
      `💳 *Pagamento:* ${payment}`,
      `📣 *Como nos conheceu:* ${howFound}`,
      '',
      '_Aguardo a confirmação! 🙏_',
    ]

    // Salva pedido em background sem bloquear o redirecionamento
    supabase.from('orders').insert({
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        flavor: i.selectedFlavor,
        qty: i.qty,
        unit_price: i.unitPrice,
        subtotal: i.unitPrice * i.qty,
      })),
      total: parseFloat(total.toFixed(2)),
      payment,
      how_found: howFound,
    }).catch(e => console.error('Erro ao salvar pedido:', e))

    setItems([])
    setPayment('')
    setHowFound('')
    onClose()

    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const sel = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: 'white',
    borderRadius: '0.75rem',
    padding: '10px 14px',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: open ? 'rgba(0,0,0,0.72)' : 'transparent',
          backdropFilter: open ? 'blur(5px)' : 'none',
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <aside
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: 'rgba(9,9,12,0.97)',
          backdropFilter: 'blur(30px)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 380ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="text-white font-bold text-lg">Carrinho</h2>
            <p className="text-white/35 text-xs mt-0.5">
              {totalQty === 0 ? 'Nenhum item' : `${totalQty} item${totalQty > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all">
            <XIcon />
          </button>
        </div>

        {uniqueFlavors.length > 0 && (
          <div className="px-5 py-4 border-b border-white/[0.08]">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Sabores disponíveis</p>
            <div className="flex flex-wrap gap-2">
              {uniqueFlavors.map((flavor) => (
                <span key={flavor} className="px-3 py-2 rounded-full text-xs font-semibold text-white"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)' }}>
                  {flavor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p className="text-sm">Seu carrinho está vazio</p>
            </div>
          ) : items.map(item => (
            <div key={item.cartKey} className="flex gap-3 p-3.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.08)' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                  : <span className="text-2xl">📦</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                <p className="text-blue-400 text-xs mt-0.5">{item.selectedFlavor}</p>
                <p className="text-white font-bold text-sm mt-1.5">
                  R$ {(item.unitPrice * item.qty).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button onClick={() => removeItem(item.cartKey)} className="text-white/20 hover:text-red-400 transition-colors">
                  <TrashIcon />
                </button>
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => changeQty(item.cartKey, -1)} className="px-2.5 py-1 text-white/50 hover:text-white text-sm transition-colors">−</button>
                  <span className="px-2 text-white text-xs font-bold min-w-[1.5rem] text-center">{item.qty}</span>
                  <button onClick={() => changeQty(item.cartKey, 1)} className="px-2.5 py-1 text-white/50 hover:text-white text-sm transition-colors">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-5 py-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">Total</span>
              <span className="font-black text-xl" style={{ color: '#3b82f6' }}>
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div>
              <label className="block text-white/35 text-xs font-semibold uppercase tracking-widest mb-1.5">Forma de Pagamento *</label>
              <select value={payment} onChange={e => setPayment(e.target.value)} style={sel}>
                <option value="" disabled>Selecione...</option>
                {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white/35 text-xs font-semibold uppercase tracking-widest mb-1.5">Como nos conheceu? *</label>
              <select value={howFound} onChange={e => setHowFound(e.target.value)} style={sel}>
                <option value="" disabled>Selecione...</option>
                {HOW_FOUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <button
              onClick={checkout}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-white text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 30px rgba(34,197,94,0.25)' }}
            >
              <WAIcon />
              Finalizar pelo WhatsApp
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
