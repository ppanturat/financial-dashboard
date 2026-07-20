/**
 * stock-specific news feed displayed beneath the stock chart. shows headline,
 * source, timestamp, and the summary provided by yfinance.
 * usage: <StockNewsFeed ticker="AAPL" />
 */
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPublishedAt(raw) {
  if (!raw) return '—'
  let date
  if (typeof raw === 'number') {
    date = new Date(raw * 1000)  // unix epoch seconds
  } else if (typeof raw === 'string') {
    date = new Date(raw)
  } else {
    return '—'
  }
  if (isNaN(date.getTime())) return '—'

  const now  = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 2)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hrs  < 24)  return `${hrs}h ago`
  if (days < 7)   return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Returns a trusted-domain short label if the URL domain is recognisable. */
function resolveSource(source, url) {
  if (source && source.length > 1) return source
  if (!url) return 'Yahoo Finance'
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const knownMap = {
      'bloomberg.com':       'Bloomberg',
      'reuters.com':         'Reuters',
      'wsj.com':             'WSJ',
      'ft.com':              'Financial Times',
      'cnbc.com':            'CNBC',
      'marketwatch.com':     'MarketWatch',
      'barrons.com':         "Barron's",
      'forbes.com':          'Forbes',
      'seekingalpha.com':    'Seeking Alpha',
      'fool.com':            'Motley Fool',
      'investopedia.com':    'Investopedia',
      'techcrunch.com':      'TechCrunch',
      'businessinsider.com': 'Business Insider',
      'thestreet.com':       'The Street',
    }
    return knownMap[host] ?? host
  } catch {
    return 'Yahoo Finance'
  }
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  const credibleSources = new Set([
    'Bloomberg', 'Reuters', 'WSJ', 'Financial Times', 'CNBC',
    'MarketWatch', "Barron's", 'Forbes', 'AP', 'AP News',
  ])
  const isCredible = credibleSources.has(source)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: isCredible ? '#1d4ed8' : '#6b6a65',
      background: isCredible ? '#eff6ff' : 'rgba(0,0,0,0.04)',
      border: `1px solid ${isCredible ? '#bfdbfe' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 4, padding: '2px 6px',
    }}>
      {isCredible && <span style={{ fontSize: 8 }}>★</span>}
      {source}
    </span>
  )
}

// ── Single news card ──────────────────────────────────────────────────────────
function NewsCard({ item, isLast }) {
  const source = resolveSource(item.source, item.url)
  const time   = formatPublishedAt(item.publishedAt)

  return (
    <article style={{
      padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      {/* Meta row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 8, marginBottom: 6, flexWrap: 'wrap',
      }}>
        <SourceBadge source={source} />
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{time}</span>
      </div>

      {/* Headline */}
      <a
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          fontSize: 14, fontWeight: 700,
          color: 'var(--text)',
          textDecoration: 'none',
          lineHeight: 1.4,
          marginBottom: item.summary ? 8 : 0,
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
          lineHeight: 1.6,
        }}>
          {item.summary}
        </p>
      )}
    </article>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function NewsSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          padding: '14px 0',
          borderBottom: i < count - 1 ? '1px solid var(--border)' : 'none',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 50, height: 18, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: '85%', height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '70%',  height: 13, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function StockNewsFeed({ ticker }) {
  const [news, setNews]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(() => {
    if (!ticker) return
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    api.stockNews(ticker, ctrl.signal)
      .then(d => {
        setNews(d.news ?? [])
        setLoading(false)
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setError('Could not load news.')
          setLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [ticker])

  // fetch news with cleanup/abort on ticker change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const cleanup = load(); return cleanup }, [load])

  return (
    <section style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '16px 20px',
      marginTop: 16,
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {ticker} · Latest News
        </h3>
        {!loading && (
          <button
            onClick={load}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--accent)', padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ↻ Refresh
          </button>
        )}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--faint)' }}>
        Pre-written summaries from source publishers — no AI involved.
      </p>

      {/* Content */}
      {loading && <NewsSkeleton count={4} />}

      {error && !loading && (
        <div style={{
          padding: '12px 16px', background: '#fef2f2',
          border: '1px solid #fca5a5', borderRadius: 6,
          fontSize: 13, color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>
          No recent news found for {ticker}.
        </p>
      )}

      {!loading && !error && news.length > 0 && (
        <div>
          {news.map((item, i) => (
            <NewsCard
              key={`${item.title}-${i}`}
              item={item}
              isLast={i === news.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  )
}
