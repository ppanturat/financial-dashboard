import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

// ── Shared primitives ─────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 40, style = {} }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const fontSize = size > 50 ? 20 : size > 36 ? 15 : 12
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border-md)', ...style }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 62%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize, fontFamily: "'Syne', sans-serif",
      userSelect: 'none', ...style,
    }}>{initials}</div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '18px 20px', ...style
    }}>{children}</div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{children}</span>
      {count != null && (
        <span style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--faint)', border: '1px solid var(--border-md)', padding: '1px 7px', borderRadius: 99, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      )}
    </div>
  )
}

function Badge({ color = '#16a34a', bg = '#f0fdf4', border = '#bbf7d0', children }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${border}`, padding: '1px 7px', borderRadius: 99, flexShrink: 0 }}>
      {children}
    </span>
  )
}

// ── Avatar uploader ───────────────────────────────────────────────────────────
function AvatarUploader({ name, currentUrl, userId, onUploaded }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert('Max 3 MB'); return }
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      onUploaded(data.publicUrl + '?t=' + Date.now())
    } catch (err) {
      setPreview(currentUrl || null)
      alert('Upload failed: ' + (err.message || 'unknown error'))
    } finally { setUploading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={name || 'U'} avatarUrl={preview} size={72} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%',
          background: uploading ? 'var(--muted)' : 'var(--accent)', border: '2px solid var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, color: '#fff',
        }} title="Change photo">{uploading ? '…' : '✎'}</button>
      </div>
      <span style={{ fontSize: 11, color: 'var(--faint)' }}>{uploading ? 'Uploading…' : 'Click ✎ to change photo'}</span>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Edit profile modal ────────────────────────────────────────────────────────
function EditProfileModal({ profile, userId, onSave, onClose }) {
  const [form, setForm] = useState({ name: profile?.name || '', username: profile?.username || '', avatar_url: profile?.avatar_url || '' })
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    width: '100%', padding: '10px 13px', background: 'var(--surface-2)',
    border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 14,
    color: 'var(--text)', fontFamily: "'Syne', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .15s',
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return
    setSaving(true); await onSave(form); setSaving(false); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(245,244,241,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 20, padding: '24px 24px 20px', width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Edit Profile</span>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>
        <AvatarUploader name={form.name} currentUrl={form.avatar_url} userId={userId} onUploaded={url => setForm(f => ({ ...f, avatar_url: url }))} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Display Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-md)'} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', fontSize: 14, fontFamily: "'DM Mono', monospace", pointerEvents: 'none' }}>@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="username" style={{ ...inputStyle, paddingLeft: 28, fontFamily: "'DM Mono', monospace" }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-md)'} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: "'Syne', sans-serif", cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.username.trim()} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: "'Syne', sans-serif", cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PrivacyToggle({ isPublic, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
      cursor: 'pointer', border: 'none', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600,
      transition: 'all .15s', flexShrink: 0,
      background: isPublic ? '#f0fdf4' : 'var(--surface-2)',
      color: isPublic ? '#16a34a' : 'var(--muted)',
      outline: isPublic ? '1px solid #bbf7d0' : '1px solid var(--border-md)',
    }}>
      <span style={{ fontSize: 13 }}>{isPublic ? '👁' : '🔒'}</span>
      {isPublic ? 'Public' : 'Private'}
    </button>
  )
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user, right, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '10px 13px', borderRadius: 12,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <Avatar name={user.name || user.username || '?'} avatarUrl={user.avatar_url} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name || 'Investor'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {user.username && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)' }}>@{user.username}</span>}
          {sub}
        </div>
      </div>
      {right}
    </div>
  )
}

// ── User detail panel ─────────────────────────────────────────────────────────
const PIE_COLORS = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d']

async function fetchThbRate() {
  try { const res = await fetch('https://open.er-api.com/v6/latest/USD'); const d = await res.json(); return d.rates?.THB ?? 34.5 }
  catch { return 34.5 }
}

function fmtCurr(val, currency, thbRate) {
  const num = parseFloat(val) || 0
  if (currency === 'THB') return '฿' + (num * thbRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function UserDetailPanel({ user, feed, feedHoldings }) {
  const [prices, setPrices]       = useState({})
  const [charts, setCharts]       = useState({})
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [currency, setCurrency]   = useState('USD')
  const [thbRate, setThbRate]     = useState(34.5)

  const folders     = feed.filter(f => f.user_id === user.id)
  const allHoldings = feedHoldings.filter(h => folders.some(f => f.id === h.folder_id))
  const tickers     = [...new Set(allHoldings.map(h => h.ticker))]

  const fetchPrices = useCallback(async () => {
    if (!tickers.length) { setLoading(false); return }
    setLoading(true)
    const results = {}, chartResults = {}
    await Promise.all(tickers.map(async ticker => {
      try {
        const data = await api.stockData(ticker, '1M')
        const arr  = data?.chart ?? []
        if (arr.length) {
          chartResults[ticker] = arr.map(d => ({ price: d.price, timestamp: d.timestamp }))
          const latest = arr[arr.length - 1]?.price ?? 0
          const first  = arr[0]?.price ?? latest
          results[ticker] = { price: latest, change: first ? ((latest - first) / first) * 100 : 0 }
        }
      } catch { results[ticker] = { price: null, change: null } }
    }))
    setPrices(results); setCharts(chartResults); setLoading(false)
  }, [tickers.join(',')])

  useEffect(() => { fetchPrices() }, [fetchPrices])
  useEffect(() => { fetchThbRate().then(setThbRate) }, [])

  const totalCost  = allHoldings.reduce((s, h) => s + (parseFloat(h.buy_price||0) * parseFloat(h.amount||0)), 0)
  const totalValue = allHoldings.reduce((s, h) => {
    const p = prices[h.ticker]?.price
    return s + (p != null ? p * parseFloat(h.amount||0) : parseFloat(h.buy_price||0) * parseFloat(h.amount||0))
  }, 0)
  const totalPnL    = totalValue - totalCost
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
  const pnlPos      = totalPnL >= 0

  const tickerStats = tickers.map(ticker => {
    const hs       = allHoldings.filter(h => h.ticker === ticker)
    const shares   = hs.reduce((s, h) => s + parseFloat(h.amount||0), 0)
    const avgCost  = hs.reduce((s, h) => s + parseFloat(h.buy_price||0)*parseFloat(h.amount||0), 0) / (shares||1)
    const price    = prices[ticker]?.price
    const value    = price != null ? price * shares : avgCost * shares
    const cost     = avgCost * shares
    const pnl      = value - cost
    const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0
    const weight   = totalValue > 0 ? (value / totalValue) * 100 : 0
    return { ticker, shares, avgCost, currentPrice: price, value, cost, pnl, pnlPct, weight, sparkline: charts[ticker] }
  }).sort((a, b) => b.value - a.value)

  const pieData  = tickerStats.map(t => ({ name: t.ticker, value: t.value }))
  const tabs     = ['overview', 'holdings', 'charts']
  const tabStyle = t => ({
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    fontFamily: "'Syne', sans-serif", border: 'none', transition: 'all .15s',
    background: activeTab === t ? 'var(--accent)' : 'var(--surface-2)',
    color: activeTab === t ? '#fff' : 'var(--muted)',
    outline: activeTab === t ? 'none' : '1px solid var(--border-md)',
  })

  return (
    <div style={{ marginTop: 8, marginLeft: 16, background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(t => <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 2, border: '1px solid var(--border-md)', gap: 2 }}>
            {['USD','THB'].map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: 'all .15s', background: currency === c ? 'var(--accent)' : 'transparent', color: currency === c ? '#fff' : 'var(--muted)' }}>{c}</button>
            ))}
          </div>
          {!loading && (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Portfolio Value</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtCurr(totalValue, currency, thbRate)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total P&L</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: pnlPos ? '#16a34a' : '#dc2626' }}>
                  {pnlPos ? '+' : ''}{fmtCurr(totalPnL, currency, thbRate)} ({pnlPos ? '+' : ''}{totalPnLPct.toFixed(2)}%)
                </div>
              </div>
            </>
          )}
          {loading && <span style={{ fontSize: 12, color: 'var(--faint)' }}>Loading…</span>}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Allocation</div>
                {pieData.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PieChart width={90} height={90}>
                      <Pie data={pieData} cx={40} cy={40} innerRadius={22} outerRadius={40} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {tickerStats.slice(0, 5).map((t, i) => (
                        <div key={t.ticker} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 40 }}>{t.ticker}</span>
                          <span style={{ fontSize: 10, color: 'var(--faint)' }}>{t.weight.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{ fontSize: 12, color: 'var(--faint)', fontStyle: 'italic' }}>No data</div>}
              </div>
              <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
                {[
                  { label: 'Holdings', value: allHoldings.length },
                  { label: 'Portfolios', value: folders.length },
                  { label: 'Cost Basis', value: fmtCurr(totalCost, currency, thbRate) },
                  { label: 'Unrealised P&L', value: `${pnlPos?'+':''}${totalPnLPct.toFixed(2)}%`, color: pnlPos ? '#16a34a' : '#dc2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {!loading && tickerStats.length > 0 && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Position Summary</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {tickerStats.map((t, i) => (
                    <div key={t.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 52 }}>{t.ticker}</span>
                      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(t.weight, 100)}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', minWidth: 38, textAlign: 'right' }}>{t.weight.toFixed(1)}%</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: t.pnl >= 0 ? '#16a34a' : '#dc2626', minWidth: 60, textAlign: 'right' }}>
                        {t.pnl >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOLDINGS */}
        {activeTab === 'holdings' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {folders.map(folder => {
              const fHoldings = feedHoldings.filter(h => h.folder_id === folder.id)
              return (
                <div key={folder.id} style={{ background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{folder.name}</span>
                    <Badge>Public</Badge>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--faint)', fontFamily: "'DM Mono', monospace" }}>{fHoldings.length} holding{fHoldings.length !== 1 ? 's' : ''}</span>
                  </div>
                  {fHoldings.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                        <thead>
                          <tr>
                            {['Ticker','Shares','Avg Cost','Current','Value','P&L','%'].map(h => (
                              <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fHoldings.map((h, i) => {
                            const price  = prices[h.ticker]?.price
                            const shares = parseFloat(h.amount||0)
                            const cost   = parseFloat(h.buy_price||0)
                            const value  = price != null ? price * shares : cost * shares
                            const pnl    = price != null ? (price - cost) * shares : null
                            const pnlPct = price != null && cost > 0 ? ((price - cost) / cost) * 100 : null
                            const isPos  = pnl >= 0
                            return (
                              <tr key={h.id} style={{ borderBottom: i < fHoldings.length-1 ? '1px solid var(--border)' : 'none' }}>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700 }}>{h.ticker}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>{shares.toFixed(4)}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>{fmtCurr(cost, currency, thbRate)}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{loading ? '…' : price != null ? fmtCurr(price, currency, thbRate) : '—'}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700 }}>{fmtCurr(value, currency, thbRate)}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: pnl==null?'var(--faint)':isPos?'#16a34a':'#dc2626' }}>{pnl==null?'—':`${isPos?'+':''}${fmtCurr(Math.abs(pnl),currency,thbRate)}`}</td>
                                <td style={{ padding: '9px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: pnlPct==null?'var(--faint)':isPos?'#16a34a':'#dc2626' }}>{pnlPct==null?'—':`${isPos?'+':''}${pnlPct.toFixed(2)}%`}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--faint)', fontStyle: 'italic' }}>No holdings</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* CHARTS */}
        {activeTab === 'charts' && (
          <div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '16px 0' }}>Loading charts…</div>
            ) : tickerStats.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No holdings</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {tickerStats.map((t, i) => {
                  const isPos  = t.pnl >= 0
                  const color  = PIE_COLORS[i % PIE_COLORS.length]
                  return (
                    <div key={t.ticker} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{t.ticker}</div>
                          <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>{t.shares.toFixed(4)} shares</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{t.currentPrice != null ? fmtCurr(t.currentPrice, currency, thbRate) : '—'}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, color: isPos ? '#16a34a' : '#dc2626' }}>{t.pnlPct != null ? `${isPos?'+':''}${t.pnlPct.toFixed(2)}%` : '—'}</div>
                        </div>
                      </div>
                      {t.sparkline?.length > 1 ? (
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={t.sparkline} margin={{ top: 2, right: 2, left: 0, bottom: 2 }}>
                            <Line type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} dot={false} />
                            <Tooltip contentStyle={{ background: '#111', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11 }} itemStyle={{ color, fontFamily: "'DM Mono', monospace" }} formatter={v => [fmtCurr(v, currency, thbRate), '']} labelFormatter={() => ''} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--faint)', fontStyle: 'italic' }}>No chart data</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--faint)' }}>Value: <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text)', fontWeight: 700 }}>{fmtCurr(t.value, currency, thbRate)}</span></span>
                        <span style={{ fontSize: 10, color: isPos ? '#16a34a' : '#dc2626', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{t.pnl != null ? `${isPos?'+':''}${fmtCurr(Math.abs(t.pnl),currency,thbRate)}` : '—'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main SocialView ───────────────────────────────────────────────────────────

export function SocialView({ social, portfolioFolders, session, togglePortfolioPrivacy }) {
  const [editing, setEditing]           = useState(false)
  const [searchVal, setSearchVal]       = useState('')
  const [expandedUser, setExpandedUser] = useState(null)

  const profile     = social.profile
  const displayName = profile?.name || 'Investor'
  const username    = profile?.username || 'user'
  const avatarUrl   = profile?.avatar_url || null
  const getStatus   = id => social.getSentRequestStatus(id)
  const filtered    = social.filteredProfiles(searchVal)

  // Stats for my own profile header
  const myFollowing  = social.followedUsers?.length || 0
  const myFollowers  = social.followers?.length || 0
  const myPortfolios = portfolioFolders?.length || 0
  const myPublic     = portfolioFolders?.filter(f => f.is_public)?.length || 0

  return (
    <div style={{ display: 'grid', gap: 14, width: '100%', alignContent: 'start' }}>

      {/* ── My Profile ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar name={displayName} avatarUrl={avatarUrl} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>@{username}</div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Following', value: myFollowing },
                { label: 'Followers', value: myFollowers },
                { label: 'Portfolios', value: myPortfolios },
                { label: 'Public', value: myPublic },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                  <span style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setEditing(true)} style={{
            padding: '8px 16px', borderRadius: 10, flexShrink: 0,
            background: 'var(--surface-2)', border: '1px solid var(--border-md)',
            color: 'var(--text)', fontSize: 13, fontWeight: 600,
            fontFamily: "'Syne', sans-serif", cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
          >Edit Profile</button>
        </div>
      </Card>

      {/* ── Incoming requests ── */}
      {social.requests?.length > 0 && (
        <Card>
          <SectionLabel count={social.requests.length}>Follow Requests</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.requests.map(req => {
              const reqProfile = social.profiles?.find(p => p.id === req.requester_user_id) || {}
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 13px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <Avatar name={reqProfile.name || reqProfile.username || '?'} avatarUrl={reqProfile.avatar_url} size={36} />
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{reqProfile.name || 'Investor'}</div>
                    {reqProfile.username && <div style={{ fontSize: 11, color: 'var(--faint)', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>@{reqProfile.username}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => social.respondToRequest(req.id, 'rejected')} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>Decline</button>
                    <button onClick={() => social.respondToRequest(req.id, 'accepted')} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>Accept</button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Following ── */}
      {social.followedUsers?.length > 0 && (
        <Card>
          <SectionLabel count={social.followedUsers.length}>Following</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            {social.followedUsers.map(u => {
              const pubFolders = social.feed?.filter(f => f.user_id === u.id) || []
              const isExpanded = expandedUser === u.id
              // Check if they follow me back
              const followsBack = social.followers?.some(f => f.id === u.id)
              return (
                <div key={u.id}>
                  <UserRow user={u}
                    sub={
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {pubFolders.length > 0 && <Badge>{pubFolders.length} public portfolio{pubFolders.length > 1 ? 's' : ''}</Badge>}
                        {followsBack && <Badge color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">Mutual</Badge>}
                      </div>
                    }
                    right={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        {pubFolders.length > 0 && (
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                              background: isExpanded ? 'var(--accent)' : 'var(--surface-2)',
                              border: isExpanded ? 'none' : '1px solid var(--border-md)',
                              color: isExpanded ? '#fff' : 'var(--text)',
                              fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
                              transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                            }}
                          >
                            {isExpanded ? '▲' : '▼'} {isExpanded ? 'Collapse' : 'View Details'}
                          </button>
                        )}
                        <button onClick={() => social.unfollow(u.id)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif", transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.color = 'var(--muted)' }}
                        >Unfollow</button>
                      </div>
                    }
                  />
                  {isExpanded && <UserDetailPanel user={u} feed={social.feed || []} feedHoldings={social.feedHoldings || []} />}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Followers ── */}
      {social.followers?.length > 0 && (
        <Card>
          <SectionLabel count={social.followers.length}>Followers</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.followers.map(u => {
              const status         = getStatus(u.id)
              const isFollowingBack = social.followedUsers?.some(f => f.id === u.id)
              return (
                <UserRow key={u.id} user={u} sub={null}
                  right={
                    isFollowingBack ? (
                      <span style={{ padding: '6px 12px', borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif", background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>Following back</span>
                    ) : status === 'pending' ? (
                      <span style={{ padding: '6px 12px', borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif", background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border-md)' }}>Pending</span>
                    ) : (
                      <button onClick={() => social.sendFollowRequest(u.id)} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>Follow back</button>
                    )
                  }
                />
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Portfolio Privacy ── */}
      <Card>
        <SectionLabel count={portfolioFolders?.length}>Portfolio Privacy</SectionLabel>
        {!portfolioFolders?.length ? (
          <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>No portfolios yet. Create one in the Portfolio tab.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {portfolioFolders.map(folder => (
              <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 13px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: folder.is_public ? '#16a34a' : 'var(--faint)', transition: 'background .2s' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{folder.is_public ? 'Visible to followers' : 'Only visible to you'}</div>
                </div>
                <PrivacyToggle isPublic={folder.is_public} onClick={() => togglePortfolioPrivacy(folder.id, !folder.is_public)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Find Investors ── */}
      <Card>
        <SectionLabel>Find Investors</SectionLabel>
        <div style={{ position: 'relative', marginBottom: searchVal ? 12 : 0 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Search by name or username…"
            style={{ width: '100%', padding: '10px 13px 10px 36px', background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 14, color: 'var(--text)', fontFamily: "'Syne', sans-serif", outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
          />
        </div>
        {searchVal ? (
          filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>No investors found for "{searchVal}"</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map(p => {
                const status = getStatus(p.id)
                return (
                  <UserRow key={p.id} user={p} sub={null}
                    right={
                      status === 'accepted' ? (
                        <button onClick={() => social.unfollow(p.id)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.color = 'var(--muted)' }}>Unfollow</button>
                      ) : status === 'pending' ? (
                        <span style={{ padding: '6px 12px', borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 600, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border-md)' }}>Pending</span>
                      ) : (
                        <button onClick={() => social.sendFollowRequest(p.id)} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>+ Follow</button>
                      )
                    }
                  />
                )
              })}
            </div>
          )
        ) : (
          <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>Search for investors to send a follow request.</p>
        )}
      </Card>

      {editing && <EditProfileModal profile={profile} userId={session?.user?.id} onSave={social.updateProfile} onClose={() => setEditing(false)} />}
    </div>
  )
}
