import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts'
import './App.css'

const METRIC_DEFS = [
  { key: 'war_chest_ratio', label: 'War Chest Ratio', type: 'raw', colorType: 'warChest', meaning: 'Cash divided by total debt.', scale: '< 0.5 = Danger (Red) · 0.5–1.0 = Caution (Yellow) · > 1.0 = Healthy (Green)' },
  { key: 'fcf', label: 'Free Cash Flow', type: 'curr', colorType: 'fcf', meaning: 'Cash left after all operating costs and capital expenditures.', scale: 'Negative = Burning Cash (Red) · Positive = Generating Cash (Green)' },
  { key: 'gross_margin', label: 'Gross Margin', type: 'pct', colorType: 'margin', meaning: 'Percentage of revenue retained after direct costs.', scale: '< 20% = Tight (Red) · 20–50% = OK (White) · > 50% = Excellent (Green)' },
  { key: 'forward_pe', label: 'Forward P/E', type: 'raw', colorType: 'pe', meaning: 'Price relative to next-year earnings expectations.', scale: '< 15 = Cheap (Green) · 15–40 = Fair (White) · > 40 = Expensive (Red)' },
  { key: 'revenue_yoy', label: 'Revenue YoY', type: 'pct', colorType: 'margin', meaning: 'Year-over-year revenue growth rate.', scale: 'Negative = Shrinking (Red) · Positive = Growing (Green)' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [fetchingFolders, setFetchingFolders] = useState(true)

  const [folders, setFolders] = useState([])
  const [activeFolderId, setActiveFolderId] = useState(null)
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const [activeTicker, setActiveTicker] = useState('')
  const [quoteType, setQuoteType] = useState('EQUITY')
  const [timeframe, setTimeframe] = useState('1M')
  const [chartData, setChartData] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [aiScan, setAiScan] = useState(null)
  const [description, setDescription] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1) // Tracks keyboard focus index
  const [tooltipOpen, setTooltipOpen] = useState(null)

  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  const searchRef = useRef(null)
  const newFolderRef = useRef(null)

  const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000/api" : "/api";

  // --- AUTH SUBSCRIPTION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // --- COMPREHENSIVE RELATION LOAD ---
  useEffect(() => {
    if (!session) {
      setFolders([])
      setActiveFolderId(null)
      setActiveTicker('')
      return
    }

    const fetchWorkspaceData = async () => {
      setFetchingFolders(true)
      
      const { data, error } = await supabase
        .from('folders')
        .select(`
          id,
          name,
          portfolio_items (
            ticker
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        const formattedFolders = data.map(folder => ({
          id: folder.id,
          name: folder.name,
          tickers: folder.portfolio_items ? folder.portfolio_items.map(item => item.ticker) : []
        }))

        setFolders(formattedFolders)
        setActiveFolderId(formattedFolders[0].id)
        setActiveTicker(formattedFolders[0].tickers[0] || '')
      } else {
        setFolders([])
      }
      setFetchingFolders(false)
    }

    fetchWorkspaceData()
  }, [session])

  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
      if (!e.target.closest('.metric-info-btn')) setTooltipOpen(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // --- API CONSUMPTION ---
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toUpperCase().trim()
    const fetchSearch = async () => {
      try {
        const res = await fetch(`${BASE_URL}/search/${encodeURIComponent(q)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
        setSearchSelectedIndex(-1) // Reset selection when new results load
      } catch (err) { setSearchResults([]) }
    }
    const id = setTimeout(fetchSearch, 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  useEffect(() => {
    if (!activeTicker) return
    
    const abortController = new AbortController()
    
    const run = async () => {
      setLoadingData(true)
      setMetrics(null)
      setAiScan(null)
      setCurrentPrice(null)
      setDescription('')
      // setDescExpanded(false) is completely removed from here!

      try {
        const res = await fetch(`${BASE_URL}/data/${activeTicker}?timeframe=${timeframe}`, {
          signal: abortController.signal
        })
        if (!res.ok) throw new Error('Failed to fetch data.')
        const data = await res.json()

        setQuoteType(data.quoteType)
        setChartData(data.chart || [])
        setDescription(data.description || '')
        
        if (data.chart && data.chart.length > 0) setCurrentPrice(data.chart[data.chart.length - 1].price)

        if (data.quoteType === 'ETF') {
          setMetrics(null)
          setAiScan(null)
        } else {
          setMetrics(data.metrics)
          setAiScan(data.ai_scan)
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setDescription('Failed to fetch data.')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingData(false)
        }
      }
    }
    
    run()
    return () => { abortController.abort() }
  }, [activeTicker, timeframe])

  // --- DISPLAY LOGIC ---
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const d = new Date(tickItem);
    return timeframe === '1Y' ? d.toLocaleString('en-US', { month: 'short', year: '2-digit' }) : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatTooltipLabel = (label) => {
    if (!label) return '';
    const d = new Date(label);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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

  const openConfirmModal = (title, message, onConfirmAction) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirmAction();
        setModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  }

  // --- REAL RELATION MUTATIONS ---

  const saveNewFolder = async () => {
    const name = newFolderName.trim()
    if (!name || !session) return

    const { data, error } = await supabase
      .from('folders')
      .insert([{ user_id: session.user.id, name }])
      .select()
      .single()

    if (error) {
      alert("Error processing folder configuration: " + error.message)
    } else if (data) {
      const parsedFolder = { id: data.id, name: data.name, tickers: [] }
      setFolders(f => {
        const updated = [...f, parsedFolder]
        if (f.length === 0) setActiveFolderId(data.id)
        return updated
      })
    }
    setNewFolderMode(false)
    setNewFolderName('')
  }
  
  const saveFolderEdit = async (id) => {
    const folder = folders.find(f => f.id === id)
    const name = editName.trim()
    if (!name || name === folder.name) {
      setEditingFolderId(null)
      return
    }

    openConfirmModal(
      'Rename Folder',
      `Are you sure you want to rename this folder to "${name}"?`,
      async () => {
        const { error } = await supabase.from('folders').update({ name }).eq('id', id)
        if (!error) {
          setFolders(f => f.map(x => x.id === id ? { ...x, name } : x))
        }
      }
    );
    setEditingFolderId(null)
  }

  const deleteFolder = (id) => {
    openConfirmModal(
      'Delete Folder',
      'Are you sure you want to permanently delete this entire folder?',
      async () => {
        const { error } = await supabase.from('folders').delete().eq('id', id)
        if (!error) {
          const next = folders.filter(f => f.id !== id)
          setFolders(next)
          if (activeFolderId === id) {
            if (next.length > 0) {
              setActiveFolderId(next[0].id)
              setActiveTicker(next[0].tickers[0] ?? '')
            } else {
              setActiveFolderId(null)
              setActiveTicker('')
            }
          }
        }
      }
    );
  }

  const addTicker = async (symbol) => {
    symbol = symbol.toUpperCase().trim()
    if (!symbol) return

    // Immediately clean up UI inputs for a seamless layout interaction
    setSearchQuery('')
    setShowDropdown(false)
    setSearchSelectedIndex(-1)

    try {
      // 1. Safe-Check: Ensure entry exists in parent global_metrics table (satisfies constraints)
      const { error: metricError } = await supabase
        .from('global_metrics')
        .upsert({ ticker: symbol }, { onConflict: 'ticker' })

      if (metricError) {
        alert(`Database Error (global_metrics table): ${metricError.message}`);
        return;
      }

      // 2. Resolve Active Folder Context Target
      let destinationFolderId = activeFolderId

      if (folders.length === 0) {
        // Fallback: build automated default workspace folder if user profile has zero folders
        const { data: newF, error: fErr } = await supabase
          .from('folders')
          .insert([{ user_id: session.user.id, name: 'My Portfolio' }])
          .select()
          .single()
        
        if (fErr || !newF) {
          alert(`Error initializing automated default folder: ${fErr?.message}`);
          return;
        }
        destinationFolderId = newF.id
        setFolders([{ id: newF.id, name: newF.name, tickers: [symbol] }])
        setActiveFolderId(newF.id)
      } else {
        // Fix: If workspace contains folders but none are active, default directly to the first folder
        if (!destinationFolderId) {
          destinationFolderId = folders[0].id
          setActiveFolderId(folders[0].id)
        }

        const currentFolder = folders.find(f => f.id === destinationFolderId)
        if (!currentFolder) {
          alert("Unable to detect target folder context.");
          return;
        }

        // Avoid writing duplicate records if the ticker is already in this specific folder
        if (currentFolder.tickers.includes(symbol)) {
          setActiveTicker(symbol)
          return
        }
      }

      // 3. Execution of child record mapping inside portfolio_items
      const { error: itemError } = await supabase
        .from('portfolio_items')
        .insert([{ 
          user_id: session.user.id, 
          folder_id: destinationFolderId, 
          ticker: symbol 
        }])

      // Code 23505 implies unique check violations (already matches key layout rules perfectly)
      if (!itemError || itemError.code === '23505') {
        setFolders(f => f.map(x => x.id === destinationFolderId ? { ...x, tickers: x.tickers.includes(symbol) ? x.tickers : [...x.tickers, symbol] } : x))
        setActiveTicker(symbol)
      } else {
        alert(`Database Error (portfolio_items table): ${itemError.message}\nMake sure your Row Level Security (RLS) rules allow data ingestion.`);
      }
    } catch (err) {
      alert("Unexpected application runtime error: " + err.message);
    }
  }

  const removeTicker = (symbol) => {
    openConfirmModal(
      'Remove Asset',
      `Are you sure you want to remove ${symbol} from this folder?`,
      async () => {
        const { error } = await supabase
          .from('portfolio_items')
          .delete()
          .eq('folder_id', activeFolderId)
          .eq('ticker', symbol)
        
        if (!error) {
          setFolders(f => f.map(x => {
            if (x.id !== activeFolderId) return x
            const nextTickers = x.tickers.filter(t => t !== symbol)
            if (activeTicker === symbol) setActiveTicker(nextTickers[0] ?? '')
            return { ...x, tickers: nextTickers }
          }))
        }
      }
    );
  }

  const handleAuth = async (e, type) => {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = type === 'up' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (error) alert(error.message)
    else if (type === 'up') setAuthView('check_email')
  }

  if (!session) {
    if (authView === 'check_email') return (
      <div className="auth-wrap"><div className="auth-card"><div className="auth-logo">◈</div><h2>Check Your Email</h2><p className="auth-sub">We sent a confirmation link to {email}</p><button className="btn-text" onClick={() => setAuthView('login')}>Back to Sign In</button></div></div>
    )
    return (
      <div className="auth-wrap"><div className="auth-card"><div className="auth-logo">◈</div><h2>{authView === 'login' ? 'Welcome Back' : 'Create Account'}</h2><p className="auth-sub">Sign in to your dashboard</p><form className="auth-form" onSubmit={e => handleAuth(e, authView === 'login' ? 'in' : 'up')}><input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required /><button className="btn-primary" type="submit" disabled={authLoading}>{authLoading ? 'Loading...' : authView === 'login' ? 'Sign In' : 'Create Account'}</button></form><button className="btn-text" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}>{authView === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}</button></div></div>
    )
  }

  const activeFolder = folders.find(f => f.id === activeFolderId)
  const isEtf = quoteType === 'ETF'

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {modal.isOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>{modal.title}</h3>
            <p>{modal.message}</p>
            <div className="custom-modal-actions">
              <button className="btn-text" onClick={() => setModal({ ...modal, isOpen: false })}>Cancel</button>
              <button className="btn-primary btn-danger-solid" onClick={modal.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">STOCK CHECKER</span>
        </div>

        <p className="sidebar-label">Folders</p>
        <nav className="sidebar-nav">
          {fetchingFolders ? (
            <div className="vault-row" style={{ padding: '0 24px', color: 'var(--muted)', fontSize: '14px' }}>Loading folders...</div>
          ) : (
            <>
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
                      <button className="vault-btn" onClick={() => { setActiveFolderId(f.id); setSidebarOpen(false); setActiveTicker(f.tickers[0] ?? '') }}>
                        <span className="vault-dot" />
                        <span className="vault-label">{f.name}</span>
                        <span className="vault-count">{f.tickers?.length || 0}</span>
                      </button>
                      <div className="vault-actions">
                        <button title="Rename" onClick={() => { setEditingFolderId(f.id); setEditName(f.name) }}>✎</button>
                        <button title="Delete" onClick={() => deleteFolder(f.id)}>✕</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {newFolderMode ? (
            <div className="vault-row">
              <input ref={newFolderRef} className="vault-edit-input" autoFocus placeholder="Folder name..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onBlur={saveNewFolder} onKeyDown={e => { if (e.key === 'Enter') saveNewFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') } }} />
            </div>
          ) : (
            <button className="new-vault-btn" onClick={() => setNewFolderMode(true)}>+ New Folder</button>
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
            <span className="header-vault-name">{activeFolder?.name ?? 'No Folder Selected'}</span>
            <div className="ticker-tabs">
              {activeFolder?.tickers?.map(t => (
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
                onChange={e => { 
                  setSearchQuery(e.target.value); 
                  setShowDropdown(true);
                  setSearchSelectedIndex(-1); // Reset selected index on type
                }} 
                onFocus={() => setShowDropdown(true)} 
                onKeyDown={e => { 
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => prev < searchResults.length - 1 ? prev + 1 : prev);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
                  } else if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault();
                    if (searchSelectedIndex >= 0 && searchResults[searchSelectedIndex]) {
                      addTicker(searchResults[searchSelectedIndex].symbol);
                    } else {
                      addTicker(searchQuery.trim()); 
                    }
                  } else if (e.key === 'Escape') {
                    setShowDropdown(false);
                    setSearchSelectedIndex(-1);
                  }
                }} 
              />
              {searchQuery && <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchSelectedIndex(-1); }}>✕</button>}
            </div>
            {showDropdown && searchQuery && (
              <ul className="search-drop">
                {searchResults.length === 0
                  ? <li className="drop-empty" onClick={() => addTicker(searchQuery.trim())}>Press Enter to force add "{searchQuery.toUpperCase()}"</li>
                  : searchResults.map((r, i) => (
                    <li 
                      key={r.symbol} 
                      className="drop-item" 
                      style={i === searchSelectedIndex ? { backgroundColor: 'var(--border)' } : {}}
                      onClick={() => addTicker(r.symbol)}
                      onMouseEnter={() => setSearchSelectedIndex(i)}
                    >
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
          {!activeTicker && !fetchingFolders ? (
            <div className="chart-empty" style={{ height: '400px', flexDirection: 'column', gap: '12px', border: '1px dashed var(--border-md)', borderRadius: '12px' }}>
              <span style={{ fontSize: '28px' }}>◈</span>
              <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>Your Workspace is Empty</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', maxWidth: '340px', textAlign: 'center', lineHeight: 1.5 }}>
                Create a folder on the left sidebar, or type a ticker in the search engine above to initialize your view.
              </p>
            </div>
          ) : !activeTicker && fetchingFolders ? (
            <div className="chart-empty"><span className="spinner" /> Loading workspace data...</div>
          ) : (
            <>
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
                      <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                      <ChartTooltip labelFormatter={formatTooltipLabel} contentStyle={{ background: '#111', border: 'none', borderRadius: '8px', padding: '8px 12px' }} labelStyle={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }} itemStyle={{ color: graphColor, fontSize: '13px', fontFamily: 'DM Mono, monospace' }} formatter={v => [`$${v.toFixed(2)}`, 'Price']} />
                      <Line type="monotone" dataKey="price" stroke={graphColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: graphColor }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {description && (
                <div className="desc-card">
                  <h3 className="desc-title">Company Profile</h3>
                  <p className="desc-text">{description}</p>
                </div>
              )}

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

              {(aiScan || isEtf || loadingData) && (
                <div className="ai-card">
                  <div className="ai-head">
                    <span className="ai-badge">AI Assessment</span>
                    <span className="ai-sub">{activeTicker} · Institutional Scan</span>
                  </div>
                  <div className="ai-body">
                    {loadingData ? <p>Executing probability check...</p> : isEtf ? <p>ETFs represent a basket of assets. Fundamental bear/bull metrics bypass single-stock analysis.</p> : (
                      <>
                        <p><strong>🚩 Terminal Red Flag Sweep:</strong> {aiScan?.terminal_red_flags?.join(" ")}</p>
                        <p><strong>📈 Bull Case:</strong> {aiScan?.bull_case}</p>
                        <p><strong>📉 Bear Case:</strong> {aiScan?.bear_case}</p>
                        <p><strong>⚖️ Verdict:</strong> {aiScan?.neutral_verdict}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}