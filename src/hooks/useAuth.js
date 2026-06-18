import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// ─────────────────────────────────────────────────────────────────────────────
// ensureProfile — upserts a row in `profiles` for a newly signed-in user.
// Never throws — called in background, never blocks auth flow.
// ─────────────────────────────────────────────────────────────────────────────
async function ensureProfile(user) {
  if (!user) return
  try {
    const meta     = user.user_metadata || {}
    const name     = meta.name || meta.full_name || ''
    const username = meta.username || ''

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, name, username')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) {
      await supabase.from('profiles').insert({ id: user.id, name, username })
    } else if (!existing.name && name) {
      await supabase.from('profiles').update({ name, username }).eq('id', user.id)
    }
  } catch {
    // Profile upsert is non-critical — silently ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function useAuth() {
  // undefined = still resolving, null = no active session, object = authenticated
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let loadingDone = false

    const markLoaded = () => {
      if (!loadingDone) {
        loadingDone = true
        setLoading(false)
      }
    }

    // FIX: Reduced from 5 000 ms → 3 000 ms.
    // Supabase fires INITIAL_SESSION within ~1 s when a session exists.
    // 3 s is a safe upper bound for slow connections; 5 s was excessive.
    const timeout = setTimeout(() => {
      setSession(null)
      markLoaded()
    }, 3000)

    // FIX: Wrap onAuthStateChange in try/catch so a misconfigured Supabase
    // URL (e.g. env vars missing) doesn't crash the whole app on mount.
    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange((event, s) => {
        clearTimeout(timeout)
        setSession(s ?? null)
        markLoaded()

        if (
          s?.user &&
          (event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED' ||
            event === 'INITIAL_SESSION')
        ) {
          ensureProfile(s.user)
        }
      })
      subscription = data?.subscription
    } catch (err) {
      // onAuthStateChange itself threw — treat as "no session"
      console.warn('[useAuth] onAuthStateChange error:', err)
      clearTimeout(timeout)
      setSession(null)
      markLoaded()
    }

    return () => {
      clearTimeout(timeout)
      try { subscription?.unsubscribe() } catch {}
    }
  }, [])

  // ── signIn ─────────────────────────────────────────────────────────────────
  // FIX: Wrapped in try/catch. Previously any network error / CORS issue /
  // thrown exception would leave the "Signing in…" button permanently disabled
  // because setLoading(false) was never called in the calling component.
  // We now return a normalised { data, error } object in ALL cases.
  const signIn = async (email, password) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      // Normalise: if result isn't a real {data,error} object (e.g. noop proxy
      // returned the proxy itself), coerce into a safe shape.
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        if (result.data?.user) ensureProfile(result.data.user)
        return result
      }
      // Got something unexpected back — treat as auth failure
      return { data: null, error: { message: 'Sign in failed. Please try again.' } }
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Network error. Please check your connection and try again.' } }
    }
  }

  // ── signUp ─────────────────────────────────────────────────────────────────
  // FIX: Same try/catch treatment.
  const signUp = async (email, password, name, username) => {
    try {
      // Check username uniqueness first
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .maybeSingle()

      if (checkError && checkError.message !== 'Supabase is not configured.') {
        // A real DB error (not the noop error)
        return { data: null, error: { message: 'Could not verify username. Please try again.' } }
      }

      if (existing) {
        return { data: null, error: { message: 'Username @' + username + ' is already taken. Please choose another.' } }
      }

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name, username: username.toLowerCase().trim() },
        },
      })

      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        if (result.data?.user) ensureProfile(result.data.user)
        return result
      }

      return { data: null, error: { message: 'Registration failed. Please try again.' } }
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Network error. Please check your connection and try again.' } }
    }
  }

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Force local session clear even if signOut API call fails
      setSession(null)
    }
  }

  return { session, loading, signIn, signUp, signOut }
}
