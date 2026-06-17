import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Guard: createClient throws synchronously if url is undefined/empty.
// When Supabase env vars aren't configured we export a no-op proxy so the
// rest of the app (charts, news, assessment engine, etc.) still loads fine.
// Any code that actually calls supabase methods will get a console warning
// rather than a hard crash.
function makeNoopProxy(label) {
  const warn = () => {
    console.warn(`[supabase] ${label} — VITE_SUPABASE_URL is not set. Supabase features are disabled.`)
    return Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  }
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'auth') return makeNoopProxy('auth')
      if (prop === 'storage') return makeNoopProxy('storage')
      if (typeof prop === 'string') return () => makeNoopProxy(prop)
      return warn
    },
  })
}

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        storageKey: 'sb-session',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : makeNoopProxy('client')