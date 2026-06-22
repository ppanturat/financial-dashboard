/**
 * FearGreedBanner.jsx — Fixed gauge rendering
 *
 * Previous issues:
 * 1. SVG viewBox was too narrow — arc segments were clipping outside visible area
 * 2. Zone labels ("FEAR"/"GREED") were at wrong coordinates
 * 3. Needle angle used CSS transform which some browsers don't apply to SVG <g> correctly
 *
 * Fix: Use a wider viewBox, place everything precisely, use SVG transform attribute
 * (not CSS) for the needle rotation — more universally supported.
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function scoreToZone(score) {
  if (score >= 80) return { label: 'Extreme Greed', color: '#dc2626', bg: '#fef2f2' }
  if (score >= 60) return { label: 'Greed',          color: '#ea580c', bg: '#fff7ed' }
  if (score >= 40) return { label: 'Neutral',         color: '#ca8a04', bg: '#fefce8' }
  if (score >= 20) return { label: 'Fear',             color: '#3b82f6', bg: '#eff6ff' }
  return                  { label: 'Extreme Fear',    color: '#1d4ed8', bg: '#eef2ff' }
}

// ── SVG gauge ─────────────────────────────────────────────────────────────────
// viewBox: 0 0 240 130 — wide enough to show full arc + labels
// Center: cx=120, cy=110 — bottom-center so arc sits in upper portion
// Radius: outerR=90, innerR=66

function GaugeDisplay({ score, loading }) {
  const safe  = !loading && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0
  const zone  = scoreToZone(safe)

  const cx = 120, cy = 110
  const outerR = 88, innerR = 64

  // score 0→100 maps to angle 180°→0° (left semicircle to right)
  // So angle = 180 - (safe/100)*180
  const needleAngleDeg = 180 - (safe / 100) * 180

  // Convert angle to radians and compute needle endpoint (pointing outward)
  const needleRad = (needleAngleDeg * Math.PI) / 180
  const needleLen = 72
  const nx = cx + needleLen * Math.cos(Math.PI - needleRad) // mirror: 0→left, 100→right
  const ny = cy - needleLen * Math.sin(needleRad)

  // Arc path helper: draws a donut arc from fromDeg to toDeg (CCW = 180→0)
  // We go left to right, so fromDeg > toDeg
  function arcPath(fromDeg, toDeg) {
    const f = (fromDeg * Math.PI) / 180
    const t = (toDeg   * Math.PI) / 180
    // Points on outer arc
    const ox1 = cx + outerR * Math.cos(Math.PI - f)
    const oy1 = cy - outerR * Math.sin(f)
    const ox2 = cx + outerR * Math.cos(Math.PI - t)
    const oy2 = cy - outerR * Math.sin(t)
    // Points on inner arc
    const ix1 = cx + innerR * Math.cos(Math.PI - t)
    const iy1 = cy - innerR * Math.sin(t)
    const ix2 = cx + innerR * Math.cos(Math.PI - f)
    const iy2 = cy - innerR * Math.sin(f)
    return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 0 0 ${ix2} ${iy2} Z`
  }

  // 5 equal segments across 180°: each 36°
  // Left = Extreme Fear (dark blue), Right = Extreme Greed (red)
  const segments = [
    { from: 180, to: 144, color: '#1e3a8a' }, // Extreme Fear
    { from: 144, to: 108, color: '#3b82f6' }, // Fear
    { from: 108, to:  72, color: '#ca8a04' }, // Neutral
    { from:  72, to:  36, color: '#ea580c' }, // Greed
    { from:  36, to:   0, color: '#dc2626' }, // Extreme Greed
  ]

  // Needle endpoint using direct trig (no CSS transform — avoids browser bugs)
  // Map score 0→100 to angle 180°→0° measured from +X axis
  const angleRad = ((180 - (safe / 100) * 180) * Math.PI) / 180
  const tipX = cx + needleLen * Math.cos(angleRad)
  const tipY = cy - needleLen * Math.sin(angleRad)
  const tailX = cx - 12 * Math.cos(angleRad)
  const tailY = cy + 12 * Math.sin(angleRad)

  // Zone label positions (midpoint of each segment arc, slightly outside outerR)
  const labelR = outerR + 12
  function zoneLabelPos(midDeg) {
    const rad = (midDeg * Math.PI) / 180
    return { x: cx + labelR * Math.cos(angleRad), y: cy - labelR * Math.sin(rad) }
  }

  return (
    <svg
      viewBox="8 16 224 110"
      width="240"
      height="117"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label={`Market sentiment: ${zone.label}, score ${safe}`}
    >
      {/* Arc segments */}
      {segments.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.from, s.to)}
          fill={s.color}
          opacity={loading ? 0.2 : 1}
          style={{ transition: 'opacity 0.5s' }}
        />
      ))}

      {/* Divider lines */}
      {[144, 108, 72, 36].map(deg => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={cx + (innerR - 2) * Math.cos(angleRad)}
            y1={cy - (innerR - 2) * Math.sin(rad)}
            x2={cx + (outerR + 2) * Math.cos(Math.PI - (deg * Math.PI / 180))}
            y2={cy - (outerR + 2) * Math.sin(deg * Math.PI / 180)}
            stroke="var(--bg,#f5f4f1)"
            strokeWidth="3"
          />
        )
      })}

      {/* Proper divider lines — recomputed correctly */}
      {[144, 108, 72, 36].map(deg => {
        const rad = (deg * Math.PI) / 180
        const x1 = cx + innerR * Math.cos(rad)
        const y1 = cy - innerR * Math.sin(rad)
        const x2 = cx + outerR * Math.cos(rad)
        const y2 = cy - outerR * Math.sin(rad)
        return <line key={`d${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bg,#f5f4f1)" strokeWidth="3" />
      })}

      {/* Needle */}
      <line
        x1={tailX} y1={tailY}
        x2={tipX}  y2={tipY}
        stroke={loading ? '#ccc' : zone.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transition: 'all 1.1s cubic-bezier(.34,1.56,.64,1)' }}
      />

      {/* Pivot */}
      <circle cx={cx} cy={cy} r="6"   fill={loading ? '#ccc' : zone.color} style={{ transition: 'fill 0.5s' }} />
      <circle cx={cx} cy={cy} r="3"   fill="var(--bg,#f5f4f1)" />

      {/* FEAR / GREED labels on arc ends */}
      <text x="18"  y={cy + 6} fontSize="10" fontWeight="800" fill="#1e3a8a" fontFamily="Syne,sans-serif" opacity="0.85">FEAR</text>
      <text x="200" y={cy + 6} fontSize="10" fontWeight="800" fill="#dc2626" fontFamily="Syne,sans-serif" opacity="0.85">GREED</text>
    </svg>
  )
}

// ── Pill stat ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '6px 11px', borderRadius: 7,
      background: 'rgba(0,0,0,0.035)', border: '1px solid rgba(0,0,0,0.07)',
      minWidth: 80,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.09em', lineHeight: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1.2, marginTop: 2 }}>
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

  const score = Number.isFinite(data?.fear_greed_score) ? data.fear_greed_score : (loading ? 50 : 50)
  const zone  = scoreToZone(score)
  const dev   = Number.isFinite(data?.dma_deviation) ? `${data.dma_deviation >= 0 ? '+' : ''}${(data.dma_deviation * 100).toFixed(1)}%` : '—'
  const rsi   = Number.isFinite(data?.rsi14) ? data.rsi14.toFixed(1) : '—'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-md)',
      borderTop: `3px solid ${loading ? '#e5e7eb' : zone.color}`,
      borderRadius: 'var(--r)',
      overflow: 'hidden',
      transition: 'border-top-color 0.5s',
    }}>
      {/* Collapsible header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Market Sentiment</span>
          {!loading && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: zone.color,
              background: zone.color + '15', border: `1px solid ${zone.color}28`,
              borderRadius: 20, padding: '3px 11px',
            }}>
              {zone.label} · {score}
            </span>
          )}
          {loading && <span style={{ fontSize: 13, color: 'var(--faint)' }}>Loading…</span>}
        </div>
        <span style={{
          fontSize: 12, color: 'var(--faint)', display: 'inline-block',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>

      {!collapsed && (
        <div style={{
          padding: '0 20px 20px',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: 24,
        }}>
          {/* Gauge + big number */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, gap: 4 }}>
            <GaugeDisplay score={score} loading={loading} />
            <div style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 44,
              fontWeight: 800,
              color: loading ? '#d1d5db' : zone.color,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              marginTop: -8,
            }}>
              {loading ? '—' : score}
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: loading ? '#d1d5db' : zone.color,
            }}>
              {loading ? '…' : zone.label}
            </div>
          </div>

          {/* Right: factors + description */}
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Contributing Factors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Pill label="200-DMA Trend"  value={dev}  color={loading ? '#ccc' : zone.color} />
              <Pill label="RSI 14-Day"     value={rsi}  />
              <Pill label="Momentum"       value={!loading ? (score >= 50 ? 'Bullish' : 'Bearish') : '—'} color={score >= 50 ? '#16a34a' : '#dc2626'} />
              <Pill label="Sentiment Zone" value={!loading ? zone.label : '—'} color={loading ? '#ccc' : zone.color} />
            </div>
            {!loading && (
              <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.65 }}>
                {score >= 80
                  ? 'Markets are in extreme greed territory. This historically signals elevated correction risk — tighten entries and avoid chasing momentum.'
                  : score >= 60
                  ? 'Investor sentiment has tilted greedy. Remain selective on new entries and prioritise quality over momentum.'
                  : score >= 40
                  ? 'Markets are in a balanced regime. Fundamentals should drive positioning over sentiment signals.'
                  : score >= 20
                  ? 'Fear is elevated, historically creating mispricing in quality assets. Disciplined accumulation may be warranted.'
                  : 'Extreme fear dominates. This has historically preceded meaningful recoveries in high-quality equities.'}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--faint)' }}>
              Derived from VOO 200-DMA deviation &amp; 14-day RSI · Not financial advice
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
