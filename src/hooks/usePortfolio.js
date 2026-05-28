import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../lib/api'

export function usePortfolio(session) {
  const [portfolioFolders, setPortfolioFolders] = useState([])
  const [activePortfolioId, setActivePortfolioId] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [livePrices, setLivePrices] = useState({})
  const [tickerMeta, setTickerMeta] = useState({})   // { AAPL: { quoteType, sector } }
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingHoldings, setLoadingHoldings] = useState(false)

  useEffect(() => {
    if (!session) { setPortfolioFolders([]); setLoadingFolders(false); return }
    const fetchFolders = async () => {
      setLoadingFolders(true)
      const { data, error } = await supabase
        .from('portfolio_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
      if (!error && data) {
        setPortfolioFolders(data)
        if (data.length > 0 && !activePortfolioId) setActivePortfolioId(data[0].id)
      }
      setLoadingFolders(false)
    }
    fetchFolders()
  }, [session])

  const loadHoldings = useCallback(async () => {
    if (!session || !activePortfolioId) { setHoldings([]); return }
    setLoadingHoldings(true)
    const { data } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('folder_id', activePortfolioId)
      .order('created_at', { ascending: true })
    setHoldings(data || [])

    if (data && data.length > 0) {
      const tickers = [...new Set(data.map(h => h.ticker))].join(',')
      try {
        const [prices, sectors] = await Promise.all([
          api.bulkPrices(tickers),
          api.bulkSectors(tickers),
        ])
        setLivePrices(prices)
        setTickerMeta(sectors)
      } catch (e) {
        console.error('failed to fetch portfolio metadata', e)
      }
    }
    setLoadingHoldings(false)
  }, [session, activePortfolioId])

  useEffect(() => { loadHoldings() }, [loadHoldings])

  const createPortfolioFolder = async (name) => {
    if (!name.trim() || !session) return null
    const { data, error } = await supabase.from('portfolio_folders')
      .insert([{ user_id: session.user.id, name: name.trim() }])
      .select().single()
    if (error) throw error
    setPortfolioFolders(f => [...f, data])
    return data
  }

  const importMarketFolder = async (folderName, selectedTickers) => {
    if (!session) return null
    const { data, error } = await supabase.from('portfolio_folders')
      .insert([{ user_id: session.user.id, name: folderName }])
      .select().single()
    if (error) throw new Error('database error: could not create portfolio_folders.')

    if (selectedTickers?.length > 0) {
      const payload = selectedTickers.map(t => ({
        user_id: session.user.id, folder_id: data.id, ticker: t, amount: 0, buy_price: 0
      }))
      const { error: he } = await supabase.from('portfolio_holdings').insert(payload)
      if (he) throw new Error('database error: could not insert portfolio_holdings.')
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

  const saveHolding = async (id, ticker, amount, buyPrice) => {
    if (!activePortfolioId) return
    if (id) {
      await supabase.from('portfolio_holdings').update({ amount, buy_price: buyPrice }).eq('id', id)
    } else {
      await supabase.from('portfolio_holdings').insert([{
        user_id: session.user.id, folder_id: activePortfolioId,
        ticker: ticker.toUpperCase(), amount, buy_price: buyPrice
      }])
    }
    loadHoldings()
  }

  const removeHolding = async (id) => {
    await supabase.from('portfolio_holdings').delete().eq('id', id)
    loadHoldings()
  }

  return {
    portfolioFolders, activePortfolioId, setActivePortfolioId, loadingFolders,
    holdings, livePrices, tickerMeta, loadingHoldings,
    createPortfolioFolder, importMarketFolder, renamePortfolioFolder, deletePortfolioFolder,
    saveHolding, removeHolding
  }
}
