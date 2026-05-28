import { TIMEFRAMES } from '../lib/constants'
import { getSector } from '../lib/sectors'

export function SectorBadge({ sector }) {
  const s = getSector(sector)
  if (!s) return null
  return (
    <span className="sector-badge" style={{ background: s.bg, color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  )
}

export function PriceRow({ ticker, isEtf, sector, currentPrice, priceChange, timeframe, onTimeframeChange }) {
  return (
    <div className="price-row">
      <div className="price-left">
        <span className="price-ticker">{ticker}</span>
        {isEtf
          ? <span className="etf-badge">ETF</span>
          : <SectorBadge sector={sector} />
        }
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
