import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts'
import { HoldingModal } from '../components/HoldingModal'
import { EmptyState } from '../components/EmptyState'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#0d9488'];

export function PortfolioView({ 
  activePortfolioId, holdings, livePrices, loadingHoldings, 
  marketFolders, saveHolding, removeHolding, openConfirmModal 
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObj, setEditingObj] = useState(null)

  const handleOpenModal = (holding = null) => {
    setEditingObj(holding)
    setModalOpen(true)
  }

  const handleDelete = (id, ticker) => {
    openConfirmModal('Delete Holding', `Are you sure you want to remove ${ticker} from this folder?`, () => removeHolding(id))
  }

  if (!activePortfolioId) {
    return <EmptyState loading={loadingHoldings} />
  }

  if (loadingHoldings) return <div className="chart-empty">Loading portfolio data...</div>

  // calc totals for pie chart
  let totalPortfolioValue = 0
  let totalCostBasis = 0

  const pieData = holdings.map(h => {
    const livePrice = livePrices[h.ticker] || h.buy_price
    const currentValue = h.amount * livePrice
    const costBasis = h.amount * h.buy_price
    
    totalPortfolioValue += currentValue
    totalCostBasis += costBasis

    return {
      ...h,
      currentValue,
      livePrice,
      profitLoss: currentValue - costBasis,
      profitLossPct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
    }
  }).sort((a, b) => b.currentValue - a.currentValue)

  const totalPnL = totalPortfolioValue - totalCostBasis
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

  return (
    <>
      <HoldingModal 
        isOpen={modalOpen} 
        holding={editingObj} 
        marketFolders={marketFolders}
        onClose={() => setModalOpen(false)} 
        onSave={saveHolding} 
      />

      <div className="portfolio-header">
        <div>
          <h2 className="port-title">Total Balance</h2>
          <span className="price-value">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`price-delta ${totalPnL >= 0 ? 'up' : 'down'}`}>
            {totalPnL >= 0 ? '▲' : '▼'} ${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({Math.abs(totalPnLPct).toFixed(2)}%)
          </span>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => handleOpenModal()}>+ Add Holding</button>
      </div>

      <div className="portfolio-grid">
        {/* pie chart */}
        <div className="chart-card port-chart">
          <h3 className="desc-title">Asset Allocation</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="currentValue" nameKey="ticker" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <ChartTooltip formatter={(value) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
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
                <th>Amount</th>
                <th>Avg Cost</th>
                <th>Live Price</th>
                <th>P&L</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieData.map(h => (
                <tr key={h.id}>
                  <td className="font-mono font-bold">{h.ticker}</td>
                  <td>{h.amount}</td>
                  <td>${h.buy_price.toFixed(2)}</td>
                  <td>${h.livePrice.toFixed(2)}</td>
                  <td className={h.profitLoss >= 0 ? 'text-green' : 'text-red'}>
                    {h.profitLoss >= 0 ? '+' : '-'}${Math.abs(h.profitLoss).toFixed(2)}
                  </td>
                  <td className="port-actions">
                    <button onClick={() => handleOpenModal(h)}>✎</button>
                    <button onClick={() => handleDelete(h.id, h.ticker)}>✕</button>
                  </td>
                </tr>
              ))}
              {pieData.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No holdings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}