/**
 * api.js — centralised API client. all requests go through the single
 * `get()` helper; BASE auto-switches between local dev and production.
 */

const BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : '/api'

async function get(path, signal) {
  const res = await fetch(`${BASE}${path}`, { signal })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  // ── Market data ──────────────────────────────────────────────────────────
  search:      (query, signal)            => get(`/search/${encodeURIComponent(query)}`, signal),
  stockData:   (ticker, timeframe, signal) => get(`/data/${ticker}?timeframe=${timeframe}`, signal),
  etfHoldings: (ticker, signal)           => get(`/etf-holdings/${ticker}`, signal),
  dividends:   (tickers, signal)          => get(`/dividends?tickers=${encodeURIComponent(tickers)}`, signal),
  bulkPrices:  (tickers, signal)          => get(`/bulk_prices?tickers=${encodeURIComponent(tickers)}`, signal),
  bulkSectors: (tickers, signal)          => get(`/bulk_sectors?tickers=${encodeURIComponent(tickers)}`, signal),
  financials:  (ticker, signal)           => get(`/financials/${ticker}`, signal),
  valuation:   (ticker, signal)           => get(`/valuation/${ticker}`, signal),
  technicals:  (ticker, signal)           => get(`/technicals/${ticker}`, signal),

  // ── News ─────────────────────────────────────────────────────────────────
  stockNews:   (ticker, signal)           => get(`/news/${ticker}`, signal),
  marketNews:  (signal)                   => get('/market-news', signal),

  // ── Macro / Fear & Greed ─────────────────────────────────────────────────
  macro:       (signal)                   => get('/macro', signal),
}
