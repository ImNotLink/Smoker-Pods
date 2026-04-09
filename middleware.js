// middleware.js — desativado intencionalmente
// A proteção do /admin é feita diretamente no app/admin/page.js
// via supabase.auth.getSession() no lado do cliente.
export function middleware() {}
export const config = { matcher: [] }
