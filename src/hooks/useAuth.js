import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
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
        data: { name, username: username.toLowerCase().trim() }
      }
    })
    return result
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
