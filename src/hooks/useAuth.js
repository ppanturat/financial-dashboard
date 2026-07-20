import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// upserts a row in `profiles` for a newly signed-in user; never throws, runs in the background
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
      await supabase.from('profiles').update({ name }).eq('id', user.id)
    } else if (!existing.username && username) {
      await supabase.from('profiles').update({ username }).eq('id', user.id)
    }
  } catch (err) {
    // non-critical background sync, log but don't block the auth flow
    console.warn('[ensureProfile] failed:', err)
  }
}

export function useAuth() {
  // undefined = still resolving, null = no active session, object = authenticated
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let loadingDone = false

    const markLoaded = () => {
      if (!loadingDone) {
        loadingDone = true
        setLoading(false)
      }
    }

    // supabase fires INITIAL_SESSION within ~1s when a session exists; 3s covers slow connections
    const timeout = setTimeout(() => {
      setSession(null)
      markLoaded()
    }, 3000)

    // guards against a misconfigured supabase URL crashing the app on mount
    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange((event, s) => {
        clearTimeout(timeout)
        setSession(s ?? null)
        markLoaded()

        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true)
        }

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
      // treat as "no session"
      console.warn('[useAuth] onAuthStateChange error:', err)
      clearTimeout(timeout)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(null)
      markLoaded()
    }

    return () => {
      clearTimeout(timeout)
      try { subscription?.unsubscribe() } catch { /* already unsubscribed / noop client — non-critical, ignore */ }
    }
  }, [])

  // always returns a normalised { data, error } object, never throws, so
  // the caller's loading state is never left stuck on failure
  const signIn = async (email, password) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        if (result.data?.user) ensureProfile(result.data.user)
        return result
      }
      return { data: null, error: { message: 'Sign in failed. Please try again.' } }
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Network error. Please check your connection and try again.' } }
    }
  }

  const signUp = async (email, password, name, username) => {
    try {
      // check username uniqueness first
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .maybeSingle()

      if (checkError && checkError.message !== 'Supabase is not configured.') {
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

  // ── resetPassword ──────────────────────────────────────────────────────────
  const resetPassword = async (email) => {
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        return result
      }
      return { data: null, error: { message: 'Could not send reset email. Please try again.' } }
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Network error. Please check your connection and try again.' } }
    }
  }

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // force local session clear even if the signOut call fails
      setSession(null)
    }
  }

  // ── updatePassword ─────────────────────────────────────────────────────────
  const updatePassword = async (newPassword) => {
    try {
      const result = await supabase.auth.updateUser({ password: newPassword })
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        if (!result.error) setPasswordRecovery(false)
        return result
      }
      return { data: null, error: { message: 'Could not update password. Please try again.' } }
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Network error. Please check your connection and try again.' } }
    }
  }

  return { session, loading, signIn, signUp, signOut, resetPassword, passwordRecovery, updatePassword }
}
