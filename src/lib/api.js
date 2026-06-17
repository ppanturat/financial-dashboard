/**
 * api.js — centralised API client
 * Adds: macro, stockNews, marketNews, financials, valuation
 */
import { supabase } from './supabaseClient'

const BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : '/api'

async function get(path, signal) {
  const res = await fetch(`${BASE}${path}`, { signal })
  if (!res.ok) throw new Error(`API error: ${res.status} ${path}`)
  return res.json()
}

export const api = {
  // ── Existing endpoints (unchanged) ──────────────────────────────────────
  search: (query, signal) => get(`/search/${encodeURIComponent(query)}`, signal),

  stockData: (ticker, timeframe, signal) =>
    get(`/data/${ticker}?timeframe=${timeframe}`, signal),

  etfHoldings: (ticker, signal) => get(`/etf-holdings/${ticker}`, signal),

  dividends: (tickers, signal) =>
    get(`/dividends?tickers=${encodeURIComponent(tickers)}`, signal),

  bulkPrices: (tickers, signal) =>
    get(`/bulk_prices?tickers=${encodeURIComponent(tickers)}`, signal),

  bulkSectors: (tickers, signal) =>
    get(`/bulk_sectors?tickers=${encodeURIComponent(tickers)}`, signal),

  // Cached AI scan (Supabase-backed)
  aiScan: async (ticker, signal) => {
    const { data } = await supabase
      .from('global_metrics')
      .select('ai_scan')
      .eq('ticker', ticker)
      .single()
    if (data?.ai_scan) return data.ai_scan
    const res = await fetch(`${BASE}/ai/${ticker}`, { signal })
    if (!res.ok) throw new Error('ai scan failed')
    const result = await res.json()
    await supabase.from('global_metrics').update({ ai_scan: result }).eq('ticker', ticker)
    return result
  },

  // ── NEW: Financial statements ────────────────────────────────────────────
  /**
   * Returns income statement, balance sheet, cash flow, and forward P/E.
   * @param {string} ticker
   * @param {AbortSignal} [signal]
   */
  financials: (ticker, signal) => get(`/financials/${ticker}`, signal),

  // ── NEW: Macro / Fear & Greed data ──────────────────────────────────────
  /**
   * Returns VOO-based macro sentiment:
   *   { current_price, dma200, dma_deviation, rsi14, fear_greed_score, label, severity }
   * @param {AbortSignal} [signal]
   */
  macro: (signal) => get('/macro', signal),

  // ── NEW: Stock-specific news ─────────────────────────────────────────────
  /**
   * Returns latest news for a ticker.
   *   { ticker, news: [{ title, source, publishedAt, url, summary }] }
   * @param {string} ticker
   * @param {AbortSignal} [signal]
   */
  stockNews: (ticker, signal) => get(`/news/${ticker}`, signal),

  // ── NEW: Global market news ──────────────────────────────────────────────
  /**
   * Returns aggregated macro/market news.
   *   { news: [{ title, source, publishedAt, url, summary }] }
   * @param {AbortSignal} [signal]
   */
  marketNews: (signal) => get('/market-news', signal),

  // ── NEW: Valuation context (forward P/E vs historical median) ────────────
  /**
   * Returns valuation comparison for a stock.
   *   { ticker, current_forward_pe, historical_median_pe, discount_pct, valuation_flag }
   * @param {string} ticker
   * @param {AbortSignal} [signal]
   */
  valuation: (ticker, signal) => get(`/valuation/${ticker}`, signal),
}
