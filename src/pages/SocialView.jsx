import { useState, useEffect } from 'react'

const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#9333ea','#0891b2','#0d9488','#db2777']

// ── Small helpers ──────────────────────────────────────────────────────────

function Avatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), #9333ea)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
      flexShrink: 0, fontFamily: 'Syne, sans-serif',
    }}>
      {initials}
    </div>
  )
}

function StatusDot({ color }) {
  const map = { green: '#16a34a', yellow: '#ca8a04', red: '#dc2626', neutral: '#9ca3af' }
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: map[color] ?? map.neutral, marginRight: 5 }} />
}

// ── Profile setup card ─────────────────────────────────────────────────────

function ProfileSetupCard({ onSave }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!name.trim()) { setErr('Display name is required.'); return }
    if (!username.trim() || !/^[a-z0-9_]{3,20}$/.test(username.trim())) {
      setErr('Username: 3–20 chars, lowercase letters, numbers, underscores only.')
      return
    }
    setSaving(true)
    try { await onSave(name, username) }
    catch (e) { setErr(e.message ?? 'Could not save. Username may be taken.') }
    setSaving(false)
  }

  return (
    <div className="social-setup-card">
      <div className="social-setup-icon">◈</div>
      <h2>Set Up Your Social Profile</h2>
      <p>Choose a display name and username before joining the feed.</p>
      <div className="form-group">
        <label>Display Name</label>
        <input className="social-input" placeholder="e.g. Alex Chen" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Username</label>
        <input className="social-input" placeholder="e.g. alex_chen" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} />
      </div>
      {err && <p className="social-error">{err}</p>}
      <button className="btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={saving}>
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}

// ── Pending requests banner ────────────────────────────────────────────────

function PendingRequestsBanner({ requests, onAccept, onDecline }) {
  if (!requests.length) return null
  return (
    <div className="social-card">
      <p className="social-card-label">Follow Requests <span className="social-badge-count">{requests.length}</span></p>
      {requests.map(r => (
        <div key={r.id} className="social-request-row">
          <Avatar name={r.profiles?.display_name} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="social-name">{r.profiles?.display_name}</span>
            <span className="social-username">@{r.profiles?.username}</span>
          </div>
          <button className="social-btn-accept" onClick={() => onAccept(r.id)}>Accept</button>
          <button className="social-btn-decline" onClick={() => onDecline(r.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ── Find people search ─────────────────────────────────────────────────────

function FindPeopleCard({ searchUsers, onSendRequest, following, pendingOutgoing, currentUserId }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const followingIds = new Set(following.map(f => f.id))
  const pendingIds = new Set(pendingOutgoing.map(f => f.id))

  const search = async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const r = await searchUsers(q)
    setResults(r)
    setSearching(false)
  }

  return (
    <div className="social-card">
      <p className="social-card-label">Find People</p>
      <div className="social-search-wrap">
        <input
          className="social-input"
          placeholder="Search by username or name…"
          value={query}
          onChange={e => search(e.target.value)}
        />
        {searching && <span className="social-searching">…</span>}
      </div>
      {results.map(u => {
        const isFollowing = followingIds.has(u.id)
        const isPending = pendingIds.has(u.id)
        return (
          <div key={u.id} className="social-request-row">
            <Avatar name={u.display_name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="social-name">{u.display_name}</span>
              <span className="social-username">@{u.username}</span>
            </div>
            {isFollowing
              ? <span className="social-pill-following">Following</span>
              : isPending
                ? <span className="social-pill-pending">Pending</span>
                : <button className="social-btn-accept" onClick={() => onSendRequest(u.id)}>Follow</button>
            }
          </div>
        )
      })}
      {query && !searching && results.length === 0 && (
        <p className="social-empty-note">No users found for "{query}"</p>
      )}
    </div>
  )
}

// ── Single followed-user portfolio card ───────────────────────────────────

function PortfolioFeedCard({ user, getPublicPortfolio }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = async () => {
    if (data || loading) return
    setLoading(true)
    const result = await getPublicPortfolio(user.id)
    setData(result)
    setLoading(false)
  }

  const toggle = () => {
    setExpanded(e => !e)
    if (!expanded) load()
  }

  return (
    <div className="social-feed-card">
      <div className="social-feed-header" onClick={toggle} style={{ cursor: 'pointer' }}>
        <Avatar name={user.display_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="social-name">{user.display_name}</span>
          <span className="social-username">@{user.username}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user.portfolio_public
            ? <span className="social-pill-public">Public</span>
            : <span className="social-pill-private">Private</span>
          }
          <span className="social-expand-arrow" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        </div>
      </div>

      {expanded && (
        <div className="social-feed-body">
          {loading && <p className="social-empty-note">Loading portfolio…</p>}
          {!loading && !user.portfolio_public && (
            <p className="social-empty-note" style={{ color: 'var(--muted)' }}>🔒 This portfolio is private.</p>
          )}
          {!loading && user.portfolio_public && data && (
            data.holdings.length === 0
              ? <p className="social-empty-note">No holdings yet.</p>
              : (
                <table className="social-port-table">
                  <thead>
                    <tr><th>Asset</th><th>Shares</th><th>Avg Cost</th></tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((h, idx) => (
                      <tr key={h.id}>
                        <td>
                          <span className="port-ticker-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                          <span className="font-mono font-bold">{h.ticker}</span>
                        </td>
                        <td className="num">{h.amount}</td>
                        <td className="num">${parseFloat(h.buy_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}
        </div>
      )}
    </div>
  )
}

// ── My portfolio visibility toggle ────────────────────────────────────────

function VisibilityToggle({ isPublic, onToggle }) {
  return (
    <div className="social-visibility-row">
      <div>
        <p className="social-card-label" style={{ marginBottom: 2 }}>My Portfolio Visibility</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          {isPublic ? 'Followers can see your portfolio.' : 'Only you can see your portfolio.'}
        </p>
      </div>
      <button
        className={`social-toggle-btn ${isPublic ? 'public' : 'private'}`}
        onClick={() => onToggle(!isPublic)}
      >
        {isPublic ? '🌐 Public' : '🔒 Private'}
      </button>
    </div>
  )
}

// ── Main SocialView ────────────────────────────────────────────────────────

export function SocialView({ social }) {
  const {
    profile, loading, following, pendingOutgoing, pendingIncoming,
    upsertProfile, sendFollowRequest, acceptFollowRequest, declineFollowRequest,
    setPortfolioPublic, searchUsers, getPublicPortfolio,
  } = social

  const [tab, setTab] = useState('feed') // 'feed' | 'requests' | 'find'

  if (loading) return <div className="chart-empty">Loading social data…</div>

  if (!profile?.username) {
    return (
      <ProfileSetupCard onSave={upsertProfile} />
    )
  }

  return (
    <div className="social-wrap">
      {/* Top bar */}
      <div className="social-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={profile.display_name} />
          <div>
            <span className="social-name">{profile.display_name}</span>
            <span className="social-username">@{profile.username}</span>
          </div>
        </div>
        <VisibilityToggle isPublic={!!profile.portfolio_public} onToggle={setPortfolioPublic} />
      </div>

      {/* Sub-tabs */}
      <div className="social-subtabs">
        <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}>
          Feed
          {following.length > 0 && <span className="social-badge-count">{following.length}</span>}
        </button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
          Requests
          {pendingIncoming.length > 0 && <span className="social-badge-count red">{pendingIncoming.length}</span>}
        </button>
        <button className={tab === 'find' ? 'active' : ''} onClick={() => setTab('find')}>Find</button>
      </div>

      {tab === 'requests' && (
        <PendingRequestsBanner
          requests={pendingIncoming}
          onAccept={acceptFollowRequest}
          onDecline={declineFollowRequest}
        />
      )}

      {tab === 'find' && (
        <FindPeopleCard
          searchUsers={searchUsers}
          onSendRequest={sendFollowRequest}
          following={following}
          pendingOutgoing={pendingOutgoing}
        />
      )}

      {tab === 'feed' && (
        <>
          {following.length === 0 ? (
            <div className="social-empty-feed">
              <span style={{ fontSize: 28 }}>👥</span>
              <h3>Your feed is empty</h3>
              <p>Find people to follow and see their portfolios here.</p>
              <button className="btn-primary" style={{ width: 'auto', marginTop: 8 }} onClick={() => setTab('find')}>
                Find People
              </button>
            </div>
          ) : (
            following.map(user => (
              <PortfolioFeedCard
                key={user.id}
                user={user}
                getPublicPortfolio={getPublicPortfolio}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}
