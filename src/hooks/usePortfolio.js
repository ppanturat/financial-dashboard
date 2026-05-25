import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000/api" : "/api";

export function usePortfolio(session) {
  const [holdings, setHoldings] = useState([])
  const [livePrices, setLivePrices] = useState({})
  const [loading, setLoading] = useState(true)

  const loadHoldings = useCallback(async () => {
    if (!session) return;
    setLoading(true)
    const { data } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
    
    setHoldings(data || [])
    
    // Fetch live prices for these tickers from Python
    if (data && data.length > 0) {
      const tickers = [...new Set(data.map(h => h.ticker))].join(',')
      try {
        const res = await fetch(`${BASE_URL}/bulk_prices?tickers=${tickers}`)
        const prices = await res.json()
        setLivePrices(prices)
      } catch (e) {
        console.error("Failed to fetch live prices", e)
      }
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    loadHoldings()
  }, [loadHoldings])

  const saveHolding = async (id, ticker, amount, buyPrice) => {
    if (id) {
      // Update existing
      await supabase.from('portfolio_holdings')
        .update({ amount, buy_price: buyPrice })
        .eq('id', id)
    } else {
      // Create new
      await supabase.from('portfolio_holdings')
        .insert([{ user_id: session.user.id, ticker: ticker.toUpperCase(), amount, buy_price: buyPrice }])
    }
    loadHoldings() // Refresh list
  }

  const removeHolding = async (id) => {
    await supabase.from('portfolio_holdings').delete().eq('id', id)
    loadHoldings()
  }

  return { holdings, livePrices, loading, saveHolding, removeHolding }
}