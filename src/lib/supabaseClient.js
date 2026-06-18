import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// ─────────────────────────────────────────────────────────────────────────────
// Noop client — used when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent.
//
// FIX: The previous proxy version returned other Proxy objects from every call,
// which are NOT Promises. Code that does:
//   const { error } = await supabase.auth.signInWithPassword(...)
// would await a Proxy (resolves immediately to the Proxy itself), then destructure
// { error } from it — getting a truthy Proxy getter instead of null/Error — causing
// silent broken behaviour or an infinite loading state.
//
// This version returns real Promise.resolve({ data, error }) from every auth method,
// and a real subscription object from onAuthStateChange, so all callers behave
// correctly even when Supabase isn't configured.
// ─────────────────────────────────────────────────────────────────────────────

const NOT_CONFIGURED = new Error(
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
)

function noopClient() {
  const noData = () => Promise.resolve({ data: null, error: NOT_CONFIGURED })

  // Auth namespace — every method returns Promise<{data, error}>
  const auth = {
    signInWithPassword: noData,
    signUp:             noData,
    signOut:            noData,
    getSession:         () => Promise.resolve({ data: { session: null }, error: null }),
    getUser:            () => Promise.resolve({ data: { user: null }, error: null }),
    // onAuthStateChange must return { data: { subscription: { unsubscribe } } }
    // so useAuth can call subscription.unsubscribe() in cleanup without crashing.
    onAuthStateChange: (callback) => {
      // Fire immediately with null session so the app unblocks right away
      // instead of waiting for the 5-second timeout in useAuth.
      setTimeout(() => callback('INITIAL_SESSION', null), 0)
      return {
        data: {
          subscription: { unsubscribe: () => {} },
        },
      }
    },
  }

  // from() query builder — all terminal methods return noData()
  const queryBuilder = () => {
    const q = {
      select:    () => q,
      insert:    noData,
      update:    noData,
      upsert:    noData,
      delete:    noData,
      eq:        () => q,
      neq:       () => q,
      in:        () => q,
      limit:     () => q,
      single:    noData,
      maybeSingle: noData,
    }
    return q
  }

  // storage namespace
  const storage = {
    from: () => ({
      upload:       noData,
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  }

  return { auth, from: queryBuilder, storage }
}

// ─────────────────────────────────────────────────────────────────────────────

export const supabase = (url && key)
  ? createClient(url, key, {
      auth: {
        persistSession:    true,
        storageKey:        'sb-session',
        storage:           window.localStorage,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
      },
    })
  : noopClient()
