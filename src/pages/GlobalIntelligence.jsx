/**
 * GlobalIntelligence.jsx — "News Feed" tab
 * ─────────────────────────────────────────────────────────────────────────────
 * Hierarchy:
 *   ┌ Market Fear & Greed (collapsible gauge) ──────────────────────┐
 *   └────────────────────────────────────────────────────────────────┘
 *   ┌ Macro News Feed ───────────────────────────────────────────────┐
 *   │  article cards with source badge, timestamp, summary           │
 *   └────────────────────────────────────────────────────────────────┘
 */
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { FearGreedBanner } from '../components/FearGreedBanner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPublishedAt(raw) {
  if (!raw) return '—'
  let date
  if (typeof raw === 'number')      date = new Date(raw * 1000)
  else if (typeof raw === 'string') date = new Date(raw)
  else return '—'
  if (isNaN(date.getTime())) return '—'

  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 2)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs  < 24) return `${hrs}h ago`
  if (days < 7)  return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveSource(source, url) {
  if (source && source.length > 1) return source
  if (!url) return 'Yahoo Finance'
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const map = {
      'bloomberg.com':       'Bloomberg',
      'reuters.com':         'Reuters',
      'wsj.com':             'WSJ',
      'ft.com':              'Financial Times',
      'cnbc.com':            'CNBC',
      'marketwatch.com':     'MarketWatch',
      'barrons.com':         "Barron's",
      'ap.org':              'AP News',
      'apnews.com':          'AP News',
      'economist.com':       'The Economist',
    }
    return map[host] ?? host
  } catch { return 'Yahoo Finance' }
}

const CREDIBLE_SET = new Set([
  'Bloomberg', 'Reuters', 'WSJ', 'Financial Times', 'CNBC',
  'MarketWatch', "Barron's", 'AP News', 'The Economist', 'AP',
])

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  const credible = CREDIBLE_SET.has(source)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color:      credible ? '#1d4ed8' : '#6b6a65',
      background: credible ? '#eff6ff' : 'rgba(0,0,0,0.04)',
      border:     `1px solid ${credible ? '#bfdbfe' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 4, padding: '2px 6px', flexShrink: 0,
    }}>
      {credible && <span style={{ fontSize: 8 }}>★</span>}
      {source}
    </span>
  )
}

// ── News card ─────────────────────────────────────────────────────────────────
function MacroNewsCard({ item }) {
  const source = resolveSource(item.source, item.url)
  const time   = formatPublishedAt(item.publishedAt)

  return (
    <article style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 7,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SourceBadge source={source} />
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{time}</span>
      </div>
      <a
        href={item.url || '#'} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', lineHeight: 1.45, display: 'block' }}
        onMouseEnter={e => e.target.style.color = 'var(--accent)'}
        onMouseLeave={e => e.target.style.color = 'var(--text)'}
      >
        {item.title}
      </a>
      {item.summary && (
        <p style={{ margin: 0, fontSize: 13, color: '#6b6a65', lineHeight: 1.65, borderLeft: '2px solid var(--border-md)', paddingLeft: 10 }}>
          {item.summary}
        </p>
      )}
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ count = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 80, height: 17, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 48, height: 17, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: '85%', height: 15, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '100%', height: 12, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '62%',  height: 12, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GlobalIntelligence() {
  const [news, setNews]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(null)
    api.marketNews(ctrl.signal)
      .then(d => { setNews(d.news ?? []); setLastUpdated(new Date()); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError('Unable to load market news.'); setLoading(false) } })
    return () => ctrl.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])

  const credibleCount = news.filter(n => CREDIBLE_SET.has(resolveSource(n.source, n.url))).length

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* ── 1. Fear & Greed Gauge ── */}
      <FearGreedBanner />

      {/* ── 2. News feed header ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap',
        gap: 10, marginBottom: 12,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            Macro Intelligence
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--faint)' }}>
            Interest rates · CPI · Tech sector · Market structure
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {!loading && news.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--faint)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '2px 10px',
            }}>
              {news.length} stories · {credibleCount} credible
            </span>
          )}
          <button
            onClick={load} disabled={loading}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border-md)',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              color: loading ? 'var(--faint)' : 'var(--text)',
              padding: '5px 11px',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── 3. Feed ── */}
      {loading && <Skeleton count={6} />}

      {error && !loading && (
        <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: 'var(--faint)' }}>
          No news found. Try refreshing.
        </div>
      )}

      {!loading && !error && news.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {news.map((item, i) => <MacroNewsCard key={`${item.title}-${i}`} item={item} />)}
        </div>
      )}

      {/* ── 4. Disclaimer ── */}
      {!loading && (
        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--faint)', textAlign: 'center' }}>
          Summaries written by source publishers via yfinance · No AI generation · Not financial advice
        </p>
      )}
    </div>
  )
}
