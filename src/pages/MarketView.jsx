import { useState } from 'react'
import { useStockData } from '../hooks/useStockData'
import { PriceRow } from '../components/PriceRow'
import { StockChart } from '../components/StockChart'
import { MetricsGrid } from '../components/MetricsGrid'
import { MetricsSummaryCard } from '../components/MetricsSummaryCard'
import { RuleBasedAssessmentCard } from '../components/RuleBasedAssessmentCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorBoundary } from '../components/ErrorBoundary' // Make sure this is imported

export function MarketView({ activeTicker, foldersLoading }) {
  const [timeframe, setTimeframe] = useState('1M')
  const [profileOpen, setProfileOpen] = useState(false)
  const stock = useStockData(activeTicker, timeframe)

  // Guard 1: Prevent crash if there is no active ticker
  if (!activeTicker) return <EmptyState loading={foldersLoading} />

  // Guard 2: Prevent the blank screen crash by waiting for stock data to initialize
  if (!stock || stock.loadingData || stock.quoteType === undefined) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading market data...
      </div>
    )
  }

  // Safe to evaluate now
  const isEtf = stock.quoteType === 'ETF'

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
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textAlign: 'left',
            }}
          >
            {/* UI Update: Syne Font applied here */}
            <h3 className="desc-title" style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              Company Profile
            </h3>
            <span style={{
              fontSize: 12, color: 'var(--faint)',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .2s', display: 'inline-block',
              lineHeight: 1, paddingLeft: 8,
            }}>▼</span>
          </button>

          {!profileOpen && (
            <p className="desc-text" style={{ marginTop: 10, marginBottom: 0, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {stock.description}
            </p>
          )}

          {profileOpen && (
            <p className="desc-text" style={{ marginTop: 10, marginBottom: 0 }}>
              {stock.description}
            </p>
          )}
        </div>
      )}

      {/* Blast shields added to prevent isolated data errors from crashing the page */}
      <ErrorBoundary>
        <MetricsGrid metrics={stock.metrics} isEtf={isEtf} loading={stock.loadingData} />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <MetricsSummaryCard metrics={stock.metrics} ticker={activeTicker} isEtf={isEtf} loading={stock.loadingData} />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <RuleBasedAssessmentCard ticker={activeTicker} metrics={stock.metrics} isEtf={isEtf} etfHoldings={stock.etfHoldings} loading={stock.loadingData} />
      </ErrorBoundary>
    </>
  )
}