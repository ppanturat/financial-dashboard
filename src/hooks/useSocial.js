import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])        // incoming pending
  const [sentRequests, setSentRequests] = useState([]) // outgoing (any status)
  const [feed, setFeed] = useState([])
  const [profile, setProfile] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])  // people I follow (accepted)
  const [followers, setFollowers] = useState([])           // people who follow me (accepted)

  const load = async () => {
    if (!session) return

    const [
      { data: users },
      { data: reqs },
      { data: acceptedOut },   // I follow them
      { data: acceptedIn },    // they follow me
      { data: sent },
      { data: me }
    ] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', session.user.id).limit(100),
      supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'pending'),
      supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).eq('status', 'accepted'),
      supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'accepted'),
      supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).neq('status', 'accepted'),
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
    ])

    setProfiles(users || [])
    setRequests(reqs || [])
    setSentRequests(sent || [])
    setProfile(me)

    // People I follow → load their public portfolios
    if (acceptedOut?.length) {
      const followingIds = acceptedOut.map(x => x.target_user_id)
      const [{ data: portfolios }, { data: followingProfiles }] = await Promise.all([
        supabase.from('portfolio_folders').select('*').in('user_id', followingIds).eq('is_public', true),
        supabase.from('profiles').select('*').in('id', followingIds)
      ])
      setFeed(portfolios || [])
      setFollowedUsers(followingProfiles || [])
    } else {
      setFeed([])
      setFollowedUsers([])
    }

    // People who follow me
    if (acceptedIn?.length) {
      const followerIds = acceptedIn.map(x => x.requester_user_id)
      const { data: followerProfiles } = await supabase
        .from('profiles').select('*').in('id', followerIds)
      setFollowers(followerProfiles || [])
    } else {
      setFollowers([])
    }
  }

  useEffect(() => { load() }, [session])

  const sendFollowRequest = async (targetId) => {
    const { data } = await supabase.from('follow_requests').insert({
      requester_user_id: session.user.id,
      target_user_id: targetId,
      status: 'pending'
    }).select().single()
    if (data) setSentRequests(prev => [...prev, data])
  }

  const unfollow = async (targetId) => {
    await supabase.from('follow_requests')
      .delete()
      .eq('requester_user_id', session.user.id)
      .eq('target_user_id', targetId)
    setFollowedUsers(prev => prev.filter(u => u.id !== targetId))
    setFeed(prev => prev.filter(p => p.user_id !== targetId))
    setSentRequests(prev => prev.filter(r => r.target_user_id !== targetId))
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('follow_requests').update({ status }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))

    if (status === 'accepted') {
      const req = requests.find(r => r.id === id)
      if (req) {
        const { data: followerProfile } = await supabase
          .from('profiles').select('*').eq('id', req.requester_user_id).single()
        if (followerProfile) setFollowers(prev => [...prev, followerProfile])
      }
    }
  }

  const updateProfile = async (payload) => {
    await supabase.from('profiles').upsert({ id: session.user.id, ...payload })
    setProfile(prev => ({ ...prev, ...payload }))
  }

  // 'accepted' | 'pending' | 'rejected' | null
  const getSentRequestStatus = (targetUserId) => {
    if (followedUsers.some(u => u.id === targetUserId)) return 'accepted'
    const req = sentRequests.find(r => r.target_user_id === targetUserId)
    return req?.status || null
  }

  const filteredProfiles = (searchTerm) => profiles.filter(p => {
    const q = searchTerm.toLowerCase()
    return p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
  })

  return {
    profiles,
    filteredProfiles,
    requests,
    sentRequests,
    feed,
    followedUsers,
    followers,
    sendFollowRequest,
    unfollow,
    respondToRequest,
    getSentRequestStatus,
    profile,
    updateProfile,
    reload: load,
  }
}
