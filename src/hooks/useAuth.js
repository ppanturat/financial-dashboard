import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Ensure a row exists in public.profiles for this user.
// Called after every successful sign-in or sign-up confirmation.
async function ensureProfile(user) {
  if (!user) return

  // Read whatever name/username was stored in auth metadata
  const meta = user.user_metadata || {}
  const name = meta.name || meta.full_name || ''
  const username = meta.username || ''

  // Check if a profile row already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, name, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    // Row doesn't exist yet — create it
    await supabase.from('profiles').insert({
      id: user.id,
      name,
      username,
    })
  } else if (!existing.name && name) {
    // Row exists but name/username are empty (e.g. created by a trigger without metadata)
    await supabase.from('profiles').update({ name, username }).eq('id', user.id)
  }
}

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await ensureProfile(session.user)
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // On sign-in or token refresh, make sure profile row is up to date
      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        await ensureProfile(s.user)
      }
      setSession(s)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.user) await ensureProfile(result.data.user)
    return result
  }

  const signUp = async (email, password, name, username) => {
    // Check username uniqueness before creating auth account
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

    // If email confirmation is disabled (instant sign-in), create the profile row immediately
    if (result.data?.user && !result.data?.user?.identities?.[0]?.identity_data?.email_verified === false) {
      await ensureProfile(result.data.user)
    }

    return result
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
