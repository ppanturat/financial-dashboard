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
    let settled = false

    const settle = (s) => {
      if (settled) return
      settled = true
      setSession(s ?? null)
      setLoading(false)
    }

    // Timeout: if Supabase doesn't respond in 5s, treat as logged out
    const timeout = setTimeout(() => settle(null), 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        try { await ensureProfile(session.user) } catch (_) {}
      }
      settle(session)
    }).catch(() => {
      clearTimeout(timeout)
      settle(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        try { await ensureProfile(s.user) } catch (_) {}
      }
      settle(s)
      // allow future updates after first settle
      settled = false
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