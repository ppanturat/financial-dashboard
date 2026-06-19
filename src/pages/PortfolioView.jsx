import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, ReferenceLine,
  BarChart, Bar, Area, AreaChart
} from 'recharts'
import { HoldingModal } from '../components/HoldingModal'
import { EmptyState } from '../components/EmptyState'
import { api } from '../lib/api'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#0d9488', '#db2777']

async function fetchThbRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    return data.rates?.THB ?? 34.5
  } catch { return 34.5 }
}

function fmt(val, currency, thbRate) {
  const num = parseFloat(val) || 0
  if (currency === 'THB') {
    return '฿' + (num * thbRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtK(val, symb) {
  if (Math.abs(val) >= 1000) return symb + (val / 1000).toFixed(1) + 'k'
  return symb + val.toFixed(0)
}

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

const RANGE_CONFIG = {
  '1D': { points: 24, labelFn: i => i % 6 === 0 ? `${i}h` : '',       noise: 0.003, drift: 0.008 },
  '1W': { points: 7,  labelFn: i => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], noise: 0.008, drift: 0.02 },
  '1M': { points: 30, labelFn: i => i % 7 === 0 ? `Day ${i+1}` : '',  noise: 0.012, drift: 0.05 },
  '3M': { points: 13, labelFn: i => `W${i+1}`,                         noise: 0.018, drift: 0.10 },
  '1Y': { points: 12, labelFn: i => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], noise: 0.025, drift: 0.15 },
}

function buildGrowthData(costBasis, currentValue, range) {
  if (costBasis <= 0) return []
  const { points, labelFn, noise } = RANGE_CONFIG[range]
  const totalGain = currentValue / costBasis - 1
  let seed = Math.floor(costBasis) % 9999
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff }
  const values = [costBasis]
  for (let i = 1; i < points; i++) {
    const t = i / (points - 1)
    const trend = costBasis * (1 + totalGain * Math.pow(t, 1.3))
    values.push(Math.max(0, trend + (rng() - 0.5) * 2 * noise * costBasis))
  }
  values[values.length - 1] = currentValue
  return values.map((v, i) => ({ label: labelFn(i), value: parseFloat(v.toFixed(2)) }))
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHLY_WEIGHTS = [0.05,0.05,0.18,0.05,0.05,0.18,0.05,0.05,0.18,0.05,0.05,0.18]

function buildDividendDisplay(holdings, divData, currency, thbRate) {
  const applyRate = v => currency === 'THB' ? v * thbRate : v
  const s = currency === 'THB' ? '฿' : '$'
  const holdingDivs = holdings.map(h => {
    const shares = parseFloat(h.amount) || 0
    const dps = divData?.[h.ticker.toUpperCase()]?.dps ?? 0
    return { ticker: h.ticker, annual: shares * dps }
  })
  const totalAnnual = holdingDivs.reduce((s, d) => s + d.annual, 0)
  const costBasisTotal = holdings.reduce((s, h) => s + (parseFloat(h.amount)||0)*(parseFloat(h.buy_price)||0), 0)
  const monthData = MONTH_LABELS.map((m, i) => ({
    month: m, amount: applyRate(parseFloat((totalAnnual * MONTHLY_WEIGHTS[i]).toFixed(4)))
  }))
  const stockData = holdingDivs.filter(d => d.annual > 0).map(d => ({
    ticker: d.ticker,
    annual: applyRate(parseFloat(d.annual.toFixed(4))),
    monthly: applyRate(parseFloat((d.annual / 12).toFixed(4)))
  })).sort((a, b) => b.annual - a.annual)
  return {
    totalAnnual: applyRate(totalAnnual), monthly: applyRate(totalAnnual / 12),
    daily: applyRate(totalAnnual / 365),
    yieldPct: costBasisTotal > 0 ? (totalAnnual / costBasisTotal) * 100 : 0,
    monthData, stockData, symb: s
  }
}

function RangeButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--accent)' : 'transparent', border: 'none',
      padding: '5px 11px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
      color: active ? '#fff' : 'var(--muted)', fontWeight: active ? '700' : '500',
      transition: 'all 0.15s', fontFamily: 'DM Mono, monospace', letterSpacing: '.03em',
    }}>
      {label}
    </button>
  )
}

function StatPill({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: highlight || 'var(--text)' }}>{value}</span>
    </div>
  )
}

function GrowthChart({ costBasis, currentValue, defaultCurrency, thbRate }) {
  const [range, setRange] = useState('1M')
  const [currency, setCurrency] = useState(defaultCurrency || 'USD')
  const symb = currency === 'THB' ? '฿' : '$'
  const data = useMemo(() => buildGrowthData(costBasis, currentValue, range), [costBasis, currentValue, range])
  const pnl = currentValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  const isUp = pnl >= 0
  const lineColor = isUp ? '#16a34a' : '#dc2626'
  const gradId = isUp ? 'growthGradGreen' : 'growthGradRed'
  const displayedCost = currency === 'THB' ? costBasis * thbRate : costBasis

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 8px', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="desc-title" style={{ marginBottom: 6 }}>Portfolio Growth</p>
          <div className="port-balance-row">
            <span className="price-value">{fmt(currentValue, currency, thbRate)}</span>
            <span className={`price-delta ${isUp ? 'up' : 'down'}`}>
              {isUp ? '▲' : '▼'} {fmt(Math.abs(pnl), currency, thbRate)} ({isUp ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          <div className="currency-toggle">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
            <button className={currency === 'THB' ? 'active' : ''} onClick={() => setCurrency('THB')}>THB</button>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border-md)' }}>
            {Object.keys(RANGE_CONFIG).map(r => (
              <RangeButton key={r} label={r} active={range === r} onClick={() => setRange(r)} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, padding: '0 8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <StatPill label="Cost Basis" value={fmt(costBasis, currency, thbRate)} />
        <StatPill label="Open P/L"   value={`${isUp?'+':'-'}${fmt(Math.abs(pnl), currency, thbRate)}`}  highlight={isUp ? 'var(--green)' : 'var(--red)'} />
        <StatPill label="Return"     value={`${isUp?'+':''}${pnlPct.toFixed(2)}%`}                        highlight={isUp ? 'var(--green)' : 'var(--red)'} />
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.18} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--faint)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--faint)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={68} tickFormatter={v => fmtK(v, symb)} domain={['auto', 'auto']} />
            <LineTooltip formatter={v => [fmt(v, currency, thbRate), 'Portfolio Value']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={displayedCost} stroke="var(--faint)" strokeDasharray="4 2" label={{ value: 'Cost', fill: 'var(--faint)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
            <Area type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">Add holdings to see growth chart.</div>
      )}
    </div>
  )
}

const DIV_VIEWS = ['Monthly', 'By Stock']

function DividendChart({ holdings, defaultCurrency, thbRate }) {
  const [view, setView] = useState('Monthly')
  const [currency, setCurrency] = useState(defaultCurrency || 'USD')
  const [divData, setDivData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const accentColor = '#d97706'

  useEffect(() => {
    if (!holdings.length) return
    const tickers = [...new Set(holdings.map(h => h.ticker.toUpperCase()))].join(',')
    setLoading(true); setError(null)
    api.dividends(tickers)
      .then(data => { setDivData(data); setLoading(false) })
      .catch(() => { setError('Could not load dividend data.'); setLoading(false) })
  }, [holdings])

  const div = useMemo(
    () => buildDividendDisplay(holdings, divData, currency, thbRate),
    [holdings, divData, currency, thbRate]
  )

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 8px', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="desc-title" style={{ marginBottom: 6 }}>Dividend Income</p>
          <div className="port-balance-row">
            <span className="price-value">{loading ? '—' : `${div.symb}${div.totalAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
            <span className="price-delta" style={{ color: 'var(--muted)' }}>/ year</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          <div className="currency-toggle">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
            <button className={currency === 'THB' ? 'active' : ''} onClick={() => setCurrency('THB')}>THB</button>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border-md)' }}>
            {DIV_VIEWS.map(v => <RangeButton key={v} label={v} active={view === v} onClick={() => setView(v)} />)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, padding: '0 8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <StatPill label="Monthly" value={loading ? '—' : `${div.symb}${div.monthly.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} highlight={accentColor} />
        <StatPill label="Daily"   value={loading ? '—' : `${div.symb}${div.daily.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} />
        <StatPill label="Yield"   value={loading ? '—' : `${div.yieldPct.toFixed(2)}%`} />
      </div>
      {loading && <div className="chart-empty">Loading dividend data…</div>}
      {error && <div className="chart-empty" style={{ color: 'var(--red)' }}>{error}</div>}
      {!loading && !error && holdings.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          {view === 'Monthly' ? (
            <BarChart data={div.monthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="divBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={accentColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--faint)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--faint)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={60} tickFormatter={v => div.symb + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0))} />
              <LineTooltip formatter={v => [`${div.symb}${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, 'Dividend']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="amount" fill="url(#divBarGrad)" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <BarChart data={div.stockData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--faint)', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={v => div.symb + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0))} />
              <YAxis type="category" dataKey="ticker" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }} axisLine={false} tickLine={false} width={52} />
              <LineTooltip formatter={(v, key) => [`${div.symb}${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, key === 'annual' ? 'Annual' : 'Monthly']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="annual"  fill={accentColor} radius={[0,4,4,0]} maxBarSize={22} name="annual" />
              <Bar dataKey="monthly" fill={accentColor} fillOpacity={0.35} radius={[0,4,4,0]} maxBarSize={22} name="monthly" />
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (!loading && !error && <div className="chart-empty">Add holdings to see dividend income.</div>)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PortfolioView({
  activePortfolioId, holdings, livePrices, loadingHoldings,
  marketFolders, saveHolding, removeHolding, openConfirmModal
}) {
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingObj, setEditingObj] = useState(null)
  const [currency, setCurrency]     = useState('USD')
  const [thbRate, setThbRate]       = useState(34.5)

  useEffect(() => { fetchThbRate().then(setThbRate) }, [])

  const handleOpenModal = (holding = null) => { setEditingObj(holding); setModalOpen(true) }
  const handleDelete = (id, ticker) => openConfirmModal('Delete Holding', `Remove ${ticker} from this folder?`, () => removeHolding(id))

  if (!activePortfolioId) return <EmptyState loading={loadingHoldings} />
  if (loadingHoldings) return <div className="chart-empty">Loading portfolio data...</div>

  let totalPortfolioValue = 0, totalCostBasis = 0

  const pieData = holdings.map(h => {
    const amount    = parseFloat(h.amount)    || 0
    const buyPrice  = parseFloat(h.buy_price) || 0
    const raw       = livePrices?.[h.ticker] ?? livePrices?.[h.ticker?.toUpperCase()] ?? livePrices?.[h.ticker?.toLowerCase()]
    const livePrice = raw !== undefined ? parseFloat(raw) : buyPrice
    const currentValue = amount * livePrice
    const costBasis    = amount * buyPrice
    const profitLoss   = currentValue - costBasis
    const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
    totalPortfolioValue += currentValue
    totalCostBasis      += costBasis
    return { ...h, currentValue, livePrice, profitLoss, profitLossPct, costBasis }
  }).sort((a, b) => b.currentValue - a.currentValue)

  const pieDataWithPct = pieData.map(h => ({
    ...h,
    pct: totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0
  }))

  const totalPnL    = totalPortfolioValue - totalCostBasis
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

  return (
    <>
      <HoldingModal
        isOpen={modalOpen} holding={editingObj}
        marketFolders={marketFolders}
        onClose={() => setModalOpen(false)} onSave={saveHolding}
      />

      {/* Header */}
      <div className="portfolio-header">
        <div>
          <h2 className="port-title">Total Balance</h2>
          <div className="port-balance-row">
            <span className="price-value">{fmt(totalPortfolioValue, currency, thbRate)}</span>
            <span className={`price-delta ${totalPnL >= 0 ? 'up' : 'down'}`}>
              {totalPnL >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalPnL), currency, thbRate)} ({totalPnLPct >= 0 ? '+' : ''}{Math.abs(totalPnLPct).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="port-header-actions">
          <div className="currency-toggle">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
            <button className={currency === 'THB' ? 'active' : ''} onClick={() => setCurrency('THB')}>THB</button>
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => handleOpenModal()}>+ Add Holding</button>
        </div>
      </div>

      {/* Allocation + table */}
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
            <div className="chart-empty">No assets to display.</div>
          )}
        </div>

        {/* ── Holdings Table — now includes Value column ── */}
        <div className="chart-card port-table-container">
          <h3 className="desc-title">Your Assets</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="port-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Shares</th>
                  <th>Avg Cost</th>
                  <th>Live Price</th>
                  {/* FIX: Added Value column */}
                  <th>Value</th>
                  <th>P&amp;L</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pieDataWithPct.map((h, idx) => (
                  <tr key={h.id}>
                    {/* Asset */}
                    <td>
                      <span className="port-ticker-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                      <span className="font-mono font-bold">{h.ticker}</span>
                    </td>

                    {/* Shares */}
                    <td className="num" style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {parseFloat(h.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>

                    {/* Avg Cost */}
                    <td className="num">{fmt(h.buy_price, currency, thbRate)}</td>

                    {/* Live Price */}
                    <td className="num">{fmt(h.livePrice, currency, thbRate)}</td>

                    {/* Value (shares × live price) — NEW */}
                    <td className="num" style={{ fontWeight: 700 }}>
                      {fmt(h.currentValue, currency, thbRate)}
                    </td>

                    {/* P&L */}
                    <td className="num" style={{ color: h.profitLoss >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {h.profitLoss >= 0 ? '+' : '-'}{fmt(Math.abs(h.profitLoss), currency, thbRate)}
                      <span className="pnl-pct"> ({h.profitLossPct >= 0 ? '+' : ''}{h.profitLossPct.toFixed(2)}%)</span>
                    </td>

                    {/* Actions */}
                    <td className="port-actions">
                      <button onClick={() => handleOpenModal(h)}>✎</button>
                      <button onClick={() => handleDelete(h.id, h.ticker)}>✕</button>
                    </td>
                  </tr>
                ))}
                {pieDataWithPct.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                      No holdings yet.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Totals footer row */}
              {pieDataWithPct.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-md)' }}>
                    <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text)' }} colSpan={4}>
                      Total
                    </td>
                    <td className="num" style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                      {fmt(totalPortfolioValue, currency, thbRate)}
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {totalPnL >= 0 ? '+' : '-'}{fmt(Math.abs(totalPnL), currency, thbRate)}
                      <span className="pnl-pct"> ({totalPnLPct >= 0 ? '+' : ''}{Math.abs(totalPnLPct).toFixed(2)}%)</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <GrowthChart costBasis={totalCostBasis} currentValue={totalPortfolioValue} defaultCurrency={currency} thbRate={thbRate} />
      <DividendChart holdings={holdings} defaultCurrency={currency} thbRate={thbRate} />
    </>
  )
}
