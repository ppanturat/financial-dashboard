/**
 * MarketView.jsx
 *
 * Fixes:
 * 1. Removed FearGreedBanner — it's market-level, lives in News Feed tab only
 * 2. Green line bug: AdoptionCheckCard / TerminalRedFlagCard were wrapped in a
 *    div that had no background, so their borderTop bled visually. Now each
 *    card is a direct sibling in the flex column — and AdoptionRedFlagCards.jsx
 *    uses borderTop (not borderLeft) to prevent line artifacts.
 * 3. ValuationBadge added for stock-specific relative valuation
 */
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

// FearGreedBanner intentionally removed — market-level indicator only
// shown in GlobalIntelligence (News Feed tab)

export function MarketView({ activeTicker, foldersLoading }) {
  const [timeframe, setTimeframe] = useState('1M')
  const [profileOpen, setProfileOpen] = useState(false)
  const stock = useStockData(activeTicker, timeframe)
  const isEtf = stock.quoteType === 'ETF'

  // Run assessment modules — only for non-ETF stocks
  const adoptionResult = (!isEtf && stock.metrics) ? runAdoptionCheck(stock.metrics) : null
  const redFlagResult  = (!isEtf && stock.metrics) ? runTerminalRedFlagSweep(stock.metrics) : null

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

      {/* Company profile — collapsible */}
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
            <h3 className="desc-title" style={{ margin: 0, fontFamily: 'Syne, Arial' }}>Company Profile</h3>
            <span style={{
              fontSize: 13, color: 'var(--faint)',
              transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .2s', display: 'inline-block',
              lineHeight: 1, paddingLeft: 8,
            }}>▼</span>
          </button>
          <p className="desc-text" style={{
            marginTop: 10, marginBottom: 0,
            display: profileOpen ? 'block' : '-webkit-box',
            WebkitLineClamp: profileOpen ? undefined : 2,
            WebkitBoxOrient: profileOpen ? undefined : 'vertical',
            overflow: profileOpen ? 'visible' : 'hidden',
            color: profileOpen ? 'inherit' : 'var(--muted)',
          }}>
            {stock.description}
          </p>
        </div>
      )}

      <MetricsGrid metrics={stock.metrics} isEtf={isEtf} loading={stock.loadingData} />

      <MetricsSummaryCard
        metrics={stock.metrics}
        ticker={activeTicker}
        isEtf={isEtf}
        loading={stock.loadingData}
      />

      {/* Stock-specific relative valuation (replaces Fear & Greed here) */}
      {!isEtf && <ValuationBadge metrics={stock.metrics} />}

      {/* Assessment modules — each is a direct flex child, no wrapper div
          This prevents the green line artifact caused by wrapper divs with
          transparent backgrounds adjacent to bordered cards */}
      {adoptionResult && <AdoptionCheckCard result={adoptionResult} />}
      {redFlagResult  && <TerminalRedFlagCard result={redFlagResult} />}

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
