import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts'
import './App.css'

// popular tickers fallback for search when proxy is unavailable
const POPULAR = [
  { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY' },
  { symbol: 'MSFT', shortname: 'Microsoft Corporation', quoteType: 'EQUITY' },
  { symbol: 'GOOGL', shortname: 'Alphabet Inc.', quoteType: 'EQUITY' },
  { symbol: 'AMZN', shortname: 'Amazon.com Inc.', quoteType: 'EQUITY' },
  { symbol: 'NVDA', shortname: 'NVIDIA Corporation', quoteType: 'EQUITY' },
  { symbol: 'META', shortname: 'Meta Platforms Inc.', quoteType: 'EQUITY' },
  { symbol: 'TSLA', shortname: 'Tesla Inc.', quoteType: 'EQUITY' },
  { symbol: 'BRK-B', shortname: 'Berkshire Hathaway', quoteType: 'EQUITY' },
  { symbol: 'JPM', shortname: 'JPMorgan Chase', quoteType: 'EQUITY' },
  { symbol: 'V', shortname: 'Visa Inc.', quoteType: 'EQUITY' },
  { symbol: 'VOO', shortname: 'Vanguard S&P 500 ETF', quoteType: 'ETF' },
  { symbol: 'VTI', shortname: 'Vanguard Total Stock Market ETF', quoteType: 'ETF' },
  { symbol: 'QQQ', shortname: 'Invesco QQQ Trust', quoteType: 'ETF' },
  { symbol: 'SPY', shortname: 'SPDR S&P 500 ETF Trust', quoteType: 'ETF' },
  { symbol: 'AMD', shortname: 'Advanced Micro Devices', quoteType: 'EQUITY' },
  { symbol: 'PACB', shortname: 'Pacific Biosciences', quoteType: 'EQUITY' },
  { symbol: 'SDGR', shortname: 'Schrödinger, Inc.', quoteType: 'EQUITY' },
  { symbol: 'ADBE', shortname: 'Adobe Inc.', quoteType: 'EQUITY' }
]

const METRIC_DEFS = [
  {
    key: 'war_chest_ratio', label: 'War Chest Ratio', type: 'raw', colorType: 'warChest',
    meaning: 'Cash divided by total debt.',
    scale: '< 0.5 = Danger (Red) · 0.5–1.0 = Caution (Yellow) · > 1.0 = Healthy (Green)',
    etf: false
  },
  {
    key: 'fcf', label: 'Free Cash Flow', type: 'curr', colorType: 'fcf',
    meaning: 'Cash left after all operating costs and capital expenditures.',
    scale: 'Negative = Burning Cash (Red) · Positive = Generating Cash (Green)',
    etf: false
  },
  {
    key: 'gross_margin', label: 'Gross Margin', type: 'pct', colorType: 'margin',
    meaning: 'Percentage of revenue retained after direct costs.',
    scale: '< 20% = Tight (Red) · 20–50% = OK (White) · > 50% = Excellent (Green)',
    etf: false
  },
  {
    key: 'forward_pe', label: 'Forward P/E', type: 'raw', colorType: 'pe',
    meaning: 'Price relative to next-year earnings expectations.',
    scale: '< 15 = Cheap (Green) · 15–40 = Fair (White) · > 40 = Expensive (Red)',
    etf: false
  },
  {
    key: 'revenue_yoy', label: 'Revenue YoY', type: 'pct', colorType: 'margin',
    meaning: 'Year-over-year revenue growth rate.',
    scale: 'Negative = Shrinking (Red) · Positive = Growing (Green)',
    etf: false
  },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // initialize with your specific structural architecture
  const [folders, setFolders] = useState([
    { id: 1, name: 'Shield Vault', tickers: ['VOO'] },
    { id: 2, name: 'Satellite Vault', tickers: ['PACB', 'SDGR', 'ADBE'] }
  ])
  const [activeFolderId, setActiveFolderId] = useState(1)
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const [activeTicker, setActiveTicker] = useState('VOO')
  const [quoteType, setQuoteType] = useState('ETF')
  const [timeframe, setTimeframe] = useState('1M')
  const [chartData, setChartData] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [aiSummary, setAiSummary] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(null)

  const searchRef = useRef(null)
  const newFolderRef = useRef(null)

  // auth init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // dropdown handler
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
      if (!e.target.closest('.metric-info-btn')) setTooltipOpen(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // global api search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toUpperCase().trim()
    
    const fetchSearch = async () => {
      try {
        const res = await fetch(`/yf-search/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8`, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) throw new Error()
        const data = await res.json()
        const quotes = (data?.quotes ?? []).filter(r => r.quoteType === 'EQUITY' || r.quoteType === 'ETF')
        if (quotes.length > 0) setSearchResults(quotes.slice(0, 8))
        else throw new Error('empty')
      } catch {
        // fallback to standard list if proxy block occurs
        const filtered = POPULAR.filter(t => t.symbol.startsWith(q) || t.shortname.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
        setSearchResults(filtered)
      }
    }
    
    const id = setTimeout(fetchSearch, 250)
    return () => clearTimeout(id)
  }, [searchQuery])

  // fetch actual market data
  useEffect(() => {
    if (!activeTicker) return
    let cancelled = false
    const run = async () => {
      setLoadingData(true)
      setMetrics(null)
      setAiSummary('')
      setCurrentPrice(null)

      try {
        // fetch chart
        const ranges = { '1W': '5d', '1M': '1mo', '6M': '6mo', '1Y': '1y' }
        const intervals = { '1W': '15m', '1M': '1d', '6M': '1d', '1Y': '1wk' }
        const resChart = await fetch(`/yf/v8/finance/chart/${activeTicker}?range=${ranges[timeframe]}&interval=${intervals[timeframe]}`)
        if (!resChart.ok) throw new Error()
        const chartJson = await resChart.json()
        const res = chartJson?.chart?.result?.[0]
        
        if (res) {
          const ts = res.timestamp ?? []
          const closes = res.indicators?.quote?.[0]?.close ?? []
          const type = res.meta?.instrumentType ?? 'EQUITY'
          if (!cancelled) setQuoteType(type)

          const formatted = ts.map((t, i) => {
            const d = new Date(t * 1000)
            const label = timeframe === '1Y' ? d.toLocaleString('default', { month: 'short', year: '2-digit' }) : `${d.getMonth() + 1}/${d.getDate()}`
            return { name: label, price: closes[i] != null ? +closes[i].toFixed(2) : null }
          }).filter(p => p.price !== null)

          if (!cancelled) {
            setChartData(formatted)
            if (formatted.length) setCurrentPrice(formatted[formatted.length - 1].price)
          }
        }

        // fetch metrics 
        const isEtf = quoteType === 'ETF' || ['VOO','VTI','QQQ','SPY','IWM','VT','VNQ','VXUS'].includes(activeTicker)

        if (isEtf) {
          if (!cancelled) {
            setMetrics(null)
            setAiSummary(`${activeTicker} is an ETF. Individual financial metrics like P/E, FCF, and margins are not reported at the fund level.`)
          }
        } else {
          const resMetrics = await fetch(`/yf/v11/finance/quoteSummary/${activeTicker}?modules=financialData%2CdefaultKeyStatistics`)
          if (resMetrics.ok) {
            const metricsJson = await resMetrics.json()
            const res0 = metricsJson?.quoteSummary?.result?.[0]
            if (res0) {
              const fin = res0.financialData ?? {}
              const stats = res0.defaultKeyStatistics ?? {}
              const cash = fin.totalCash?.raw ?? 0
              const debt = fin.totalDebt?.raw ?? 0

              const m = {
                war_chest_ratio: debt > 0 ? cash / debt : cash > 0 ? 999 : null,
                fcf: fin.freeCashflow?.raw ?? null,
                revenue_yoy: fin.revenueGrowth?.raw ?? null,
                gross_margin: fin.grossMargins?.raw ?? null,
                forward_pe: stats.forwardPE?.raw ?? null
              }
              if (!cancelled) { setMetrics(m); buildSummary(m, activeTicker) }
            }
          } else {
            throw new Error()
          }
        }
      } catch (e) {
        if (!cancelled) {
          setMetrics(null)
          setAiSummary('Financial data unavailable. The endpoint may be temporarily restricted.')
        }
      }

      if (!cancelled) setLoadingData(false)
    }
    run()
    return () => { cancelled = true }
  }, [activeTicker, timeframe, quoteType])

  const buildSummary = (m, ticker) => {
    const parts = [`Scan complete for ${ticker}.`]
    if (m.war_chest_ratio !== null) {
      if (m.war_chest_ratio < 0.5) parts.push('Balance sheet under stress — cash barely covers debt obligations.')
      else if (m.war_chest_ratio > 1.5) parts.push('Fortress balance sheet — cash comfortably exceeds debt.')
      else parts.push('Debt and cash are moderately balanced.')
    }
    if (m.fcf !== null) parts.push(m.fcf < 0 ? 'Cash burn detected — negative Free Cash Flow.' : 'Operations generating positive Free Cash Flow.')
    if (m.gross_margin !== null) {
      if (m.gross_margin > 0.5) parts.push('Strong pricing power with margins above 50%.')
      else if (m.gross_margin < 0.2) parts.push('Margins are tight — high costs or fierce competition.')
    }
    if (m.forward_pe !== null) {
      if (m.forward_pe > 40) parts.push('Valuation is stretched — market pricing in near-perfection.')
      else if (m.forward_pe < 15) parts.push('Potential value opportunity at current valuation.')
      else parts.push('Valuation sits in a fair-value range.')
    }
    setAiSummary(parts.join(' '))
  }

  const getColor = (val, type) => {
    if (val == null) return ''
    if (type === 'warChest') return val < 0.5 ? 'red' : val < 1.0 ? 'yellow' : 'green'
    if (type === 'fcf' || type === 'margin') return val > 0 ? 'green' : 'red'
    if (type === 'pe') return val > 40 ? 'red' : val < 15 ? 'green' : ''
    return ''
  }

  const fmt = (num, type) => {
    if (num == null) return 'N/A'
    if (type === 'pct') return `${(num * 100).toFixed(1)}%`
    if (type === 'raw') return num >= 999 ? '∞' : num.toFixed(2)
    if (type === 'curr') {
      const abs = Math.abs(num)
      const sign = num < 0 ? '-' : ''
      if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
      if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
      return `${sign}$${abs.toLocaleString()}`
    }
  }

  const isUp = chartData.length > 1 && chartData[chartData.length - 1].price >= chartData[0].price
  const graphColor = isUp ? '#16a34a' : '#dc2626'
  const priceChange = chartData.length > 1 ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100) : null

  // crud interactions
  const saveNewFolder = () => {
    const name = newFolderName.trim()
    if (name) setFolders(f => [...f, { id: Date.now(), name, tickers: [] }])
    setNewFolderMode(false)
    setNewFolderName('')
  }
  const saveFolderEdit = (id) => {
    setFolders(f => f.map(x => x.id === id ? { ...x, name: editName.trim() || x.name } : x))
    setEditingFolderId(null)
  }
  const deleteFolder = (id) => {
    if (folders.length <= 1) return
    const next = folders.filter(f => f.id !== id)
    setFolders(next)
    if (activeFolderId === id) {
      setActiveFolderId(next[0].id)
      setActiveTicker(next[0].tickers[0] ?? '')
    }
  }
  const addTicker = (symbol) => {
    symbol = symbol.toUpperCase()
    setFolders(f => f.map(x => x.id === activeFolderId && !x.tickers.includes(symbol) ? { ...x, tickers: [...x.tickers, symbol] } : x))
    setActiveTicker(symbol)
    setSearchQuery('')
    setShowDropdown(false)
  }
  const removeTicker = (symbol) => {
    const folder = folders.find(f => f.id === activeFolderId)
    const next = folder.tickers.filter(t => t !== symbol)
    setFolders(f => f.map(x => x.id === activeFolderId ? { ...x, tickers: next } : x))
    if (activeTicker === symbol) setActiveTicker(next[0] ?? '')
  }

  const handleAuth = async (e, type) => {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = type === 'up' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (error) alert(error.message)
    else if (type === 'up') setAuthView('check_email')
  }

  // view routing
  if (!session) {
    if (authView === 'check_email') return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">◈</div>
          <h2>Check Your Email</h2>
          <p className="auth-sub">We sent a confirmation link to {email}</p>
          <button className="btn-text" onClick={() => setAuthView('login')}>Back to Sign In</button>
        </div>
      </div>
    )
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">◈</div>
          <h2>{authView === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="auth-sub">{authView === 'login' ? 'Sign in to your vault' : 'Start tracking your portfolio'}</p>
          <form className="auth-form" onSubmit={e => handleAuth(e, authView === 'login' ? 'in' : 'up')}>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="btn-primary" type="submit" disabled={authLoading}>
              {authLoading ? 'Loading...' : authView === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button className="btn-text" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}>
            {authView === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    )
  }

  const activeFolder = folders.find(f => f.id === activeFolderId)
  const isEtf = quoteType === 'ETF'

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">FINANCIAL DASHBOARD</span>
        </div>

        <p className="sidebar-label">Vaults</p>
        <nav className="sidebar-nav">
          {folders.map(f => (
            <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
              {editingFolderId === f.id ? (
                <input
                  className="vault-edit-input"
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => saveFolderEdit(f.id)}
                  onKeyDown={e => { if (e.key === 'Enter') saveFolderEdit(f.id); if (e.key === 'Escape') setEditingFolderId(null) }}
                />
              ) : (
                <>
                  <button
                    className="vault-btn"
                    onClick={() => { setActiveFolderId(f.id); setSidebarOpen(false); if (f.tickers[0]) setActiveTicker(f.tickers[0]) }}
                  >
                    <span className="vault-dot" />
                    <span className="vault-label">{f.name}</span>
                    <span className="vault-count">{f.tickers.length}</span>
                  </button>
                  <div className="vault-actions">
                    <button title="Rename" onClick={() => { setEditingFolderId(f.id); setEditName(f.name) }}>✎</button>
                    {folders.length > 1 && <button title="Delete" onClick={() => deleteFolder(f.id)}>✕</button>}
                  </div>
                </>
              )}
            </div>
          ))}

          {newFolderMode ? (
            <div className="vault-row">
              <input
                ref={newFolderRef}
                className="vault-edit-input"
                autoFocus
                placeholder="Vault name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={saveNewFolder}
                onKeyDown={e => { if (e.key === 'Enter') saveNewFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') } }}
              />
            </div>
          ) : (
            <button className="new-vault-btn" onClick={() => setNewFolderMode(true)}>+ New Vault</button>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="user-email">{session.user.email}</span>
          <button className="signout-btn" onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>

          <div className="header-left">
            <span className="header-vault-name">{activeFolder?.name}</span>
            <div className="ticker-tabs">
              {activeFolder?.tickers.map(t => (
                <div key={t} className={`ticker-chip ${activeTicker === t ? 'active' : ''}`}>
                  <button className="chip-ticker" onClick={() => setActiveTicker(t)}>{t}</button>
                  <button className="chip-remove" onClick={() => removeTicker(t)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="search-wrap" ref={searchRef}>
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <input
                type="text"
                placeholder="Search Ticker..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { addTicker(searchQuery.trim()); } }}
              />
              {searchQuery && <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]) }}>✕</button>}
            </div>
            {showDropdown && searchQuery && (
              <ul className="search-drop">
                {searchResults.length === 0
                  ? <li className="drop-empty">Press Enter to force add "{searchQuery.toUpperCase()}"</li>
                  : searchResults.map(r => (
                    <li key={r.symbol} className="drop-item" onClick={() => addTicker(r.symbol)}>
                      <span className="drop-symbol">{r.symbol}</span>
                      <span className="drop-name">{r.shortname ?? r.longname ?? ''}</span>
                      <span className="drop-type">{r.quoteType?.toLowerCase()}</span>
                    </li>
                  ))
                }
              </ul>
            )}
          </div>
        </header>

        <div className="content">
          <div className="price-row">
            <div className="price-left">
              <span className="price-ticker">{activeTicker}</span>
              {isEtf && <span className="etf-badge">ETF</span>}
              {currentPrice != null ? (
                <span className="price-value">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              ) : (
                <span className="price-value price-skeleton">——</span>
              )}
              {priceChange !== null && (
                <span className={`price-delta ${priceChange >= 0 ? 'up' : 'down'}`}>
                  {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="tf-group">
              {['1W', '1M', '6M', '1Y'].map(tf => (
                <button key={tf} className={`tf-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
              ))}
            </div>
          </div>

          <div className="chart-card">
            {loadingData ? (
              <div className="chart-empty"><span className="spinner" /> Fetching Market Data...</div>
            ) : chartData.length === 0 ? (
              <div className="chart-empty">No Data Available</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <ChartTooltip contentStyle={{ background: '#111', border: 'none', borderRadius: '8px', padding: '8px 12px' }} labelStyle={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }} itemStyle={{ color: graphColor, fontSize: '13px', fontFamily: 'DM Mono, monospace' }} formatter={v => [`$${v.toFixed(2)}`, 'Price']} />
                  <Line type="monotone" dataKey="price" stroke={graphColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: graphColor }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="section-header">
            <span className="section-title">Key Metrics</span>
            {isEtf && <span className="etf-notice">ETF — Individual financial metrics not applicable</span>}
          </div>
          <div className="metrics-grid">
            {METRIC_DEFS.map(({ key, label, type, colorType, meaning, scale }) => {
              const val = metrics?.[key]
              const color = isEtf ? '' : getColor(val, colorType)
              return (
                <div key={key} className={`metric-card ${color}`}>
                  <div className="metric-top">
                    <span className="metric-label">{label}</span>
                    <button className="metric-info-btn" onClick={e => { e.stopPropagation(); setTooltipOpen(tooltipOpen === key ? null : key) }} title={meaning}>?</button>
                    {tooltipOpen === key && (
                      <div className="metric-tooltip">
                        <p className="tt-meaning">{meaning}</p>
                        <p className="tt-scale">{scale}</p>
                      </div>
                    )}
                  </div>
                  <div className="metric-value">
                    {loadingData ? <span className="skeleton-val">—</span> : isEtf ? <span className="skeleton-val">N/A</span> : fmt(val, type)}
                  </div>
                </div>
              )
            })}
          </div>

          {(aiSummary || loadingData) && (
            <div className="ai-card">
              <div className="ai-head">
                <span className="ai-badge">AI Scan</span>
                <span className="ai-sub">{activeTicker} · {timeframe}</span>
              </div>
              <p className="ai-body">{loadingData ? 'Analyzing...' : aiSummary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}