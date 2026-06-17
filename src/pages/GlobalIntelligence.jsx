/**
 * GlobalIntelligence.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "Global Intelligence" main navigation tab.
 * Displays a curated feed of top macroeconomic news in a scannable,
 * summarised format — sourced from the /api/market-news endpoint.
 *
 * Covers: interest rates, CPI, major tech sector shifts, and broad market moves.
 * All summaries are publisher-provided. Zero AI/LLM usage.
 */
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  } catch {
    return 'Yahoo Finance'
  }
}

const CREDIBLE_SET = new Set([
  'Bloomberg', 'Reuters', 'WSJ', 'Financial Times', 'CNBC',
  'MarketWatch', "Barron's", 'AP News', 'The Economist', 'AP',
])

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

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

function MacroNewsCard({ item, index }) {
  const source = resolveSource(item.source, item.url)
  const time   = formatPublishedAt(item.publishedAt)

  return (
    <article style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SourceBadge source={source} />
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{time}</span>
      </div>

      {/* Headline */}
      <a
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 14, fontWeight: 700,
          color: 'var(--text)',
          textDecoration: 'none',
          lineHeight: 1.45,
          display: 'block',
        }}
        onMouseEnter={e => e.target.style.color = 'var(--accent)'}
        onMouseLeave={e => e.target.style.color = 'var(--text)'}
      >
        {item.title}
      </a>

      {/* Summary */}
      {item.summary && (
        <p style={{
          margin: 0,
          fontSize: 13,
          color: '#6b6a65',
          lineHeight: 1.65,
          borderLeft: '2px solid var(--border-md)',
          paddingLeft: 10,
        }}>
          {item.summary}
        </p>
      )}
    </article>
  )
}

function NewsGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8, padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 80, height: 18, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 52, height: 18, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: '88%', height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '65%',  height: 13, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function GlobalIntelligence() {
  const [news, setNews]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    api.marketNews(ctrl.signal)
      .then(d => {
        setNews(d.news ?? [])
        setLastUpdated(new Date())
        setLoading(false)
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setError('Unable to fetch market intelligence. Check your backend connection.')
          setLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => { const cleanup = load(); return cleanup }, [load])

  const credibleCount = news.filter(n => CREDIBLE_SET.has(resolveSource(n.source, n.url))).length

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap',
        gap: 12, marginBottom: 20,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
            Global Intelligence
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--faint)', lineHeight: 1.4 }}>
            Macro economics · Interest rates · CPI · Tech sector shifts · Market structure
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-md)',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              color: loading ? 'var(--faint)' : 'var(--accent)',
              padding: '6px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none' }}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      {!loading && news.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {[
            { label: 'Stories',          value: news.length },
            { label: 'Credible Sources', value: credibleCount },
            { label: 'Data Source',      value: 'yfinance · Free' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 12px',
              display: 'flex', flexDirection: 'column', gap: 1,
            }}>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {s.label}
              </span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 13, fontWeight: 700, color: 'var(--text)',
              }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div style={{
        background: '#f8f7f4',
        border: '1px solid var(--border)',
        borderRadius: 6, padding: '8px 14px',
        fontSize: 11, color: '#6b6a65',
        marginBottom: 16, lineHeight: 1.5,
      }}>
        <strong>Data pipeline:</strong> All summaries are pre-written by source publishers and delivered via the yfinance news API.
        No AI summarisation is used at any stage. Not financial advice.
      </div>

      {/* ── Content ── */}
      {loading && <NewsGridSkeleton count={8} />}

      {error && !loading && (
        <div style={{
          padding: '20px', background: '#fef2f2',
          border: '1px solid #fca5a5', borderRadius: 8,
          fontSize: 13, color: '#dc2626', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          fontSize: 14, color: 'var(--faint)',
        }}>
          No news articles found. Try refreshing in a moment.
        </div>
      )}

      {!loading && !error && news.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {news.map((item, i) => (
            <MacroNewsCard key={`${item.title}-${i}`} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
