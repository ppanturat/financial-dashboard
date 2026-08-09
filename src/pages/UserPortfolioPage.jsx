import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts'
import { api } from '../lib/api'
import { fetchThbRate, fmtCurrency as fmt } from '../lib/formatters'
import { CHART_COLORS as COLORS } from '../lib/constants'
import { Avatar } from '../components/Avatar'
import { AssetRow, PieLegend, GrowthChart, DividendChart } from './PortfolioView'

export function UserPortfolioPage({ user, feed, feedHoldings, onBack }) {
  const [livePrices, setLivePrices] = useState({})
  const [loading, setLoading]       = useState(true)
  const [currency, setCurrency]     = useState('USD')
  const [thbRate, setThbRate]       = useState(34.5)

  const folders  = feed.filter(f => f.user_id === user.id)
  const holdings = feedHoldings.filter(h => folders.some(f => f.id === h.folder_id))
  const tickersKey = [...new Set(holdings.map(h => h.ticker))].join(',')

  const fetchPrices = useCallback(async () => {
    if (!tickersKey) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await api.bulkPrices(tickersKey)
      setLivePrices(data)
    } finally {
      setLoading(false)
    }
  }, [tickersKey])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPrices() }, [fetchPrices])
  useEffect(() => { fetchThbRate().then(setThbRate) }, [])

  const pieData = holdings.map(h => {
    const amount    = parseFloat(h.amount)    || 0
    const buyPrice  = parseFloat(h.buy_price) || 0
    const raw       = livePrices?.[h.ticker] ?? livePrices?.[h.ticker?.toUpperCase()] ?? livePrices?.[h.ticker?.toLowerCase()]
    const livePrice = raw !== undefined ? parseFloat(raw) : buyPrice
    const currentValue = amount * livePrice
    const costBasis    = amount * buyPrice
    const profitLoss   = currentValue - costBasis
    const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
    return { ...h, currentValue, livePrice, profitLoss, profitLossPct, costBasis }
  }).sort((a, b) => b.currentValue - a.currentValue)

  const totalValue     = pieData.reduce((sum, h) => sum + h.currentValue, 0)
  const totalCostBasis = pieData.reduce((sum, h) => sum + h.costBasis, 0)
  const totalPnL        = totalValue - totalCostBasis
  const totalPnLPct     = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

  const pieDataWithPct = pieData.map(h => ({
    ...h,
    pct: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
  }))

  return (
    <>
      <div className="portfolio-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", flexShrink: 0 }}>
            ← Back
          </button>
          <Avatar name={user.name || user.username} avatarUrl={user.avatar_url} size={40} />
          <div style={{ minWidth: 0 }}>
            <h2 className="port-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Investor'}</h2>
            <div className="port-balance-row">
              <span className="price-value">{fmt(totalValue, currency, thbRate)}</span>
              <span className={`price-delta ${totalPnL >= 0 ? 'up' : 'down'}`}>
                {totalPnL >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalPnL), currency, thbRate)} ({totalPnLPct >= 0 ? '+' : ''}{Math.abs(totalPnLPct).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="port-header-actions">
          <div className="currency-toggle">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
            <button className={currency === 'THB' ? 'active' : ''} onClick={() => setCurrency('THB')}>THB</button>
          </div>
        </div>
      </div>

      <div className="portfolio-grid">
        <div className="chart-card port-chart">
          <h3 className="desc-title">Asset Allocation</h3>
          {pieDataWithPct.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieDataWithPct} dataKey="currentValue" nameKey="ticker"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieDataWithPct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip
                    formatter={(v, name) => [fmt(v, currency, thbRate), name]}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <PieLegend data={pieDataWithPct} />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
              {loading ? 'Loading…' : 'No public holdings.'}
            </div>
          )}
        </div>

        <div className="chart-card port-table-container">
          <h3 className="desc-title">Holdings</h3>
          {folders.map(folder => {
            const folderHoldings = pieDataWithPct.filter(h => h.folder_id === folder.id)
            if (!folderHoldings.length) return null
            return (
              <div key={folder.id}>
                {folders.length > 1 && (
                  <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {folder.name}
                  </div>
                )}
                {folderHoldings.map(h => (
                  <AssetRow key={h.id} holding={h} color={COLORS[pieDataWithPct.indexOf(h) % COLORS.length]} currency={currency} thbRate={thbRate} />
                ))}
              </div>
            )
          })}
          {pieDataWithPct.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'No public holdings.'}
            </div>
          )}
        </div>
      </div>

      <GrowthChart costBasis={totalCostBasis} currentValue={totalValue} defaultCurrency={currency} thbRate={thbRate} />
      <DividendChart holdings={holdings} defaultCurrency={currency} thbRate={thbRate} />
    </>
  )
}
