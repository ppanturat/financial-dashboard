import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])        // incoming pending requests (with requester profile data)
  const [sentRequests, setSentRequests] = useState([]) // outgoing requests (pending or rejected)
  const [feed, setFeed] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [profile, setProfile] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])
  const [followers, setFollowers] = useState([])       // FIX #2: people who follow ME

  useEffect(() => {
    if (!session) return
    load()
  }, [session])

  const load = async () => {
    const [
      { data: users },
      { data: reqs },
      { data: accepted },
      { data: sent },
      { data: me },
      { data: myFollowers },          // FIX #2: fetch accepted requests where I am target
    ] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', session.user.id).limit(50),
      supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'pending'),
      supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).eq('status', 'accepted'),
      supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).in('status', ['pending', 'rejected']),
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'accepted'),
    ])

    setProfiles(users || [])
    setSentRequests(sent || [])
    setProfile(me)

    // FIX #3: Enrich incoming pending requests with requester profile data (name, avatar)
    if (reqs?.length) {
      const requesterIds = reqs.map(r => r.requester_user_id)
      const { data: requesterProfiles } = await supabase
        .from('profiles').select('*').in('id', requesterIds)
      const profileMap = Object.fromEntries((requesterProfiles || []).map(p => [p.id, p]))
      const enriched = reqs.map(r => ({
        ...r,
        requester_name: profileMap[r.requester_user_id]?.name || null,
        requester_avatar: profileMap[r.requester_user_id]?.avatar_url || null,
        requester_username: profileMap[r.requester_user_id]?.username || null,
      }))
      setRequests(enriched)
    } else {
      setRequests([])
    }

    // FIX #2: Resolve follower profiles (people who accepted MY follow-back or sent accepted reqs to me)
    if (myFollowers?.length) {
      const followerIds = myFollowers.map(r => r.requester_user_id)
      const { data: followerProfiles } = await supabase
        .from('profiles').select('*').in('id', followerIds)
      setFollowers(followerProfiles || [])
    } else {
      setFollowers([])
    }

    // People I follow (accepted) — load their profiles + public portfolios
    if (accepted?.length) {
      const ids = accepted.map(x => x.target_user_id)
      const [{ data: portfolios }, { data: followedProfiles }] = await Promise.all([
        supabase.from('portfolio_folders').select('*').in('user_id', ids).eq('is_public', true),
        supabase.from('profiles').select('*').in('id', ids),
      ])
      setFeed(portfolios || [])
      setFollowedUsers(followedProfiles || [])
    } else {
      setFeed([])
      setFollowedUsers([])
    }
  }

  const sendFollowRequest = async (targetId) => {
    const { data } = await supabase.from('follow_requests').insert({
      requester_user_id: session.user.id,
      target_user_id: targetId,
      status: 'pending',
    }).select().single()
    if (data) setSentRequests(prev => [...prev, data])
  }

  // FIX #1: Unfollow — delete the accepted follow_request row
  const unfollow = async (targetUserId) => {
    await supabase
      .from('follow_requests')
      .delete()
      .eq('requester_user_id', session.user.id)
      .eq('target_user_id', targetUserId)
      .eq('status', 'accepted')

    // Remove from local state immediately
    setSentRequests(prev => prev.filter(r => r.target_user_id !== targetUserId))
    setFollowedUsers(prev => prev.filter(u => u.id !== targetUserId))
    setFeed(prev => prev.filter(p => p.user_id !== targetUserId))
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('follow_requests').update({ status }).eq('id', id)
    const req = requests.find(r => r.id === id)
    setRequests(prev => prev.filter(r => r.id !== id))

    if (status === 'accepted' && req) {
      // Add to followers list
      const { data: followerProfile } = await supabase
        .from('profiles').select('*').eq('id', req.requester_user_id).single()
      if (followerProfile) setFollowers(prev => [...prev, followerProfile])
    }
  }

  const updateProfile = async (payload) => {
    await supabase.from('profiles').upsert({ id: session.user.id, ...payload })
    setProfile(prev => ({ ...prev, ...payload }))
  }

  const getSentRequestStatus = (targetUserId) => {
    // First check followedUsers (accepted)
    if (followedUsers.some(u => u.id === targetUserId)) return 'accepted'
    const req = sentRequests.find(r => r.target_user_id === targetUserId)
    return req?.status || null
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
    followers,        // FIX #2: exposed for SocialView
    sendFollowRequest,
    unfollow,         // FIX #1: exposed for SocialView
    respondToRequest,
    getSentRequestStatus,
    searchTerm,
    setSearchTerm,
    profile,
    updateProfile,
  }
}
