/**
 * NetworkFeed.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Social activity feed. Shows what people you follow have done:
 *   - Added / removed a holding
 *   - Portfolio value milestones
 *   - New portfolio created
 *
 * Data comes from useSocial: feed (public portfolio_folders) + feedHoldings.
 * We combine those with live prices to build activity cards.
 */
import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function Avatar({ name, avatarUrl, size = 36 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border-md)' }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,62%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size > 40 ? 16 : 13,
      fontFamily: "'Syne',sans-serif", userSelect: 'none',
    }}>{initials}</div>
  )
}

function fmtUSD(val) {
  const n = parseFloat(val) || 0
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Build synthetic activity items from feed data
function buildActivityItems(followedUsers, feed, feedHoldings, livePrices) {
  const items = []

  // One activity per holding in a public folder
  for (const holding of feedHoldings) {
    const folder = feed.find(f => f.id === holding.folder_id)
    if (!folder) continue
    const user = followedUsers.find(u => u.id === folder.user_id)
    if (!user) continue

    const shares    = parseFloat(holding.amount) || 0
    const avgCost   = parseFloat(holding.buy_price) || 0
    const livePrice = livePrices[holding.ticker] ?? avgCost
    const value     = shares * livePrice
    const costBasis = shares * avgCost
    const pnl       = value - costBasis
    const pnlPct    = costBasis > 0 ? (pnl / costBasis) * 100 : 0
    const isUp      = pnl >= 0

    items.push({
      id:         `${holding.id}`,
      type:       'holding',
      user,
      folder,
      ticker:     holding.ticker,
      shares,
      avgCost,
      livePrice,
      value,
      pnl,
      pnlPct,
      isUp,
      createdAt:  holding.created_at,
    })
  }

  // One item per public folder created
  for (const folder of feed) {
    const user = followedUsers.find(u => u.id === folder.user_id)
    if (!user) continue
    const folderHoldings = feedHoldings.filter(h => h.folder_id === folder.id)
    items.push({
      id:        `folder-${folder.id}`,
      type:      'portfolio',
      user,
      folder,
      holdingCount: folderHoldings.length,
      createdAt:    folder.created_at,
    })
  }

  // Sort by createdAt descending (newest first)
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return items
}

function timeAgo(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const dy = Math.floor(diff / 86400000)
  if (m < 2)  return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (dy < 7) return `${dy}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({ item }) {
  if (item.type === 'portfolio') {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Avatar name={item.user.name || item.user.username} avatarUrl={item.user.avatar_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 700 }}>{item.user.name || item.user.username}</strong>
            {' '}created a public portfolio{' '}
            <span style={{
              fontWeight: 700, color: 'var(--text)',
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              borderRadius: 5, padding: '1px 7px', fontSize: 12,
            }}>"{item.folder.name}"</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>
            {item.holdingCount} holding{item.holdingCount !== 1 ? 's' : ''} · {timeAgo(item.createdAt)}
          </div>
        </div>
        <span style={{ fontSize: 20 }}>📁</span>
      </div>
    )
  }

  // holding card
  const ticker  = item.ticker
  const isUp    = item.isUp

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${isUp ? '#16a34a' : '#dc2626'}`,
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <Avatar name={item.user.name || item.user.username} avatarUrl={item.user.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flexWrap: 'wrap' }}>
          <strong style={{ fontWeight: 700 }}>{item.user.name || item.user.username}</strong>
          {' '}holds{' '}
          <span style={{
            fontFamily: "'DM Mono',monospace", fontWeight: 700,
            background: 'var(--surface-2)', border: '1px solid var(--border-md)',
            borderRadius: 5, padding: '1px 7px', fontSize: 12,
          }}>{ticker}</span>
          {' '}worth{' '}
          <span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
            {fmtUSD(item.value)}
          </span>
        </div>
        {/* P&L row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>
            {item.shares.toFixed(4)} shares @ {fmtUSD(item.avgCost)} avg
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace",
            color: isUp ? '#16a34a' : '#dc2626',
          }}>
            {isUp ? '+' : ''}{fmtUSD(item.pnl)} ({isUp ? '+' : ''}{item.pnlPct.toFixed(2)}%)
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>
          {item.folder.name} · {timeAgo(item.createdAt)}
        </div>
      </div>
      {/* Live price */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {fmtUSD(item.livePrice)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>live price</div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyFeed({ followedCount }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--faint)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
      {followedCount === 0 ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>No one followed yet</div>
          <div style={{ fontSize: 13 }}>Go to your Profile to find and follow other investors.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>No activity yet</div>
          <div style={{ fontSize: 13 }}>People you follow haven't shared any public portfolios yet.</div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function NetworkFeed({ social, onGoToProfile }) {
  const [livePrices, setLivePrices] = useState({})
  const [loadingPrices, setLoadingPrices] = useState(false)

  const { followedUsers = [], feed = [], feedHoldings = [] } = social

  // Fetch live prices for all tickers in the feed
  useEffect(() => {
    const tickers = [...new Set(feedHoldings.map(h => h.ticker))].join(',')
    if (!tickers) return
    setLoadingPrices(true)
    api.bulkPrices(tickers)
      .then(d => { setLivePrices(d); setLoadingPrices(false) })
      .catch(() => setLoadingPrices(false))
  }, [feedHoldings.map(h => h.ticker).join(',')])

  const items = buildActivityItems(followedUsers, feed, feedHoldings, livePrices)

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Network</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--faint)' }}>
            {followedUsers.length > 0
              ? `Activity from ${followedUsers.length} investor${followedUsers.length > 1 ? 's' : ''} you follow`
              : 'Follow investors to see their activity here'}
          </p>
        </div>
        <button
          onClick={onGoToProfile}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border-md)',
            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Syne',sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
        >
          👤 My Profile
        </button>
      </div>

      {loadingPrices && items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ width: '60%', height: 13, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: '40%', height: 11, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingPrices && items.length === 0 && (
        <EmptyFeed followedCount={followedUsers.length} />
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => <ActivityCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
