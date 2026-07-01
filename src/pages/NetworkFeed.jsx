/**
 * NetworkFeed.jsx
 * Social activity feed — shows buy/sell/hold activity from people you follow.
 * Data: useSocial → feed (public portfolio_folders) + feedHoldings.
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
      fontFamily: "var(--font-body),sans-serif", userSelect: 'none',
    }}>{initials}</div>
  )
}

function fmtUSD(val) {
  const n = parseFloat(val) || 0
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function timeAgo(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const m  = Math.floor(diff / 60000)
  const h  = Math.floor(diff / 3600000)
  const dy = Math.floor(diff / 86400000)
  if (m < 2)  return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (dy < 7) return `${dy}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Build activity items.
 * We infer "buy" vs "sell" from amount:
 *   - amount > 0  → BUY  (they hold shares)
 *   - amount == 0 → SOLD (fully exited, show as sell)
 * Folder-level items show as "opened portfolio".
 */
function buildActivityItems(followedUsers, feed, feedHoldings, livePrices) {
  const items = []

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
    const isSold    = shares === 0

    items.push({
      id:        `${holding.id}`,
      type:      'trade',
      action:    isSold ? 'sell' : 'buy',
      user, folder,
      ticker:    holding.ticker,
      shares, avgCost, livePrice, value, pnl, pnlPct,
      createdAt: holding.created_at,
    })
  }

  for (const folder of feed) {
    const user = followedUsers.find(u => u.id === folder.user_id)
    if (!user) continue
    const folderHoldings = feedHoldings.filter(h => h.folder_id === folder.id)
    items.push({
      id:           `folder-${folder.id}`,
      type:         'portfolio',
      user, folder,
      holdingCount: folderHoldings.length,
      createdAt:    folder.created_at,
    })
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return items
}

// ── Activity Cards ─────────────────────────────────────────────────────────────
function TradeCard({ item }) {
  const isBuy    = item.action === 'buy'
  const accent   = isBuy ? '#16a34a' : '#dc2626'
  const bgAccent = isBuy ? '#f0fdf4' : '#fef2f2'
  const isPnlPos = item.pnl >= 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      transition: 'box-shadow .15s',
    }}>
      <Avatar name={item.user.name || item.user.username} avatarUrl={item.user.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Action headline */}
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <strong style={{ fontWeight: 700 }}>{item.user.name || item.user.username}</strong>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: bgAccent, color: accent, border: `1px solid ${accent}33`,
          }}>
            {isBuy ? '↑ BOUGHT' : '↓ SOLD'}
          </span>
          <span style={{ fontFamily: "var(--font-body),monospace", fontWeight: 700, background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 5, padding: '1px 7px', fontSize: 12 }}>
            {item.ticker}
          </span>
        </div>

        {/* Trade details */}
        <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {isBuy && item.shares > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Shares</span>
              <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 12, fontWeight: 700 }}>{item.shares.toFixed(4)}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Avg Cost</span>
            <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 12, fontWeight: 700 }}>{fmtUSD(item.avgCost)}</span>
          </div>
          {isBuy && item.value > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Position Value</span>
              <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 12, fontWeight: 700 }}>{fmtUSD(item.value)}</span>
            </div>
          )}
          {isBuy && item.shares > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>P&amp;L</span>
              <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 12, fontWeight: 700, color: isPnlPos ? '#16a34a' : '#dc2626' }}>
                {isPnlPos ? '+' : ''}{fmtUSD(item.pnl)} ({isPnlPos ? '+' : ''}{item.pnlPct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
          {item.folder.name} · {timeAgo(item.createdAt)}
        </div>
      </div>

      {/* Live price badge */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700 }}>{fmtUSD(item.livePrice)}</div>
        <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>live</div>
      </div>
    </div>
  )
}

function PortfolioCard({ item }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent)', borderRadius: 12,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Avatar name={item.user.name || item.user.username} avatarUrl={item.user.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <strong style={{ fontWeight: 700 }}>{item.user.name || item.user.username}</strong>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>opened a public portfolio</span>
          <span style={{ fontWeight: 700, background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 5, padding: '1px 7px', fontSize: 12 }}>
            "{item.folder.name}"
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>
          {item.holdingCount} holding{item.holdingCount !== 1 ? 's' : ''} · {timeAgo(item.createdAt)}
        </div>
      </div>
      <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
    </div>
  )
}

function EmptyFeed({ followedCount, onGoToProfile }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--faint)' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>👥</div>
      {followedCount === 0 ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>No one followed yet</div>
          <div style={{ fontSize: 13, marginBottom: 18 }}>Follow investors to see their trades here.</div>
          <button onClick={onGoToProfile} style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body),sans-serif", cursor: 'pointer' }}>
            Find Investors →
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>No activity yet</div>
          <div style={{ fontSize: 13 }}>Investors you follow haven't shared any public portfolios yet.</div>
        </>
      )}
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ width: '55%', height: 13, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '35%', height: 11, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '45%', height: 11, borderRadius: 4 }} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function NetworkFeed({ social, onGoToProfile }) {
  const [livePrices, setLivePrices]     = useState({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [filterType, setFilterType]     = useState('all') // 'all' | 'buy' | 'sell'

  const { followedUsers = [], feed = [], feedHoldings = [] } = social

  useEffect(() => {
    const tickers = [...new Set(feedHoldings.map(h => h.ticker))].join(',')
    if (!tickers) return
    setLoadingPrices(true)
    api.bulkPrices(tickers)
      .then(d => { setLivePrices(d); setLoadingPrices(false) })
      .catch(() => setLoadingPrices(false))
  }, [feedHoldings.map(h => h.ticker).join(',')])

  const allItems = buildActivityItems(followedUsers, feed, feedHoldings, livePrices)

  const items = filterType === 'all'  ? allItems
    : filterType === 'buy'  ? allItems.filter(i => i.type === 'trade' && i.action === 'buy')
    : filterType === 'sell' ? allItems.filter(i => i.type === 'trade' && i.action === 'sell')
    : allItems

  const buyCount  = allItems.filter(i => i.type === 'trade' && i.action === 'buy').length
  const sellCount = allItems.filter(i => i.type === 'trade' && i.action === 'sell').length

  const filterBtnStyle = active => ({
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body),sans-serif",
    transition: 'all .15s',
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--muted)',
    outline: active ? 'none' : '1px solid var(--border-md)',
  })

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Network Feed</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--faint)' }}>
            {followedUsers.length > 0
              ? `Trades from ${followedUsers.length} investor${followedUsers.length > 1 ? 's' : ''} you follow`
              : 'Follow investors to see their trades here'}
          </p>
        </div>
        <button onClick={onGoToProfile} style={{
          background: 'var(--surface)', border: '1px solid var(--border-md)',
          borderRadius: 9, padding: '8px 15px', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "var(--font-body),sans-serif", transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
        >👤 My Profile</button>
      </div>

      {/* Filter bar */}
      {allItems.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button style={filterBtnStyle(filterType === 'all')}   onClick={() => setFilterType('all')}>All ({allItems.length})</button>
          <button style={filterBtnStyle(filterType === 'buy')}   onClick={() => setFilterType('buy')}>↑ Buys ({buyCount})</button>
          <button style={filterBtnStyle(filterType === 'sell')}  onClick={() => setFilterType('sell')}>↓ Sells ({sellCount})</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loadingPrices && allItems.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loadingPrices && allItems.length === 0 && (
        <EmptyFeed followedCount={followedUsers.length} onGoToProfile={onGoToProfile} />
      )}

      {/* Feed */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item =>
            item.type === 'trade'
              ? <TradeCard     key={item.id} item={item} />
              : <PortfolioCard key={item.id} item={item} />
          )}
        </div>
      )}

      {/* Filtered empty */}
      {!loadingPrices && allItems.length > 0 && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--faint)', fontSize: 13 }}>
          No {filterType} activity found.
        </div>
      )}
    </div>
  )
}
