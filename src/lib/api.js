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

  dividends: async (tickers, signal) => {
    const res = await fetch(`${BASE}/dividends?tickers=${encodeURIComponent(tickers)}`, { signal })
    if (!res.ok) throw new Error('dividends fetch failed')
    return res.json()
  },

  bulkPrices: async (tickers) => {
    const res = await fetch(`${BASE}/bulk_prices?tickers=${encodeURIComponent(tickers)}`)
    if (!res.ok) throw new Error('bulk prices failed')
    return res.json()
  },

  bulkSectors: async (tickers) => {
    const res = await fetch(`${BASE}/bulk_sectors?tickers=${encodeURIComponent(tickers)}`)
    if (!res.ok) throw new Error('bulk sectors failed')
    return res.json()
  },
}
