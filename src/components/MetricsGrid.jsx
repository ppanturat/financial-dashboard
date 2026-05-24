import { useState } from 'react'
import { METRIC_DEFS } from '../lib/constants'
import { fmt, getMetricColor } from '../lib/formatters'

function MetricCard({ def, value, isEtf, loading, tooltipOpen, onToggleTip }) {
  const color = isEtf ? '' : getMetricColor(value, def.colorType)
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-top">
        <span className="metric-label">{def.label}</span>
        <button
          className="metric-info-btn"
          onClick={e => { e.stopPropagation(); onToggleTip(def.key) }}
        >?</button>
        {tooltipOpen === def.key && (
          <div className="metric-tooltip">
            <p className="tt-meaning">{def.meaning}</p>
            <p className="tt-scale">{def.scale}</p>
          </div>
        )}
      </div>
      <div className="metric-value">
        {loading
          ? <span className="skeleton-val">—</span>
          : isEtf
            ? <span className="skeleton-val">N/A</span>
            : fmt(value, def.type)
        }
      </div>
    </div>
  )
}

export function MetricsGrid({ metrics, isEtf, loading }) {
  const [tooltipOpen, setTooltipOpen] = useState(null)
  const toggleTip = (key) => setTooltipOpen(p => p === key ? null : key)

  return (
    <>
      <div className="section-header">
        <span className="section-title">Key Metrics</span>
        {isEtf && <span className="etf-notice">ETF — Individual financial metrics not applicable</span>}
      </div>
      <div className="metrics-grid">
        {METRIC_DEFS.map(def => (
          <MetricCard
            key={def.key}
            def={def}
            value={metrics?.[def.key]}
            isEtf={isEtf}
            loading={loading}
            tooltipOpen={tooltipOpen}
            onToggleTip={toggleTip}
          />
        ))}
      </div>
    </>
  )
}
