import { TIMEFRAMES } from '../lib/constants'

export function PriceRow({ ticker, isEtf, currentPrice, priceChange, timeframe, onTimeframeChange }) {
  return (
    <div className="price-row">
      <div className="price-left">
        <span className="price-ticker">{ticker}</span>
        {isEtf && <span className="etf-badge">ETF</span>}
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
