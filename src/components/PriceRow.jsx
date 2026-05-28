import { TIMEFRAMES } from '../lib/constants'
import { getStockSegments, SEGMENT_COLORS } from '../lib/stockSegments'

export function PriceRow({ ticker, isEtf, currentPrice, priceChange, timeframe, onTimeframeChange }) {
  const segments = getStockSegments(ticker, isEtf)
  return (
    <div className="price-row">
      <div className="price-left">
        <span className="price-ticker">{ticker}</span>
        {segments.map(segment => (
          <span
            key={segment}
            className="segment-badge"
            style={{ backgroundColor: SEGMENT_COLORS[segment] + '22', color: SEGMENT_COLORS[segment] }}
          >
            {segment}
          </span>
        ))}
        {currentPrice != null ? (
          <span className="price-value">
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="price-value price-skeleton">——</span>
        )}
        {priceChange !== null && (
          <span className={`price-delta ${priceChange >= 0 ? 'up' : 'down'}`}>
            {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="tf-group">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
            onClick={() => onTimeframeChange(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  )
}
