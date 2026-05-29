
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])       // incoming pending requests
  const [sentRequests, setSentRequests] = useState([]) // outgoing requests (pending or rejected)
  const [feed, setFeed] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [profile, setProfile] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])

  useEffect(() => {
    if (!session) return

    const load = async () => {
      const [
        { data: users },
        { data: reqs },
        { data: accepted },
        { data: sent },
        { data: me }
      ] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', session.user.id).limit(50),
        supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'pending'),
        supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).eq('status', 'accepted'),
        supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).in('status', ['pending', 'rejected']),
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
      ])

      setProfiles(users || [])
      setRequests(reqs || [])
      setSentRequests(sent || [])
      setProfile(me)

      if (accepted?.length) {
        const ids = accepted.map(x => x.target_user_id)

        const [{ data: portfolios }, { data: followedProfiles }] = await Promise.all([
          supabase.from('portfolio_folders').select('*').in('user_id', ids).eq('is_public', true),
          supabase.from('profiles').select('*').in('id', ids)
        ])

        setFeed(portfolios || [])
        setFollowedUsers(followedProfiles || [])
      } else {
        setFeed([])
        setFollowedUsers([])
      }
    }

    load()
  }, [session])

  const sendFollowRequest = async (targetId) => {
    const { data } = await supabase.from('follow_requests').insert({
      requester_user_id: session.user.id,
      target_user_id: targetId,
      status: 'pending'
    }).select().single()
    if (data) setSentRequests(prev => [...prev, data])
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('follow_requests').update({ status }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))

    // If accepted, reload followed users
    if (status === 'accepted') {
      const req = requests.find(r => r.id === id)
      if (req) {
        const [{ data: profile }, { data: portfolios }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', req.requester_user_id).single(),
          supabase.from('portfolio_folders').select('*').eq('user_id', req.requester_user_id).eq('is_public', true)
        ])
        if (profile) setFollowedUsers(prev => [...prev, profile])
        if (portfolios?.length) setFeed(prev => [...prev, ...portfolios])
      }
    }
  }

  const updateProfile = async (payload) => {
    await supabase.from('profiles').upsert({
      id: session.user.id,
      ...payload
    })

    setProfile(prev => ({ ...prev, ...payload }))
  }

  // Get status of a sent request for a given target user
  const getSentRequestStatus = (targetUserId) => {
    const req = sentRequests.find(r => r.target_user_id === targetUserId)
    return req?.status || null  // 'pending', 'rejected', or null (never sent)
  }

  const filteredProfiles = profiles.filter(p => {
    const q = searchTerm.toLowerCase()
    return (
      p.username?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    )
  })

  return {
    profiles: filteredProfiles,
    requests,
    sentRequests,
    feed,
    followedUsers,
    sendFollowRequest,
    respondToRequest,
    getSentRequestStatus,
    searchTerm,
    setSearchTerm,
    profile,
    updateProfile,
  }
}
