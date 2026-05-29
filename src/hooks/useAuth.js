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

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // Accept name + username and immediately upsert a profiles row
  const signUp = async (email, password, name, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return { error }

    // Create the profile row right away so it's visible before email confirmation
    if (data?.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name || '',
        username: username || '',
      })
    }

    return { data, error: null }
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
