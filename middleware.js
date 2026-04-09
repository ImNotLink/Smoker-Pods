import { NextResponse } from 'next/server'

export async function middleware(req) {
  const { pathname } = req.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/login'

  if (!isAdminRoute && !isLoginPage) return NextResponse.next()

  // Lê o cookie de sessão do Supabase diretamente
  const cookieHeader = req.headers.get('cookie') || ''
  const hasSession = cookieHeader.includes('sb-') && cookieHeader.includes('-auth-token')

  if (isAdminRoute && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
