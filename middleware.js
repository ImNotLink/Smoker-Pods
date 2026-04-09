// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Revalida a sessão a cada request (refresh automático do token JWT)
  const { data: { session } } = await supabase.auth.getSession()

  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = req.nextUrl.pathname === '/login'

  // Protege /admin — redireciona para login se não autenticado
  if (isAdminRoute && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redireciona admin logado que acessa /login
  if (isLoginPage && session) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
