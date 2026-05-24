import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts'
import './App.css'

export default function App() {
  // auth states
  const [session, setSession] = useState(null)
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // ui states
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  
  // folder states
  const [folders, setFolders] = useState([
    { id: 1, name: 'shield vault', tickers: ['AAPL', 'VOO'] },
    { id: 2, name: 'satellite vault', tickers: ['PACB'] }
  ])
  const [activeFolderId, setActiveFolderId] = useState(1)
  const [editingFolder, setEditingFolder] = useState(null)
  const [editName, setEditName] = useState('')
  
  // live data states
  const [activeTicker, setActiveTicker] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1M')
  const [chartData, setChartData] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [aiSummary, setAiSummary] = useState('')
  
  // search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
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

  // real google-like autocomplete search via yahoo proxy
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length < 1) {
        setSearchResults([])
        return
      }
      try {
        const res = await fetch(`/yf-search/v1/finance/search?q=${searchQuery}&quotesCount=6`)
        const data = await res.json()
        const equities = data.quotes.filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        setSearchResults(equities)
      } catch (err) {
        console.error('search failed', err)
      }
    }
    const timeoutId = setTimeout(fetchSearchResults, 300) // debounce
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // fetch live data
  useEffect(() => {
    const fetchLiveYahooData = async () => {
      if (!activeTicker) return
      setLoadingData(true)
      
      try {
        // 1. fetch chart data
        const ranges = { '1W': '5d', '1M': '1mo', '6M': '6mo', '1Y': '1y' }
        const intervals = { '1W': '15m', '1M': '1d', '6M': '1d', '1Y': '1wk' }
        const chartRes = await fetch(`/yf/v8/finance/chart/${activeTicker}?range=${ranges[timeframe]}&interval=${intervals[timeframe]}`)
        const chartJson = await chartRes.json()
        const result = chartJson.chart.result[0]
        
        const timestamps = result.timestamp || []
        const prices = result.indicators.quote[0].close || []
        
        const formattedChart = timestamps.map((t, i) => {
          const d = new Date(t * 1000)
          const label = timeframe === '1Y' ? d.toLocaleString('default', { month: 'short', year: '2-digit' }) : `${d.getMonth()+1}/${d.getDate()}`
          return { name: label, price: prices[i] ? parseFloat(prices[i].toFixed(2)) : null }
        }).filter(item => item.price !== null)
        
        setChartData(formattedChart)
        if (formattedChart.length > 0) setCurrentPrice(formattedChart[formattedChart.length - 1].price)

        // 2. fetch metrics (financialData + defaultKeyStatistics)
        const metricsRes = await fetch(`/yf/v10/finance/quoteSummary/${activeTicker}?modules=financialData,defaultKeyStatistics`)
        const metricsJson = await metricsRes.json()
        
        if (metricsJson.quoteSummary.result) {
          const finData = metricsJson.quoteSummary.result[0].financialData || {}
          const stats = metricsJson.quoteSummary.result[0].defaultKeyStatistics || {}
          
          const cash = finData.totalCash?.raw || 0
          const debt = finData.totalDebt?.raw || 0
          
          const m = {
            war_chest_ratio: debt > 0 ? (cash / debt) : (cash > 0 ? 999 : null),
            fcf: finData.freeCashflow?.raw || null,
            revenue_yoy: finData.revenueGrowth?.raw || null,
            gross_margin: finData.grossMargins?.raw || null,
            forward_pe: stats.forwardPE?.raw || null
          }
          setMetrics(m)
          generateAISummary(m, activeTicker)
        } else {
          setMetrics(null)
          setAiSummary('data unavailable for this ticker.')
        }
      } catch (error) {
        console.error('fetch failed', error)
        setMetrics(null)
      }
      setLoadingData(false)
    }
    fetchLiveYahooData()
  }, [activeTicker, timeframe])

  // deterministic ai logic based on metrics
  const generateAISummary = (m, ticker) => {
    let s = `scan complete for ${ticker}. `
    
    if (m.war_chest_ratio !== null) {
      if (m.war_chest_ratio < 0.5) s += 'the balance sheet is flashing red flags with dangerously low cash relative to its debt obligations. '
      else if (m.war_chest_ratio > 1.5) s += 'it maintains a fortress balance sheet, easily able to cover its debt. '
      else s += 'debt and cash levels are moderately balanced. '
    }

    if (m.fcf !== null) {
      if (m.fcf < 0) s += 'it is currently burning cash, which is a major survival risk if capital dries up. '
      else s += 'operations are successfully generating positive free cash flow. '
    }

    if (m.gross_margin !== null) {
      if (m.gross_margin > 0.5) s += 'pricing power is excellent, boasting gross margins over 50%. '
      else if (m.gross_margin < 0.2) s += 'margins are extremely tight, indicating a tough competitive environment or high costs. '
    }

    if (m.forward_pe !== null) {
      if (m.forward_pe > 40) s += 'valuation is stretched (p/e > 40), meaning the market is pricing in absolute perfection.'
      else if (m.forward_pe < 15) s += 'it is trading at a potential value discount (p/e < 15) relative to the broader market.'
      else s += 'valuation sits in a standard, fair-value range.'
    }

    if (s === `scan complete for ${ticker}. `) s += 'insufficient data to generate a complete summary.'
    setAiSummary(s)
  }

  // helpers
  const isUp = chartData.length > 0 && chartData[chartData.length - 1].price >= chartData[0].price
  const graphColor = isUp ? '#16a34a' : '#dc2626'

  const getColor = (val, type) => {
    if (val === null || val === undefined) return 'bg-white'
    if (type === 'warChest') return val < 0.5 ? 'bg-red' : val < 1.0 ? 'bg-yellow' : 'bg-green'
    if (type === 'fcf' || type === 'margin') return val > 0 ? 'bg-green' : 'bg-red'
    if (type === 'pe') return val > 40 ? 'bg-red' : val < 15 ? 'bg-green' : 'bg-white'
    return 'bg-white'
  }

  const formatNum = (num, type) => {
    if (num === null || num === undefined) return 'n/a'
    if (type === 'pct') return `${(num * 100).toFixed(1)}%`
    if (type === 'raw') return num.toFixed(2)
    if (type === 'curr') {
      if (Math.abs(num) > 1e9) return `$${(num / 1e9).toFixed(2)}B`
      if (Math.abs(num) > 1e6) return `$${(num / 1e6).toFixed(2)}M`
      return `$${num.toLocaleString()}`
    }
  }

  // folder crud
  const createFolder = () => { const name = prompt('folder name:'); if (name) setFolders([...folders, { id: Date.now(), name, tickers: [] }]) }
  const saveFolderEdit = (id) => { setFolders(folders.map(f => f.id === id ? { ...f, name: editName } : f)); setEditingFolder(null) }
  const deleteFolder = (id) => { if (folders.length > 1) { const updated = folders.filter(f => f.id !== id); setFolders(updated); if (activeFolderId === id) setActiveFolderId(updated[0].id) } else alert('cannot delete last folder') }
  const addTickerToFolder = (ticker) => {
    setFolders(folders.map(f => f.id === activeFolderId && !f.tickers.includes(ticker) ? { ...f, tickers: [...f.tickers, ticker] } : f))
    setActiveTicker(ticker)
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleAuth = async (e, type) => {
    e.preventDefault()
    const { error } = type === 'up' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
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
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰ menu</button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><h2>folders</h2><button className="btn-text btn-small" onClick={createFolder}>+ new</button></div>
        <div className="sidebar-menu">
          {folders.map(f => (
            <div key={f.id} className={`menu-item-wrapper ${activeFolderId === f.id ? 'active' : ''}`}>
              {editingFolder === f.id ? (
                <div className="edit-folder-form"><input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => saveFolderEdit(f.id)} onKeyDown={e => e.key === 'Enter' && saveFolderEdit(f.id)} /></div>
              ) : (
                <>
                  <button className="menu-item" onClick={() => { setActiveFolderId(f.id); setSidebarOpen(false); }}>{f.name}</button>
                  <div className="folder-actions"><button onClick={() => { setEditingFolder(f.id); setEditName(f.name); }}>✎</button><button onClick={() => deleteFolder(f.id)}>✕</button></div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer"><button className="btn-danger" onClick={() => supabase.auth.signOut()}>sign out</button></div>
      </aside>

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
              placeholder="search real stocks (e.g., TSLA)" 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => {if(searchQuery) setShowDropdown(true)}}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className="search-dropdown">
                {searchResults.map(t => (
                  <li key={t.symbol} onClick={() => addTickerToFolder(t.symbol)}>
                    <span className="search-ticker">{t.symbol}</span>
                    <span className="search-name">{t.shortname}</span>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && searchQuery && searchResults.length === 0 && (
              <ul className="search-dropdown"><li className="no-results">searching...</li></ul>
            )}
          </div>
        </header>

        <div className="content-grid">
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>{activeTicker}</h3>
                {currentPrice > 0 && <p className="live-price">${currentPrice.toFixed(2)}</p>}
              </div>
              <div className="timeframes">
                {['1W', '1M', '6M', '1Y'].map(tf => (
                  <button key={tf} className={`tf-btn ${timeframe === tf ? 'active-tf' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              {loadingData ? <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>loading api...</div> : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#6b7280" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <ChartTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="price" stroke={graphColor} strokeWidth={3} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="ai-summary">
            <h4>✨ ai metric summarizer</h4>
            <p>{loadingData ? 'analyzing data...' : aiSummary}</p>
          </div>

          <div className="metrics-grid">
            <div className={`metric-card ${getColor(metrics?.war_chest_ratio, 'warChest')}`}>
              <div className="metric-header">
                <h4>war chest ratio</h4>
                <div className="tooltip-container"><span className="info-icon">i</span><div className="tooltip">cash divided by total debt. <br/><br/>&lt; 0.5: severe risk (red)<br/>0.5 - 1.0: caution (yellow)<br/>&gt; 1.0: healthy (green)</div></div>
              </div>
              <p className="metric-value">{formatNum(metrics?.war_chest_ratio, 'raw')}</p>
            </div>
            
            <div className={`metric-card ${getColor(metrics?.fcf, 'fcf')}`}>
              <div className="metric-header">
                <h4>free cash flow</h4>
                <div className="tooltip-container"><span className="info-icon">i</span><div className="tooltip">cash left after operations.<br/><br/>negative: burning cash (red)<br/>positive: generating cash (green)</div></div>
              </div>
              <p className="metric-value">{formatNum(metrics?.fcf, 'curr')}</p>
            </div>

            <div className={`metric-card ${getColor(metrics?.gross_margin, 'margin')}`}>
              <div className="metric-header">
                <h4>gross margin</h4>
                <div className="tooltip-container"><span className="info-icon">i</span><div className="tooltip">revenue retained after direct costs. higher implies stronger pricing power.</div></div>
              </div>
              <p className="metric-value">{formatNum(metrics?.gross_margin, 'pct')}</p>
            </div>

            <div className={`metric-card ${getColor(metrics?.forward_pe, 'pe')}`}>
              <div className="metric-header">
                <h4>forward p/e</h4>
                <div className="tooltip-container"><span className="info-icon">i</span><div className="tooltip">price to expected earnings.<br/><br/>&gt; 40: expensive (red)<br/>&lt; 15: value (green)</div></div>
              </div>
              <p className="metric-value">{formatNum(metrics?.forward_pe, 'raw')}</p>
            </div>
            
            <div className="metric-card bg-white">
              <div className="metric-header">
                <h4>revenue yoy</h4>
                <div className="tooltip-container"><span className="info-icon">i</span><div className="tooltip">year-over-year revenue growth percentage. indicates business expansion or contraction.</div></div>
              </div>
              <p className="metric-value">{formatNum(metrics?.revenue_yoy, 'pct')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}