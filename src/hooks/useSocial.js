
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [feed, setFeed] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [profile, setProfile] = useState(null)
  const [followedUsers, setFollowedUsers] = useState([])

  useEffect(() => {
    if (!session) return

    const load = async () => {
      const [{ data: users }, { data: reqs }, { data: accepted }, { data: me }] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', session.user.id).limit(25),
        supabase.from('follow_requests').select('*').eq('target_user_id', session.user.id).eq('status', 'pending'),
        supabase.from('follow_requests').select('*').eq('requester_user_id', session.user.id).eq('status', 'accepted'),
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
      ])

      setProfiles(users || [])
      setRequests(reqs || [])
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
    await supabase.from('follow_requests').insert({
      requester_user_id: session.user.id,
      target_user_id: targetId,
      status: 'pending'
    })
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('follow_requests').update({ status }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const updateProfile = async (payload) => {
    await supabase.from('profiles').upsert({
      id: session.user.id,
      ...payload
    })

    setProfile(prev => ({ ...prev, ...payload }))
  }

  const togglePortfolioPrivacy = async (folderId, isPublic) => {
    await supabase
      .from('portfolio_folders')
      .update({ is_public: isPublic })
      .eq('id', folderId)
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
    feed,
    followedUsers,
    sendFollowRequest,
    respondToRequest,
    searchTerm,
    setSearchTerm,
    profile,
    updateProfile,
    togglePortfolioPrivacy
  }
}
