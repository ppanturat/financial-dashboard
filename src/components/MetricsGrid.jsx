import { useState, useEffect, useRef } from 'react'
import { METRIC_DEFS } from '../lib/constants'
import { fmt, getMetricColor } from '../lib/formatters'

// scale bar for tooltip
function ScaleBar({ scale }) {
  if (!scale) return null
  // parse the scale string into segments
  const segments = scale.split('·').map(s => s.trim()).filter(Boolean)
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        Scale
      </div>
      {segments.map((seg, i) => (
        <div key={i} style={{
          fontSize: 12, color: 'rgba(255,255,255,0.65)',
          fontFamily: "var(--font-body),monospace",
          lineHeight: 1.5, marginBottom: 2,
          paddingLeft: 8, borderLeft: `2px solid rgba(255,255,255,${0.1 + (i / segments.length) * 0.3})`,
        }}>
          {seg}
        </div>
      ))}
    </div>
  )
}

// single metric card
function MetricCard({ def, value, isEtf, loading, tooltipOpen, onToggleTip, cardRef }) {
  const color = isEtf ? '' : getMetricColor(value, def.colorType)

  return (
    <div
      ref={cardRef}
      className={`metric-card ${color}`}
      style={{ position: 'relative' }}
    >
      {/* Label row */}
      <div className="metric-top">
        <span className="metric-label" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
          {def.label}
        </span>

        {/* Info button — 24×24 touch target */}
        {!isEtf && (
          <button
            className="metric-info-btn"
            onClick={e => { e.stopPropagation(); onToggleTip(def.key) }}
            aria-label={`Info about ${def.label}`}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: tooltipOpen === def.key ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.12)',
              fontSize: 11, fontWeight: 700, color: tooltipOpen === def.key ? 'var(--text)' : 'var(--faint)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: 'serif',
              transition: 'background .12s, color .12s',
            }}
          >i</button>
        )}
      </div>

      {/* Value */}
      <div className="metric-value" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4 }}>
        {loading
          ? <span className="skeleton-val">—</span>
          : isEtf
            ? <span className="skeleton-val" style={{ fontSize: 14 }}>N/A</span>
            : fmt(value, def.type)
        }
      </div>

      {/* Tooltip */}
      {tooltipOpen === def.key && (
        <div
          className="metric-tooltip"
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111',
            color: '#fff',
            borderRadius: 10,
            padding: '14px 16px',
            width: 260,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 10, background: '#111',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          }} />

          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {def.label}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
            {def.meaning}
          </p>
          <ScaleBar scale={def.scale} />
        </div>
      )}
    </div>
  )
}

// main
export function MetricsGrid({ metrics, isEtf, loading }) {
  const [tooltipOpen, setTooltipOpen] = useState(null)
  const [category, setCategory]       = useState('Key')
  const gridRef = useRef(null)

  // close tooltip on outside click
  useEffect(() => {
    if (!tooltipOpen) return
    const fn = e => {
      if (gridRef.current && !gridRef.current.contains(e.target)) {
        setTooltipOpen(null)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [tooltipOpen])

  const toggleTip = key => setTooltipOpen(p => p === key ? null : key)

  const categories = ['Key', ...new Set(METRIC_DEFS.map(d => d.category))]
  const visibleDefs = category === 'Key' ? METRIC_DEFS.filter(d => d.primary) : METRIC_DEFS.filter(d => d.category === category)

  return (
    <>
      <div className="section-header">
        <span className="section-title" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>
          Key Metrics
        </span>
        {isEtf && (
          <span className="etf-notice" style={{ fontSize: 13 }}>
            ETF — Individual financial metrics not applicable
          </span>
        )}
        {!isEtf && (
          <span style={{ fontSize: 12, color: 'var(--faint)', fontStyle: 'italic' }}>
            Click <strong style={{ fontFamily: 'serif', fontStyle: 'normal' }}>i</strong> on any metric for explanation &amp; scale
          </span>
        )}
      </div>

      {!isEtf && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '7px 16px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${category === cat ? 'transparent' : 'var(--border-md)'}`,
                background: category === cat ? 'var(--accent)' : 'var(--surface-2)',
                color: category === cat ? '#fff' : 'var(--text)',
                fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif",
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div
        ref={gridRef}
        className="metrics-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}
      >
        {visibleDefs.map(def => (
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
