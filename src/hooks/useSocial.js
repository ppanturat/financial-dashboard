import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [feed, setFeed] = useState([])           // public portfolio_folders
  const [feedHoldings, setFeedHoldings] = useState([]) // holdings for those folders
  const [profile, setProfile] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])
  const [followers, setFollowers] = useState([])

  const load = async () => {
    if (!session) return

    const [
      { data: users },
      { data: reqs },
      { data: acceptedOut },
      { data: acceptedIn },
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

    // If profile row is missing, synthesise one from auth metadata so UI never shows fallbacks
    if (!me && session.user) {
      const meta = session.user.user_metadata || {}
      setProfile({ id: session.user.id, name: meta.name || '', username: meta.username || '', avatar_url: null })
    } else {
      setProfile(me)
    }

    if (acceptedOut?.length) {
      const followingIds = acceptedOut.map(x => x.target_user_id)

      const [{ data: folders }, { data: followingProfiles }] = await Promise.all([
        supabase.from('portfolio_folders').select('*').in('user_id', followingIds).eq('is_public', true),
        supabase.from('profiles').select('*').in('id', followingIds)
      ])

      const publicFolders = folders || []
      setFeed(publicFolders)
      setFollowedUsers(followingProfiles || [])

      // Fetch holdings for every public folder
      if (publicFolders.length) {
        const folderIds = publicFolders.map(f => f.id)
        const { data: holdings } = await supabase
          .from('portfolio_holdings')
          .select('*')
          .in('folder_id', folderIds)
        setFeedHoldings(holdings || [])
      } else {
        setFeedHoldings([])
      }
    } else {
      setFeed([])
      setFeedHoldings([])
      setFollowedUsers([])
    }

    if (acceptedIn?.length) {
      const followerIds = acceptedIn.map(x => x.requester_user_id)
      const { data: followerProfiles } = await supabase
        .from('profiles').select('*').in('id', followerIds)
      setFollowers(followerProfiles || [])
    } else {
      setFollowers([])
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
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
    const removedFolderIds = feed.filter(f => f.user_id === targetId).map(f => f.id)
    setFeed(prev => prev.filter(f => f.user_id !== targetId))
    setFeedHoldings(prev => prev.filter(h => !removedFolderIds.includes(h.folder_id)))
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
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      // Surface the failure instead of silently pretending it worked —
      // previously this used .upsert() with no error check, so a failed
      // write would still show the new name in the UI (optimistic state)
      // while the database kept the old value.
      console.error('[updateProfile] failed to save:', error)
      throw error
    }

    setProfile(data)
    return data
  }

  const getSentRequestStatus = (targetUserId) => {
    if (followedUsers.some(u => u.id === targetUserId)) return 'accepted'
    const req = sentRequests.find(r => r.target_user_id === targetUserId)
    return req?.status || null
  }

  const filteredProfiles = (searchTerm) => profiles.filter(p => {
    const q = (searchTerm || '').toLowerCase()
    return p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
  })

  return {
    profiles,
    filteredProfiles,
    requests,
    sentRequests,
    feed,
    feedHoldings,
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
