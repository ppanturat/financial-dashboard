import { supabase } from './supabaseClient'

const BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : '/api'

export const api = {
  search: async (query, signal) => {
    const res = await fetch(`${BASE}/search/${encodeURIComponent(query)}`, { signal })
    if (!res.ok) throw new Error('search failed')
    return res.json()
  },

  stockData: async (ticker, timeframe, signal) => {
    const res = await fetch(`${BASE}/data/${ticker}?timeframe=${timeframe}`, { signal })
    if (!res.ok) throw new Error('data fetch failed')
    return res.json()
  },

  etfHoldings: async (ticker, signal) => {
    const res = await fetch(`${BASE}/etf-holdings/${ticker}`, { signal })
    if (!res.ok) throw new Error('etf holdings fetch failed')
    return res.json()
  },

  dividends: async (tickers, signal) => {
    const res = await fetch(`${BASE}/dividends?tickers=${encodeURIComponent(tickers)}`, { signal })
    if (!res.ok) throw new Error('dividends fetch failed')
    return res.json()
  },

  // checks supabase cache first, only calls the api if no cached result exists
  aiScan: async (ticker, signal) => {
    // 1. check cache
    const { data } = await supabase
      .from('global_metrics')
      .select('ai_scan')
      .eq('ticker', ticker)
      .single()

    if (data?.ai_scan) return data.ai_scan

    // 2. cache miss — call the api
    const res = await fetch(`${BASE}/ai/${ticker}`, { signal })
    if (!res.ok) throw new Error('ai scan failed')
    const result = await res.json()

    // 3. persist to supabase for next time
    await supabase
      .from('global_metrics')
      .update({ ai_scan: result })
      .eq('ticker', ticker)

    return result
  },
}
