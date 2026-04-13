// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Smoke Pods] Variáveis de ambiente do Supabase não encontradas.\n' +
    'Crie o arquivo .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

// ─── Cliente público (browser) ────────────────────────────────────────────────
// Usa a anon key — seguro para uso no frontend.
// O RLS do Supabase garante que nenhum dado protegido seja exposto.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// ─── Upload de imagem para Storage ───────────────────────────────────────────
// Retorna a URL pública da imagem após upload bem-sucedido.
export async function uploadProductImage(file) {
  const fileExt = file.name.split('.').pop().toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'avif']

  if (!allowed.includes(fileExt)) {
    throw new Error('Formato inválido. Use JPG, PNG, WEBP ou AVIF.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Imagem muito grande. Máximo permitido: 5MB.')
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `products/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('pod-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('pod-images').getPublicUrl(filePath)
  return data.publicUrl
}

// ─── Deletar imagem do Storage ────────────────────────────────────────────────
export async function deleteProductImage(imageUrl) {
  if (!imageUrl) return
  try {
    const url = new URL(imageUrl)
    const parts = url.pathname.split('/pod-images/')
    if (parts[1]) {
      await supabase.storage.from('pod-images').remove([parts[1]])
    }
  } catch {
    // URL inválida — ignora silenciosamente
  }
}
