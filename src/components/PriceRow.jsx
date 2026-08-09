import { useState, useEffect } from 'react'
import { TIMEFRAMES } from '../lib/constants'
import { getStockSegments, getSegmentStyle, fetchFallbackSegment } from '../lib/stockSegments'
import { api } from '../lib/api'

export function PriceRow({ ticker, isEtf, currentPrice, priceChange, timeframe, onTimeframeChange }) {
  const baseSegments = getStockSegments(ticker, isEtf)
  const [fallback, setFallback] = useState(null) // { ticker, tags } once the async lookup resolves

  useEffect(() => {
    let cancelled = false
    fetchFallbackSegment(ticker, isEtf, api).then(tags => {
      if (!cancelled && tags?.length) setFallback({ ticker, tags })
    })
    return () => { cancelled = true }
  }, [ticker, isEtf])

  const segments = fallback?.ticker === ticker ? fallback.tags : baseSegments

  return (
    <div className="price-row">
      <div className="price-left">
        <span className="price-ticker">{ticker}</span>

        {/* Colored segment badges */}
        {segments.map(segment => {
          const style = getSegmentStyle(segment)
          return (
            <span
              key={segment}
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: style.text,
                background: style.bg,
                border: `1px solid ${style.border}`,
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {segment}
            </span>
          )
        })}

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
