import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

async function ensureProfile(user) {
  if (!user) return
  const meta = user.user_metadata || {}
  const name = meta.name || meta.full_name || ''
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
}

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = unknown, null = no session
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION reliably — use it as the
    // source of truth. getSession() is only a fallback if the event
    // never arrives (e.g. network error).
    let loadingDone = false

    const markLoaded = () => {
      if (!loadingDone) {
        loadingDone = true
        setLoading(false)
      }
    }

    // Fallback timeout in case auth events never fire
    const timeout = setTimeout(() => {
      setSession(null)
      markLoaded()
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      clearTimeout(timeout)

      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        try { await ensureProfile(s.user) } catch (_) {}
      }

      setSession(s ?? null)
      markLoaded()
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.user) await ensureProfile(result.data.user)
    return result
  }

  const signUp = async (email, password, name, username) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return { error: { message: 'Username @' + username + ' is already taken. Please choose another.' } }
    }

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, username: username.toLowerCase().trim() },
      },
    })

    if (result.data?.user && !result.data?.user?.identities?.[0]?.identity_data?.email_verified === false) {
      await ensureProfile(result.data.user)
    }

    return result
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
