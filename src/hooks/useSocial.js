import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSocial(session) {
  const [profile, setProfile]                 = useState(null)
  const [following, setFollowing]             = useState([])   // profiles I follow (accepted)
  const [pendingOutgoing, setPendingOutgoing] = useState([])   // requests I sent, pending
  const [pendingIncoming, setPendingIncoming] = useState([])   // requests sent to me
  const [loading, setLoading]                 = useState(true)

  const userId = session?.user?.id

  // ── Profile ───────────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }, [userId])

  const upsertProfile = async (displayName, username) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: displayName.trim(), username: username.trim().toLowerCase() })
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  // ── Follow Requests ───────────────────────────────────────────────────────

  const loadFollowData = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const [{ data: accepted }, { data: outgoing }, { data: incoming }] = await Promise.all([
      // people I follow and they accepted
      supabase.from('follows')
        .select('followee_id, profiles!follows_followee_id_fkey(id, display_name, username, portfolio_public)')
        .eq('follower_id', userId)
        .eq('status', 'accepted'),
      // requests I sent but not yet accepted
      supabase.from('follows')
        .select('followee_id, profiles!follows_followee_id_fkey(id, display_name, username)')
        .eq('follower_id', userId)
        .eq('status', 'pending'),
      // requests sent to me
      supabase.from('follows')
        .select('id, follower_id, profiles!follows_follower_id_fkey(id, display_name, username)')
        .eq('followee_id', userId)
        .eq('status', 'pending'),
    ])

    setFollowing((accepted ?? []).map(r => r.profiles).filter(Boolean))
    setPendingOutgoing((outgoing ?? []).map(r => r.profiles).filter(Boolean))
    setPendingIncoming(incoming ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) { loadProfile(); loadFollowData() }
    else { setProfile(null); setFollowing([]); setPendingOutgoing([]); setPendingIncoming([]); setLoading(false) }
  }, [userId])

  const sendFollowRequest = async (targetUserId) => {
    if (!userId) return
    const { error } = await supabase.from('follows').insert([{
      follower_id: userId,
      followee_id: targetUserId,
      status: 'pending'
    }])
    if (error) throw error
    await loadFollowData()
  }

  const acceptFollowRequest = async (followId) => {
    const { error } = await supabase.from('follows')
      .update({ status: 'accepted' })
      .eq('id', followId)
    if (error) throw error
    await loadFollowData()
  }

  const declineFollowRequest = async (followId) => {
    const { error } = await supabase.from('follows').delete().eq('id', followId)
    if (error) throw error
    await loadFollowData()
  }

  const removeFollowing = async (targetUserId) => {
    const { error } = await supabase.from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('followee_id', targetUserId)
    if (error) throw error
    await loadFollowData()
  }

  // ── Portfolio visibility ──────────────────────────────────────────────────

  const setPortfolioPublic = async (isPublic) => {
    if (!userId) return
    const { error } = await supabase.from('profiles')
      .update({ portfolio_public: isPublic })
      .eq('id', userId)
    if (error) throw error
    setProfile(p => ({ ...p, portfolio_public: isPublic }))
  }

  // ── Search users ──────────────────────────────────────────────────────────

  const searchUsers = async (query) => {
    if (!query.trim()) return []
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, portfolio_public')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', userId)
      .limit(10)
    return data ?? []
  }

  // ── View someone's public portfolio ──────────────────────────────────────

  const getPublicPortfolio = async (targetUserId) => {
    // get their default (first) folder
    const { data: folders } = await supabase
      .from('portfolio_folders')
      .select('id, name')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (!folders?.length) return { holdings: [], folderName: null }

    const { data: holdings } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('folder_id', folders[0].id)

    return { holdings: holdings ?? [], folderName: folders[0].name }
  }

  return {
    profile, loading, following, pendingOutgoing, pendingIncoming,
    loadProfile, upsertProfile,
    sendFollowRequest, acceptFollowRequest, declineFollowRequest, removeFollowing,
    setPortfolioPublic, searchUsers, getPublicPortfolio,
    refresh: loadFollowData,
  }
}
