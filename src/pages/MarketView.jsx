import { useState } from 'react'
import { useStockData } from '../hooks/useStockData'
import { PriceRow } from '../components/PriceRow'
import { StockChart } from '../components/StockChart'
import { MetricsGrid } from '../components/MetricsGrid'
import { MetricsSummaryCard } from '../components/MetricsSummaryCard'
import { RuleBasedAssessmentCard } from '../components/RuleBasedAssessmentCard'
import { EmptyState } from '../components/EmptyState'
import { StockNewsFeed } from '../components/StockNewsFeed'
import { ValuationBadge } from '../components/ValuationBadge'
import { AdoptionCheckCard, TerminalRedFlagCard } from '../components/AdoptionRedFlagCards'
import { runAdoptionCheck, runTerminalRedFlagSweep } from '../lib/assessmentEngine'

// FearGreedBanner removed from here — it's a market-level indicator
// and now lives exclusively in the GlobalIntelligence (News Feed) tab.

export function MarketView({ activeTicker, foldersLoading }) {
  const [timeframe, setTimeframe] = useState('1M')
  const [profileOpen, setProfileOpen] = useState(false)
  const stock = useStockData(activeTicker, timeframe)
  const isEtf = stock.quoteType === 'ETF'
  const adoptionResult = stock.metrics ? runAdoptionCheck(stock.metrics) : null
  const redFlagResult  = stock.metrics ? runTerminalRedFlagSweep(stock.metrics) : null

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
      <StockChart
        chartData={stock.chartData}
        graphColor={stock.graphColor}
        timeframe={timeframe}
        loading={stock.loadingData}
      />

      {/* Company Profile — collapsible */}
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
            <h3 className="desc-title" style={{ margin: 0, fontFamily: 'Syne, Arial' }}>
              Company Profile
            </h3>
            <span style={{
              fontSize: 12, color: 'var(--faint)',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .2s', display: 'inline-block',
              lineHeight: 1, paddingLeft: 8,
            }}>▼</span>
          </button>
          <p className="desc-text" style={{
            marginTop: 10, marginBottom: 0,
            color: profileOpen ? 'inherit' : 'var(--muted)',
            display: profileOpen ? 'block' : '-webkit-box',
            WebkitLineClamp: profileOpen ? undefined : 2,
            WebkitBoxOrient: profileOpen ? undefined : 'vertical',
            overflow: profileOpen ? 'visible' : 'hidden',
          }}>
            {stock.description}
          </p>
        </div>
      )}

      <MetricsGrid metrics={stock.metrics} isEtf={isEtf} loading={stock.loadingData} />
      <MetricsSummaryCard metrics={stock.metrics} ticker={activeTicker} isEtf={isEtf} loading={stock.loadingData} />

      {/* Relative Valuation replaces Fear & Greed here */}
      {!isEtf && <ValuationBadge metrics={stock.metrics} />}

      <AdoptionCheckCard result={adoptionResult} />
      <TerminalRedFlagCard result={redFlagResult} />
      <RuleBasedAssessmentCard
        ticker={activeTicker}
        metrics={stock.metrics}
        isEtf={isEtf}
        etfHoldings={stock.etfHoldings}
        loading={stock.loadingData}
      />
      <StockNewsFeed ticker={activeTicker} />
    </>
  )
}
