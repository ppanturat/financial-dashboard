/**
 * "news feed" tab — ranked news sections:
 *   1. market headlines (Reuters, AP, Bloomberg, WSJ, FT)
 *   2. analyst & opinion (CNBC, MarketWatch, Barron's, Motley Fool, Seeking Alpha...)
 *   3. community & other
 */
import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { FearGreedBanner } from '../components/FearGreedBanner'

// ── Source classification ─────────────────────────────────────────────────────
const TIER1 = new Set(['Reuters', 'AP News', 'AP', 'Bloomberg', 'WSJ', 'Financial Times', 'FT'])
const TIER2 = new Set(['CNBC', 'MarketWatch', "Barron's", 'Motley Fool', 'Seeking Alpha', 'InvestorPlace', 'The Economist', 'Forbes'])

function getSourceTier(source) {
  if (TIER1.has(source)) return 1
  if (TIER2.has(source)) return 2
  return 3
}

function getSourceBadge(source) {
  if (TIER1.has(source)) return { label: 'Trusted',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' }
  if (TIER2.has(source)) return { label: 'Opinion',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
  return                        { label: 'Other',    color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' }
}

function resolveSource(source, url) {
  if (source && source.length > 1) return source
  if (!url) return 'Yahoo Finance'
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const map = {
      'bloomberg.com': 'Bloomberg', 'reuters.com': 'Reuters', 'wsj.com': 'WSJ',
      'ft.com': 'Financial Times', 'cnbc.com': 'CNBC', 'marketwatch.com': 'MarketWatch',
      'barrons.com': "Barron's", 'ap.org': 'AP News', 'apnews.com': 'AP News',
      'economist.com': 'The Economist', 'fool.com': 'Motley Fool',
      'seekingalpha.com': 'Seeking Alpha', 'forbes.com': 'Forbes',
    }
    return map[host] ?? host
  } catch { return 'Yahoo Finance' }
}

function formatTime(raw) {
  if (!raw) return '—'
  const date = typeof raw === 'number' ? new Date(raw * 1000) : new Date(raw)
  if (isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2)  return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7)  return `${d}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  const badge = getSourceBadge(source)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: badge.color === '#1d4ed8' ? badge.color : '#6b7280',
        background: badge.bg, border: `1px solid ${badge.border}`,
        borderRadius: 4, padding: '2px 6px', flexShrink: 0,
      }}>
        {TIER1.has(source) && '★ '}{source}
      </span>
      {TIER1.has(source) && (
        <span style={{ fontSize: 9, fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 3, padding: '1px 5px' }}>
          TRUSTED
        </span>
      )}
      {TIER2.has(source) && (
        <span style={{ fontSize: 9, fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 3, padding: '1px 5px' }}>
          OPINION
        </span>
      )}
    </div>
  )
}

// ── News card ─────────────────────────────────────────────────────────────────
function NewsCard({ item }) {
  const source = resolveSource(item.source, item.url)
  const time   = formatTime(item.publishedAt)
  const tier   = getSourceTier(source)

  return (
    <article style={{
      background: 'var(--surface)',
      border: `1px solid ${tier === 1 ? '#bfdbfe' : 'var(--border)'}`,
      borderLeft: tier === 1 ? '3px solid #1d4ed8' : undefined,
      borderRadius: 8, padding: '13px 15px',
      display: 'flex', flexDirection: 'column', gap: 7,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => { if (tier !== 1) e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { if (tier !== 1) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SourceBadge source={source} />
        <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>{time}</span>
      </div>
      <a href={item.url || '#'} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', lineHeight: 1.45, display: 'block' }}
        onMouseEnter={e => e.target.style.color = 'var(--accent)'}
        onMouseLeave={e => e.target.style.color = 'var(--text)'}
      >
        {item.title}
      </a>
      {item.summary && (
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.6, borderLeft: '2px solid var(--border-md)', paddingLeft: 9 }}>
          {item.summary}
        </p>
      )}
    </article>
  )
}

// ── Section group ─────────────────────────────────────────────────────────────
function NewsSection({ title, subtitle, items, accent = 'var(--text)' }) {
  if (!items.length) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: accent }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--faint)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => <NewsCard key={`${item.title}-${i}`} item={item} />)}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 80, height: 17, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 45, height: 17, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: '82%', height: 14, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '100%', height: 11, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '58%',  height: 11, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GlobalIntelligence() {
  const [news, setNews]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(null)
    api.marketNews(ctrl.signal)
      .then(d => { setNews(d.news ?? []); setLastUpdated(new Date()); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError('Unable to load news.'); setLoading(false) } })
    return () => ctrl.abort()
  }, [])

  // fetch news with cleanup/abort
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const cleanup = load(); return cleanup }, [load])

  // split into tiers, tier 1 (trusted) always first
  const withSource = news.map(n => ({ ...n, _src: resolveSource(n.source, n.url), _tier: getSourceTier(resolveSource(n.source, n.url)) }))
  const tier1 = withSource.filter(n => n._tier === 1)
  const tier2 = withSource.filter(n => n._tier === 2)
  const tier3 = withSource.filter(n => n._tier === 3)

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Fear & Greed gauge */}
      <FearGreedBanner />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Market Intelligence</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--faint)' }}>
            Interest rates · CPI · Earnings · Tech sector · Macro trends
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 11, color: 'var(--faint)' }}>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={load} disabled={loading} style={{
            background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
            color: loading ? 'var(--faint)' : 'var(--text)', padding: '5px 11px',
          }}>↻ Refresh</button>
        </div>
      </div>

      {loading && <Skeleton />}
      {error && !loading && (
        <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <NewsSection
            title="Market Headlines"
            subtitle="Reuters · AP · Bloomberg · WSJ · Financial Times"
            items={tier1}
            accent="#1d4ed8"
          />
          <NewsSection
            title="Analyst & Opinion"
            subtitle="CNBC · MarketWatch · Barron's · Motley Fool · Seeking Alpha"
            items={tier2}
            accent="#7c3aed"
          />
          <NewsSection
            title="Other Sources"
            subtitle="Community & aggregated coverage"
            items={tier3}
            accent="var(--muted)"
          />
          {news.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: 'var(--faint)' }}>
              No news found. Try refreshing.
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 8 }}>
            Summaries written by source publishers via yfinance · Not financial advice
          </p>
        </>
      )}
    </div>
  )
}
