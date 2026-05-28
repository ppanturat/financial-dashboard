import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [feed, setFeed] = useState([])

  useEffect(() => {
    if (!session) return

    const load = async () => {
      const [{ data: users }, { data: reqs }, { data: portfolios }] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', session.user.id).limit(25),
        supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id),
        supabase.from('portfolio_folders').select('*, profiles(username,name)').eq('is_public', true).limit(20)
      ])

      setProfiles(users || [])
      setRequests(reqs || [])
      setFeed(portfolios || [])
    }

    load()
  }, [session])

  const sendFollowRequest = async (targetId) => {
    await supabase.from('follow_requests').insert({ requester_user_id: session.user.id, target_user_id: targetId, status: 'pending' })
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('follow_requests').update({ status }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return { profiles, requests, feed, sendFollowRequest, respondToRequest }
}
