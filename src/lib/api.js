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

  aiScan: async (ticker, signal) => {
    const res = await fetch(`${BASE}/ai/${ticker}`, { signal })
    if (!res.ok) throw new Error('ai scan failed')
    return res.json()
  },
}
