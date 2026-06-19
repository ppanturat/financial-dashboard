/**
 * FearGreedBanner.jsx
 * Clean semicircle gauge. Big number dominates. No VOO price.
 * Collapsible. NaN-safe.
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function scoreToZone(score) {
  if (score >= 80) return { label: 'Extreme Greed', short: 'Extreme Greed', color: '#dc2626', bg: '#fef2f2' }
  if (score >= 60) return { label: 'Greed',          short: 'Greed',         color: '#ea580c', bg: '#fff7ed' }
  if (score >= 40) return { label: 'Neutral',         short: 'Neutral',       color: '#ca8a04', bg: '#fefce8' }
  if (score >= 20) return { label: 'Fear',             short: 'Fear',          color: '#3b82f6', bg: '#eff6ff' }
  return                  { label: 'Extreme Fear',    short: 'Extreme Fear',  color: '#1d4ed8', bg: '#eef2ff' }
}

// ── Clean SVG semicircle gauge ────────────────────────────────────────────────
function Gauge({ score, loading }) {
  const safe  = loading ? 0 : (Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50)
  const zone  = scoreToZone(safe)
  // angle: score 0→100 maps to -180°→0° (left to right)
  const angle = -180 + (safe / 100) * 180

  const cx = 110, cy = 95, r = 70
  const segments = [
    { color: '#1e40af', from: 180, to: 144 }, // extreme fear
    { color: '#3b82f6', from: 144, to: 108 }, // fear
    { color: '#ca8a04', from: 108, to: 72  }, // neutral
    { color: '#ea580c', from: 72,  to: 36  }, // greed
    { color: '#dc2626', from: 36,  to: 0   }, // extreme greed
  ]

  const seg = (f, t, R = 70, r2 = 52) => {
    const toR = d => d * Math.PI / 180
    const x1 = cx + R  * Math.cos(toR(f)), y1 = cy + R  * Math.sin(toR(f))
    const x2 = cx + R  * Math.cos(toR(t)), y2 = cy + R  * Math.sin(toR(t))
    const x3 = cx + r2 * Math.cos(toR(t)), y3 = cy + r2 * Math.sin(toR(t))
    const x4 = cx + r2 * Math.cos(toR(f)), y4 = cy + r2 * Math.sin(toR(f))
    return `M${x1} ${y1} A${R} ${R} 0 0 0 ${x2} ${y2} L${x3} ${y3} A${r2} ${r2} 0 0 1 ${x4} ${y4}Z`
  }

  return (
    <svg viewBox="30 20 160 90" width="200" height="113" style={{ display: 'block' }}>
      {/* Arc segments */}
      {segments.map((s, i) => (
        <path key={i} d={seg(s.from, s.to)} fill={s.color} opacity={loading ? 0.2 : 1} />
      ))}
      {/* Dividers */}
      {[144,108,72,36].map(deg => {
        const rad = deg * Math.PI / 180
        return <line key={deg}
          x1={cx + 50*Math.cos(rad)} y1={cy + 50*Math.sin(rad)}
          x2={cx + 72*Math.cos(rad)} y2={cy + 72*Math.sin(rad)}
          stroke="var(--bg,#f5f4f1)" strokeWidth="2.5" />
      })}
      {/* Needle */}
      <g style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `rotate(${angle}deg)`,
        transition: loading ? 'none' : 'transform 1.1s cubic-bezier(.34,1.56,.64,1)',
        opacity: loading ? 0.3 : 1,
      }}>
        <line x1={cx - 10} y1={cy} x2={cx + 65} y2={cy}
          stroke={zone.color} strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Pivot */}
      <circle cx={cx} cy={cy} r="5" fill={loading ? '#ccc' : zone.color} />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--bg,#f5f4f1)" />
      {/* Zone labels */}
      <text x="38"  y={cy+5} fontSize="7.5" fill="#1e40af" fontWeight="700" textAnchor="middle" opacity="0.8">FEAR</text>
      <text x="182" y={cy+5} fontSize="7.5" fill="#dc2626" fontWeight="700" textAnchor="middle" opacity="0.8">GREED</text>
    </svg>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 1,
      padding: '5px 10px', borderRadius: 7,
      background: 'rgba(0,0,0,0.035)', border: '1px solid rgba(0,0,0,0.07)',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function FearGreedBanner() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    api.macro(ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => ctrl.abort()
  }, [])

  const score = Number.isFinite(data?.fear_greed_score) ? data.fear_greed_score : (loading ? 0 : 50)
  const zone  = scoreToZone(score)
  const dev   = Number.isFinite(data?.dma_deviation) ? `${data.dma_deviation >= 0 ? '+' : ''}${(data.dma_deviation * 100).toFixed(1)}%` : '—'
  const rsi   = Number.isFinite(data?.rsi14) ? data.rsi14.toFixed(1) : '—'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-md)',
      borderTop: `3px solid ${loading ? '#e5e7eb' : zone.color}`,
      borderRadius: 'var(--r)',
      marginBottom: 20,
      overflow: 'hidden',
      transition: 'border-top-color 0.5s',
    }}>
      {/* Collapsible header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Market Sentiment</span>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: zone.color,
              background: zone.color + '16', border: `1px solid ${zone.color}30`,
              borderRadius: 20, padding: '2px 10px',
            }}>{zone.short} · {score}</span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          display: 'inline-block',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: '0 20px 18px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {/* Left: gauge + big number */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <Gauge score={score} loading={loading} />
            {/* Big score number */}
            <div style={{
              marginTop: -8,
              fontFamily: "'DM Mono',monospace",
              fontSize: 40,
              fontWeight: 800,
              color: loading ? '#d1d5db' : zone.color,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              {loading ? '—' : score}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: loading ? '#d1d5db' : zone.color,
              marginTop: 4,
            }}>
              {loading ? '…' : zone.label}
            </div>
          </div>

          {/* Right: contributing factors + description */}
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contributing Factors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Pill label="200-DMA Trend"  value={dev}  color={loading ? '#ccc' : zone.color} />
              <Pill label="RSI 14-Day"     value={rsi} />
              <Pill label="Momentum"       value={score >= 50 ? 'Bullish' : 'Bearish'} color={score >= 50 ? '#16a34a' : '#dc2626'} />
              <Pill label="Sentiment Zone" value={zone.short} color={zone.color} />
            </div>
            {!loading && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.65 }}>
                {score >= 80
                  ? 'Markets are in extreme greed territory. Historically, this signals elevated risk of near-term correction. Tighten position sizing and avoid chasing momentum.'
                  : score >= 60
                  ? 'Investor sentiment has tilted greedy. Remain selective on new entries and prioritise quality over momentum.'
                  : score >= 40
                  ? 'Markets are in a balanced regime. Fundamentals should drive positioning over sentiment alone.'
                  : score >= 20
                  ? 'Fear is elevated, historically creating mispricing in quality assets. Disciplined accumulation may be warranted.'
                  : 'Extreme fear dominates. This environment has historically preceded meaningful recoveries in high-quality equities.'}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 10, color: 'var(--faint)' }}>
              Derived from VOO 200-DMA deviation & 14-day RSI · Not financial advice
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
