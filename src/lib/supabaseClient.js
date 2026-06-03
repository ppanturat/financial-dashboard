import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: will show in console whether vars loaded
console.log('[supabase] URL:', url ? url.slice(0, 30) + '...' : 'MISSING')
console.log('[supabase] KEY:', key ? key.slice(0, 10) + '...' : 'MISSING')

if (!url || !key) {
  console.error('[supabase] ENV VARS MISSING — check Vercel environment variables')
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder'
)