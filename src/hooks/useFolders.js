import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useFolders(session) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  // load folders + tickers from supabase on session change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!session) { setFolders([]); setLoading(false); return }
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('folders')
        .select(`id, name, portfolio_items (ticker)`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      setFolders(
        (data ?? []).map(f => ({
          id: f.id,
          name: f.name,
          tickers: (f.portfolio_items ?? []).map(i => i.ticker),
        }))
      )
      setLoading(false)
    }
    load()
  }, [session])

  const createFolder = async (name) => {
    if (!name.trim() || !session) return null
    const { data, error } = await supabase
      .from('folders')
      .insert([{ user_id: session.user.id, name: name.trim() }])
      .select()
      .single()
    if (error) throw error
    const folder = { id: data.id, name: data.name, tickers: [] }
    setFolders(f => [...f, folder])
    return folder
  }

  const renameFolder = async (id, name) => {
    if (!name.trim()) return
    const { error } = await supabase.from('folders').update({ name }).eq('id', id)
    if (error) throw error
    setFolders(f => f.map(x => x.id === id ? { ...x, name } : x))
  }

  const deleteFolder = async (id) => {
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) throw error
    setFolders(f => f.filter(x => x.id !== id))
  }

  const addTicker = async (folderId, symbol, userId) => {
    symbol = symbol.toUpperCase().trim()

    // ensure ticker exists in global_metrics
    await supabase
      .from('global_metrics')
      .upsert({ ticker: symbol }, { onConflict: 'ticker' })

    const folder = folders.find(f => f.id === folderId)
    if (folder?.tickers.includes(symbol)) return symbol // already present

    const { error } = await supabase
      .from('portfolio_items')
      .insert([{ user_id: userId, folder_id: folderId, ticker: symbol }])

    if (error && error.code !== '23505') throw error

    setFolders(f =>
      f.map(x =>
        x.id === folderId
          ? { ...x, tickers: x.tickers.includes(symbol) ? x.tickers : [...x.tickers, symbol] }
          : x
      )
    )
    return symbol
  }

  const removeTicker = async (folderId, symbol) => {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('folder_id', folderId)
      .eq('ticker', symbol)
    if (error) throw error
    setFolders(f =>
      f.map(x =>
        x.id === folderId
          ? { ...x, tickers: x.tickers.filter(t => t !== symbol) }
          : x
      )
    )
  }

  return { folders, loading, createFolder, renameFolder, deleteFolder, addTicker, removeTicker }
}
