'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      // Mensagem genérica intencional — não revela se o e-mail existe
      setError('Credenciais inválidas. Tente novamente.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#050505' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.13) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Card */}
        <div
          className="rounded-[2rem] p-8 border border-white/[0.07]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 40px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#lg1)" />
                <defs>
                  <linearGradient id="lg1" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <span
                className="text-2xl font-black tracking-tight text-white"
                style={{ letterSpacing: '-0.02em' }}
              >
                Smoker<span style={{ color: '#a855f7' }}>Pods</span>
              </span>
            </div>
            <p className="text-white/30 text-sm">Acesso restrito — área administrativa</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smokerpods.com"
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-purple-500/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>

            <div>
              <label className="block text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-purple-500/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm border border-red-500/20 text-red-400"
                style={{ background: 'rgba(239,68,68,0.07)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                backgroundSize: '200% 200%',
                boxShadow: '0 0 30px rgba(168,85,247,0.3)',
              }}
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          Smoker Pods © {new Date().getFullYear()} · Acesso Protegido
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
