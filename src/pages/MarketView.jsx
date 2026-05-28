import { useState } from 'react'
import { useStockData } from '../hooks/useStockData'
import { PriceRow } from '../components/PriceRow'
import { StockChart } from '../components/StockChart'
import { MetricsGrid } from '../components/MetricsGrid'
import { MetricsSummaryCard } from '../components/MetricsSummaryCard'
import { EmptyState } from '../components/EmptyState'

export function MarketView({ activeTicker, foldersLoading }) {
  const [timeframe, setTimeframe] = useState('1M')
  const stock = useStockData(activeTicker, timeframe)
  const isEtf = stock.quoteType === 'ETF'

  if (!activeTicker) return <EmptyState loading={foldersLoading} />

  return (
    <>
      <PriceRow
        ticker={activeTicker}
        isEtf={isEtf}
        sector={stock.sector}
        currentPrice={stock.currentPrice}
        priceChange={stock.priceChange}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />
      <StockChart chartData={stock.chartData} graphColor={stock.graphColor} timeframe={timeframe} loading={stock.loadingData} />
      {stock.description && (
        <div className="desc-card">
          <h3 className="desc-title">Company Profile</h3>
          <p className="desc-text">{stock.description}</p>
        </div>
      )}
      <MetricsGrid metrics={stock.metrics} isEtf={isEtf} loading={stock.loadingData} />
      <MetricsSummaryCard metrics={stock.metrics} ticker={activeTicker} isEtf={isEtf} loading={stock.loadingData} />
    </>
  )
}
