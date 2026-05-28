
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [feed, setFeed] = useState([])
  const [following, setFollowing] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [profile, setProfile] = useState(null)

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
        const acceptedFollowing = accepted.map(x => ({
          ...x,
          profile: users?.find(u => u.id === x.target_user_id)
        })).filter(x => x.profile)

        setFollowing(acceptedFollowing)

        const ids = accepted.map(x => x.target_user_id)

        const { data: portfolios } = await supabase
          .from('portfolio_folders')
          .select('*')
          .in('user_id', ids)
          .eq('is_public', true)

        setFeed(portfolios || [])
      } else {
        setFollowing([])
        setFeed([])
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
    setFeed(prev => prev.map(p => p.id === folderId ? { ...p, is_public: isPublic } : p))

    supabase
      .from('portfolio_folders')
      .update({ is_public: isPublic })
      .eq('id', folderId)
      .catch(() => {
        setFeed(prev => prev.map(p => p.id === folderId ? { ...p, is_public: !isPublic } : p))
      })
  }

  const filteredProfiles = profiles.filter(p => {
    const q = searchTerm.toLowerCase()
    return (
      p.username?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    )
  })

  const uploadProfilePicture = async (file) => {
    if (!file) return

    const ext = file.name.split('.').pop()
    const fileName = `${session.user.id}_avatar.${ext}`
    const filePath = `avatars/${fileName}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadErr) throw uploadErr

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (data?.publicUrl) {
      await updateProfile({ avatar_url: data.publicUrl })
    }
  }

  return {
    profiles: filteredProfiles,
    requests,
    feed,
    following,
    sendFollowRequest,
    respondToRequest,
    searchTerm,
    setSearchTerm,
    profile,
    updateProfile,
    togglePortfolioPrivacy,
    uploadProfilePicture
  }
}
