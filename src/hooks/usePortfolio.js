import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000/api" : "/api"

export function usePortfolio(session) {
  const [portfolioFolders, setPortfolioFolders] = useState([])
  const [activePortfolioId, setActivePortfolioId] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [livePrices, setLivePrices] = useState({})
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingHoldings, setLoadingHoldings] = useState(false)

  // fetch folders on mount
  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortfolioFolders([])
      setLoadingFolders(false)
      return
    }

    const fetchFolders = async () => {
      setLoadingFolders(true)
      const { data, error } = await supabase
        .from('portfolio_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setPortfolioFolders(data)
        if (data.length > 0 && !activePortfolioId) {
          setActivePortfolioId(data[0].id)
        }
      }
      setLoadingFolders(false)
    }

    fetchFolders()
  }, [session])

  // fetch holdings when active folder changes
  const loadHoldings = useCallback(async () => {
    if (!session || !activePortfolioId) {
      setHoldings([])
      return
    }

    setLoadingHoldings(true)
    const { data } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('folder_id', activePortfolioId)
      .order('created_at', { ascending: true })

    setHoldings(data || [])

    // fetch live prices via python backend
    if (data && data.length > 0) {
      const tickers = [...new Set(data.map(h => h.ticker))].join(',')
      try {
        const res = await fetch(`${BASE_URL}/bulk_prices?tickers=${tickers}`)
        const prices = await res.json()
        setLivePrices(prices)
      } catch (e) {
        console.error("failed to fetch prices", e)
      }
    }
    setLoadingHoldings(false)
  }, [session, activePortfolioId])

  // loads holdings for the active portfolio folder — fetch-on-
  // dependency-change pattern (loadHoldings itself sets state on completion).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHoldings()
  }, [loadHoldings])

  // folder actions
  const createPortfolioFolder = async (name) => {
    if (!name.trim() || !session) return null
    const { data, error } = await supabase
      .from('portfolio_folders')
      .insert([{ user_id: session.user.id, name: name.trim() }])
      .select()
      .single()
    
    if (error) throw error
    setPortfolioFolders(f => [...f, data])
    return data
  }

  // import from market view with selected tickers
  const importMarketFolder = async (folderName, selectedTickers) => {
    if (!session) return null
    
    // create the portfolio folder
    const { data, error } = await supabase
      .from('portfolio_folders')
      .insert([{ user_id: session.user.id, name: folderName }])
      .select()
      .single()
    
    if (error) throw new Error("database error: could not create portfolio_folders. did you run the sql?")

    // insert only the selected tickers with zero amount/price so user can edit later
    if (selectedTickers && selectedTickers.length > 0) {
      const payload = selectedTickers.map(t => ({
        user_id: session.user.id,
        folder_id: data.id,
        ticker: t,
        amount: 0,
        buy_price: 0
      }))
      
      const { error: holdingsError } = await supabase.from('portfolio_holdings').insert(payload)
      if (holdingsError) throw new Error("database error: could not insert into portfolio_holdings. missing folder_id column?")
    }

    setPortfolioFolders(f => [...f, data])
    setActivePortfolioId(data.id)
    return data
  }

  const renamePortfolioFolder = async (id, name) => {
    if (!name.trim()) return
    const { error } = await supabase.from('portfolio_folders').update({ name }).eq('id', id)
    if (error) throw error
    setPortfolioFolders(f => f.map(x => x.id === id ? { ...x, name } : x))
  }

  const deletePortfolioFolder = async (id) => {
    const { error } = await supabase.from('portfolio_folders').delete().eq('id', id)
    if (error) throw error
    setPortfolioFolders(f => f.filter(x => x.id !== id))
  }

  // holding actions
  const saveHolding = async (id, ticker, amount, buyPrice) => {
    if (!activePortfolioId) return

    if (id) {
      await supabase.from('portfolio_holdings')
        .update({ amount, buy_price: buyPrice })
        .eq('id', id)
    } else {
      await supabase.from('portfolio_holdings')
        .insert([{ 
          user_id: session.user.id, 
          folder_id: activePortfolioId,
          ticker: ticker.toUpperCase(), 
          amount, 
          buy_price: buyPrice 
        }])
    }
    loadHoldings()
  }

  const removeHolding = async (id) => {
    await supabase.from('portfolio_holdings').delete().eq('id', id)
    loadHoldings()
  }

  const togglePortfolioPrivacy = async (folderId, isPublic) => {
    // optimistic update
    setPortfolioFolders(f => f.map(x => x.id === folderId ? { ...x, is_public: isPublic } : x))
    const { error } = await supabase
      .from('portfolio_folders')
      .update({ is_public: isPublic })
      .eq('id', folderId)
    if (error) {
      // revert on failure
      console.error('togglePortfolioPrivacy failed:', error)
      setPortfolioFolders(f => f.map(x => x.id === folderId ? { ...x, is_public: !isPublic } : x))
      alert('Could not update portfolio visibility: ' + error.message)
    }
  }

  return { 
    portfolioFolders, activePortfolioId, setActivePortfolioId, loadingFolders, togglePortfolioPrivacy,
    holdings, livePrices, loadingHoldings, 
    createPortfolioFolder, importMarketFolder, renamePortfolioFolder, deletePortfolioFolder, 
    saveHolding, removeHolding 
  }
}