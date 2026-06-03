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
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          if (session?.user) {
            try {
              await ensureProfile(session.user)
            } catch (err) {
              console.error('Failed to ensure profile:', err)
              // Continue anyway - don't block on profile creation
            }
          }
          setSession(session)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to get session:', err)
        if (mounted) {
          setSession(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (mounted) {
        // On sign-in or token refresh, make sure profile row is up to date
        if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          try {
            await ensureProfile(s.user)
          } catch (err) {
            console.error('Failed to ensure profile on auth change:', err)
          }
        }
        setSession(s)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.data?.user) {
        try {
          await ensureProfile(result.data.user)
        } catch (err) {
          console.error('Failed to ensure profile:', err)
        }
      }
      return result
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    }
  }

  const signUp = async (email, password, name, username) => {
    try {
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
        try {
          await ensureProfile(result.data.user)
        } catch (err) {
          console.error('Failed to ensure profile:', err)
        }
      }

      return result
    } catch (err) {
      console.error('Sign up error:', err)
      throw err
    }
  }

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signIn, signUp, signOut }
}
