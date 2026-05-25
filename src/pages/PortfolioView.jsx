import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, ReferenceLine
} from 'recharts'
import { HoldingModal } from '../components/HoldingModal'
import { EmptyState } from '../components/EmptyState'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#0d9488', '#db2777']

// fetch USD→THB rate
async function fetchThbRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    return data.rates?.THB ?? 34.5
  } catch { return 34.5 }
}

function fmt(val, currency, thbRate) {
  if (currency === 'THB') {
    return '฿' + (val * thbRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// custom pie label
function PieLegend({ data }) {
  return (
    <div className="pie-legend">
      {data.map((entry, i) => (
        <div key={entry.ticker} className="pie-legend-item">
          <span className="pie-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
          <span className="pie-legend-ticker">{entry.ticker}</span>
          <span className="pie-legend-pct">{entry.pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

// build mock portfolio growth from holdings (cost basis → current value over 6 months)
function buildGrowthData(pieData, totalPortfolioValue, totalCostBasis) {
  if (pieData.length === 0) return []
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Now']
  return months.map((m, i) => {
    const t = i / (months.length - 1)
    const val = totalCostBasis + (totalPortfolioValue - totalCostBasis) * Math.pow(t, 1.2)
    return { month: m, value: parseFloat(val.toFixed(2)) }
  })
}

export function PortfolioView({ 
  activePortfolioId, holdings, livePrices, loadingHoldings, 
  marketFolders, saveHolding, removeHolding, openConfirmModal 
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObj, setEditingObj] = useState(null)
  const [currency, setCurrency] = useState('USD')
  const [thbRate, setThbRate] = useState(34.5)

  useEffect(() => {
    fetchThbRate().then(setThbRate)
  }, [])

  const handleOpenModal = (holding = null) => { setEditingObj(holding); setModalOpen(true) }
  const handleDelete = (id, ticker) => {
    openConfirmModal('Delete Holding', `Remove ${ticker} from this folder?`, () => removeHolding(id))
  }

  if (!activePortfolioId) return <EmptyState loading={loadingHoldings} />
  if (loadingHoldings) return <div className="chart-empty">Loading portfolio data...</div>

  let totalPortfolioValue = 0, totalCostBasis = 0

  const pieData = holdings.map(h => {
    const livePrice = livePrices[h.ticker] || h.buy_price
    const currentValue = h.amount * livePrice
    const costBasis = h.amount * h.buy_price
    totalPortfolioValue += currentValue
    totalCostBasis += costBasis
    return {
      ...h, currentValue, livePrice,
      profitLoss: currentValue - costBasis,
      profitLossPct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
    }
  }).sort((a, b) => b.currentValue - a.currentValue)

  // add percentage for legend
  const pieDataWithPct = pieData.map(h => ({
    ...h,
    pct: totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0
  }))

  const totalPnL = totalPortfolioValue - totalCostBasis
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0
  const growthData = buildGrowthData(pieData, totalPortfolioValue, totalCostBasis)

  // yield data — P&L per holding
  const yieldData = pieDataWithPct.map(h => ({
    name: h.ticker,
    yield: parseFloat(h.profitLossPct.toFixed(2)),
    value: parseFloat(h.profitLoss.toFixed(2))
  }))

  const symb = currency === 'THB' ? '฿' : '$'

  return (
    <>
      <HoldingModal
        isOpen={modalOpen}
        holding={editingObj}
        marketFolders={marketFolders}
        onClose={() => setModalOpen(false)}
        onSave={saveHolding}
      />

      {/* header row */}
      <div className="portfolio-header">
        <div>
          <h2 className="port-title">Total Balance</h2>
          <div className="port-balance-row">
            <span className="price-value">{fmt(totalPortfolioValue, currency, thbRate)}</span>
            <span className={`price-delta ${totalPnL >= 0 ? 'up' : 'down'}`}>
              {totalPnL >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalPnL), currency, thbRate)} ({Math.abs(totalPnLPct).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="port-header-actions">
          {/* currency toggle */}
          <div className="currency-toggle">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
            <button className={currency === 'THB' ? 'active' : ''} onClick={() => setCurrency('THB')}>฿ THB</button>
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => handleOpenModal()}>+ Add Holding</button>
        </div>
      </div>

      {/* allocation + table */}
      <div className="portfolio-grid">
        {/* pie chart */}
        <div className="chart-card port-chart">
          <h3 className="desc-title">Asset Allocation</h3>
          {pieDataWithPct.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieDataWithPct} dataKey="currentValue" nameKey="ticker"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}
                  >
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
            <div className="chart-empty">No assets to display.</div>
          )}
        </div>

        {/* holdings table */}
        <div className="chart-card port-table-container">
          <h3 className="desc-title">Your Assets</h3>
          <table className="port-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Shares</th>
                <th>Avg Cost</th>
                <th>Live Price</th>
                <th>P&amp;L</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieDataWithPct.map(h => (
                <tr key={h.id}>
                  <td>
                    <span className="port-ticker-dot" style={{ background: COLORS[pieDataWithPct.indexOf(h) % COLORS.length] }} />
                    <span className="font-mono font-bold">{h.ticker}</span>
                  </td>
                  <td className="num">{h.amount}</td>
                  <td className="num">{fmt(h.buy_price, currency, thbRate)}</td>
                  <td className="num">{fmt(h.livePrice, currency, thbRate)}</td>
                  <td className={`num ${h.profitLoss >= 0 ? 'text-green' : 'text-red'}`}>
                    {h.profitLoss >= 0 ? '+' : '-'}{fmt(Math.abs(h.profitLoss), currency, thbRate)}
                    <span className="pnl-pct"> ({h.profitLossPct >= 0 ? '+' : ''}{h.profitLossPct.toFixed(2)}%)</span>
                  </td>
                  <td className="port-actions">
                    <button onClick={() => handleOpenModal(h)}>✎</button>
                    <button onClick={() => handleDelete(h.id, h.ticker)}>✕</button>
                  </td>
                </tr>
              ))}
              {pieDataWithPct.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No holdings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Growth chart */}
      {growthData.length > 0 && (
        <div className="chart-card">
          <h3 className="desc-title">Portfolio Growth</h3>
          <p className="chart-sub">Cost basis → current value trajectory</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}
                axisLine={false} tickLine={false} width={72}
                tickFormatter={v => symb + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0))}
              />
              <LineTooltip
                formatter={v => [fmt(v, currency, thbRate), 'Portfolio Value']}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine y={totalCostBasis} stroke="var(--muted)" strokeDasharray="4 2" label={{ value: 'Cost Basis', fill: 'var(--muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Yield per Holding chart */}
      {yieldData.length > 0 && (
        <div className="chart-card">
          <h3 className="desc-title">Yield per Holding</h3>
          <p className="chart-sub">Unrealised return % per position</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yieldData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}
                axisLine={false} tickLine={false} width={48}
                tickFormatter={v => v.toFixed(1) + '%'}
              />
              <LineTooltip
                formatter={(v, key) => [
                  key === 'yield' ? v.toFixed(2) + '%' : fmt(Math.abs(v), currency, thbRate),
                  key === 'yield' ? 'Return %' : 'P&L'
                ]}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="yield" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 5, fill: '#16a34a', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}
