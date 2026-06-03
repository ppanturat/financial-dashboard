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
    let loadingDone = false

    const markLoaded = () => {
      if (!loadingDone) {
        loadingDone = true
        setLoading(false)
      }
    }

    // Fallback: if no auth event fires within 5s, unblock the UI
    const timeout = setTimeout(() => {
      setSession(null)
      markLoaded()
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      clearTimeout(timeout)

      // Unblock UI immediately — don't await ensureProfile
      setSession(s ?? null)
      markLoaded()

      // Run profile upsert in background, never blocking render
      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        ensureProfile(s.user).catch(() => {})
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.user) ensureProfile(result.data.user).catch(() => {})
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
      ensureProfile(result.data.user).catch(() => {})
    }

    return result
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
