'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  // Se já tiver sessão ativa, vai direto pro admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace('/admin')
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    if (data?.session) {
      window.location.replace('/admin')
    } else {
      setError('Sessão não iniciada. Tente novamente.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(168,85,247,0.4)', borderTopColor: '#a855f7' }} />
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#050505' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(29,78,216,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[400px]">
        <div
          className="rounded-[2rem] p-8 border border-white/[0.07]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 40px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl font-black tracking-tight flex items-center gap-1.5" style={{ letterSpacing: '-0.02em' }}>
                <span style={{ color: '#9ca3af' }}>Smoke</span><span style={{ color: '#ffffff', textShadow: '0 0 12px #60a5fa, 0 0 24px #3b82f6' }}>Pods</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#lg1)" />
                  <defs>
                    <linearGradient id="lg1" x1="4.5" y1="2" x2="19.5" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </svg>
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
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-blue-500/50 transition-colors"
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
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/[0.08] focus:border-blue-500/50 transition-colors"
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
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
                boxShadow: '0 0 30px rgba(59,130,246,0.3)',
              }}
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          SmokePods © {new Date().getFullYear()} · Acesso Protegido
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
