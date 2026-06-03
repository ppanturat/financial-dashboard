import { useState } from 'react'
import { useStockData } from '../hooks/useStockData'
import { PriceRow } from '../components/PriceRow'
import { StockChart } from '../components/StockChart'
import { MetricsGrid } from '../components/MetricsGrid'
import { MetricsSummaryCard } from '../components/MetricsSummaryCard'
import { RuleBasedAssessmentCard } from '../components/RuleBasedAssessmentCard'
import { EmptyState } from '../components/EmptyState'

export function MarketView({ activeTicker, foldersLoading }) {
  const [timeframe, setTimeframe] = useState('1M')
  const [profileOpen, setProfileOpen] = useState(false)
  const stock = useStockData(activeTicker, timeframe)
  const isEtf = stock.quoteType === 'ETF'

  if (!activeTicker) return <EmptyState loading={foldersLoading} />

  return (
    <>
      <PriceRow
        ticker={activeTicker}
        isEtf={isEtf}
        currentPrice={stock.currentPrice}
        priceChange={stock.priceChange}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />
      <StockChart chartData={stock.chartData} graphColor={stock.graphColor} timeframe={timeframe} loading={stock.loadingData} />

      {stock.description && (
        <div className="desc-card">
          {/* Collapsible header */}
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textAlign: 'left',
            }}
          >
            <h3 className="desc-title" style={{ margin: 0, fontFamily: "Syne, Arial" }}>Company Profile</h3>
            <span style={{
              fontSize: 12, color: 'var(--faint)',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .2s', display: 'inline-block',
              lineHeight: 1, paddingLeft: 8,
            }}>▼</span>
          </button>

          {/* Collapsed preview — first sentence */}
          {!profileOpen && (
            <p className="desc-text" style={{ marginTop: 10, marginBottom: 0, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {stock.description}
            </p>
          )}

          {/* Full text when open */}
          {profileOpen && (
            <p className="desc-text" style={{ marginTop: 10, marginBottom: 0 }}>
              {stock.description}
            </p>
          )}
        </div>
      )}

      <MetricsGrid metrics={stock.metrics} isEtf={isEtf} loading={stock.loadingData} />
      <MetricsSummaryCard metrics={stock.metrics} ticker={activeTicker} isEtf={isEtf} loading={stock.loadingData} />
      <RuleBasedAssessmentCard ticker={activeTicker} metrics={stock.metrics} isEtf={isEtf} etfHoldings={stock.etfHoldings} loading={stock.loadingData} />
    </>
  )
}
