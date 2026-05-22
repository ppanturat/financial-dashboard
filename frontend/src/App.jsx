import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts'
import './App.css'

// popular tickers for search priority
const popularTickers = ['VOO', 'SPY', 'AAPL', 'MSFT', 'NVDA', 'V', 'TSLA', 'META', 'AMZN', 'PACB', 'SDGR', 'RKLB']
const allTickers = [...popularTickers, 'AMD', 'INTC', 'NFLX', 'DIS', 'BA', 'JPM', 'GS']

// mock chart generator for timeframes
const generateChartData = (timeframe) => {
  const data = []
  let price = 100
  const points = timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '1Y' ? 12 : 5
  const labels = timeframe === '1Y' ? ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] : null
  
  for (let i = 0; i < points; i++) {
    price = price + (Math.random() * 10 - 4.5) // random walk
    data.push({ name: labels ? labels[i] : `day ${i+1}`, price: parseFloat(price.toFixed(2)) })
  }
  return data
}

export default function App() {
  // auth state
  const [session, setSession] = useState(null)
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // ui state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // folder & ticker state
  const [folders, setFolders] = useState([
    { id: 1, name: 'shield vault', tickers: ['VOO', 'V'] },
    { id: 2, name: 'satellite vault', tickers: ['PACB', 'SDGR'] }
  ])
  const [activeFolderId, setActiveFolderId] = useState(1)
  const [editingFolder, setEditingFolder] = useState(null)
  const [editName, setEditName] = useState('')
  
  // active asset state
  const [activeTicker, setActiveTicker] = useState('VOO')
  const [metrics, setMetrics] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  
  // chart state
  const [timeframe, setTimeframe] = useState('1M')
  const [chartData, setChartData] = useState([])
  
  // search state
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // init auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: authListener } = supabase.auth.onAuthStateChange((evt, session) => {
      setSession(session)
      if (evt === 'SIGNED_IN') setView('login')
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  // fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!session || !activeTicker) return
      setLoadingData(true)
      const { data } = await supabase.from('global_metrics').select('*').eq('ticker', activeTicker).single()
      setMetrics(data || null)
      setLoadingData(false)
    }
    fetchMetrics()
  }, [activeTicker, session])

  // update chart on timeframe or ticker change
  useEffect(() => {
    setChartData(generateChartData(timeframe))
  }, [timeframe, activeTicker])

  // graph color logic
  const isUp = chartData.length > 0 && chartData[chartData.length - 1].price >= chartData[0].price
  const graphColor = isUp ? '#16a34a' : '#dc2626'

  // metric colors
  const getColor = (val, type) => {
    if (val === null || val === undefined) return 'bg-white'
    if (type === 'warChest') {
      if (val < 0.5) return 'bg-red'
      if (val < 1.0) return 'bg-yellow'
      return 'bg-green'
    }
    if (type === 'fcf') return val > 0 ? 'bg-green' : 'bg-red'
    return 'bg-white'
  }

  // search filter & sort (popular first)
  const filteredSearch = useMemo(() => {
    if (!searchQuery) return []
    const lowerQ = searchQuery.toLowerCase()
    const matches = allTickers.filter(t => t.toLowerCase().startsWith(lowerQ))
    return matches.sort((a, b) => {
      const aPop = popularTickers.indexOf(a)
      const bPop = popularTickers.indexOf(b)
      if (aPop !== -1 && bPop !== -1) return aPop - bPop
      if (aPop !== -1) return -1
      if (bPop !== -1) return 1
      return a.localeCompare(b)
    })
  }, [searchQuery])

  // folder crud
  const createFolder = () => {
    const name = prompt('folder name:')
    if (name) setFolders([...folders, { id: Date.now(), name, tickers: [] }])
  }
  
  const saveFolderEdit = (id) => {
    setFolders(folders.map(f => f.id === id ? { ...f, name: editName } : f))
    setEditingFolder(null)
  }

  const deleteFolder = (id) => {
    if (folders.length === 1) return alert('cannot delete last folder')
    const updated = folders.filter(f => f.id !== id)
    setFolders(updated)
    if (activeFolderId === id) setActiveFolderId(updated[0].id)
  }

  const addTickerToFolder = (ticker) => {
    setFolders(folders.map(f => {
      if (f.id === activeFolderId && !f.tickers.includes(ticker)) {
        return { ...f, tickers: [...f.tickers, ticker] }
      }
      return f
    }))
    setActiveTicker(ticker)
    setSearchQuery('')
  }

  // auth handler
  const handleAuth = async (e, type) => {
    e.preventDefault()
    const { error } = type === 'up' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else if (type === 'up') setView('check_email')
  }

  if (!session) {
    if (view === 'check_email') return <div className="auth-wrapper"><div className="auth-card"><h2>check email</h2></div></div>
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h2>{view === 'login' ? 'login' : 'register'}</h2>
          <form className="auth-form" onSubmit={(e) => handleAuth(e, view === 'login' ? 'in' : 'up')}>
            <input type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="btn-primary" type="submit">{view}</button>
          </form>
          <button className="btn-text" onClick={() => setView(view === 'login' ? 'register' : 'login')}>switch to {view === 'login' ? 'register' : 'login'}</button>
        </div>
      </div>
    )
  }

  const activeFolder = folders.find(f => f.id === activeFolderId)

  return (
    <div className="dashboard-layout">
      {/* mobile toggle */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰ menu</button>

      {/* sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>folders</h2>
          <button className="btn-text btn-small" onClick={createFolder}>+ new</button>
        </div>
        <div className="sidebar-menu">
          {folders.map(f => (
            <div key={f.id} className={`menu-item-wrapper ${activeFolderId === f.id ? 'active' : ''}`}>
              {editingFolder === f.id ? (
                <div className="edit-folder-form">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => saveFolderEdit(f.id)} onKeyDown={e => e.key === 'Enter' && saveFolderEdit(f.id)} />
                </div>
              ) : (
                <>
                  <button className="menu-item" onClick={() => { setActiveFolderId(f.id); setSidebarOpen(false); }}>{f.name}</button>
                  <div className="folder-actions">
                    <button onClick={() => { setEditingFolder(f.id); setEditName(f.name); }}>✎</button>
                    <button onClick={() => deleteFolder(f.id)}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <p className="user-email">{session.user.email}</p>
          <button className="btn-danger" onClick={() => supabase.auth.signOut()}>sign out</button>
        </div>
      </aside>

      {/* main content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-titles">
            <h2>{activeFolder?.name}</h2>
            <div className="ticker-tabs">
              {activeFolder?.tickers.map(t => (
                <button key={t} className={`tab ${activeTicker === t ? 'active-tab' : ''}`} onClick={() => setActiveTicker(t)}>{t}</button>
              ))}
            </div>
          </div>
          
          <div className="search-container">
            <input 
              type="text" 
              placeholder="add ticker to folder (e.g., V)" 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && searchQuery && (
              <ul className="search-dropdown">
                {filteredSearch.length > 0 ? filteredSearch.map(t => (
                  <li key={t} onClick={() => addTickerToFolder(t)}>
                    <span className="search-ticker">{t}</span>
                    {popularTickers.includes(t) && <span className="search-badge">popular</span>}
                  </li>
                )) : <li className="no-results">no matches</li>}
              </ul>
            )}
          </div>
        </header>

        <div className="content-grid">
          {/* chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>{activeTicker} price action (mock)</h3>
              <div className="timeframes">
                {['1W', '1M', '1Y'].map(tf => (
                  <button key={tf} className={`tf-btn ${timeframe === tf ? 'active-tf' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#6b7280" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="price" stroke={graphColor} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* global health summary */}
          <div className="health-summary">
            <h4>overall metrics meaning</h4>
            <p>green indicates strong financial health and survival capability. yellow suggests caution or high debt. red indicates severe survival risk or cash bleed.</p>
          </div>

          {/* metrics */}
          <div className="metrics-grid">
            <div className={`metric-card ${getColor(metrics?.war_chest_ratio, 'warChest')}`}>
              <div className="metric-header">
                <h4>war chest ratio</h4>
                <div className="tooltip-container">
                  <span className="info-icon">i</span>
                  <div className="tooltip">cash divided by total debt. <br/><br/>&lt; 0.5: severe risk (red)<br/>0.5 - 1.0: caution (yellow)<br/>&gt; 1.0: healthy (green)</div>
                </div>
              </div>
              <p className="metric-value">{metrics?.war_chest_ratio ? metrics.war_chest_ratio.toFixed(2) : 'n/a'}</p>
            </div>
            
            <div className={`metric-card ${getColor(metrics?.fcf, 'fcf')}`}>
              <div className="metric-header">
                <h4>free cash flow</h4>
                <div className="tooltip-container">
                  <span className="info-icon">i</span>
                  <div className="tooltip">cash left after operations and capital expenditures.<br/><br/>negative: burning cash (red)<br/>positive: generating cash (green)</div>
                </div>
              </div>
              <p className="metric-value">{metrics?.fcf ? `$${metrics.fcf.toLocaleString()}` : 'n/a'}</p>
            </div>
            
            <div className="metric-card bg-white">
              <div className="metric-header">
                <h4>revenue yoy</h4>
                <div className="tooltip-container">
                  <span className="info-icon">i</span>
                  <div className="tooltip">year-over-year revenue growth percentage. indicates business expansion or contraction.</div>
                </div>
              </div>
              <p className="metric-value">{metrics?.revenue_yoy ? `${(metrics.revenue_yoy * 100).toFixed(1)}%` : 'n/a'}</p>
            </div>
          </div>
          
          {!metrics && !loadingData && (
            <p className="db-warning">no data found for {activeTicker} in global metrics. run your python script.</p>
          )}
        </div>
      </main>
    </div>
  )
}