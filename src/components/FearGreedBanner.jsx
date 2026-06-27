/**
 * FearGreedBanner.jsx  — Fear/Greed gauge (clock-hand style)
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const SEVERITY_CONFIG = {
  danger:      { label: 'Extreme Greed', accent: '#dc2626', zone: '#fca5a5', score_range: [75,100], message: 'Markets are exhibiting extreme greed. Elevated valuations increase drawdown risk.' },
  warning:     { label: 'Greed',         accent: '#ea580c', zone: '#fdba74', score_range: [60,75],  message: 'Investor sentiment has tilted greedy. Exercise selective discipline on new entries.' },
  neutral:     { label: 'Neutral',       accent: '#6b7280', zone: '#d1d5db', score_range: [40,60],  message: 'Markets are in a balanced sentiment regime. Fundamentals should drive positioning.' },
  caution:     { label: 'Fear',          accent: '#ca8a04', zone: '#fde68a', score_range: [25,40],  message: 'Elevated fear is creating selective mispricing. Disciplined accumulation may be warranted.' },
  opportunity: { label: 'Extreme Fear',  accent: '#16a34a', zone: '#86efac', score_range: [0,25],   message: 'Extreme fear historically precedes recoveries. High-quality assets may be on deep discount.' },
}

// Score → rotation angle: 0 = extreme fear (left), 180 = extreme greed (right)
function scoreToAngle(score) {
  return Math.min(Math.max((score / 100) * 180, 0), 180)
}

function GaugeWidget({ score, severity }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.neutral
  const angle = scoreToAngle(score)
  // SVG gauge: semicircle, 200×110 viewBox
  const cx = 100, cy = 100, r = 80
  // Arc segments (5 zones), each 36°
  const zones = [
    { color: '#16a34a', start: 180, end: 144 }, // Extreme Fear
    { color: '#86efac', start: 144, end: 108 }, // Fear
    { color: '#d1d5db', start: 108, end: 72  }, // Neutral
    { color: '#fdba74', start: 72,  end: 36  }, // Greed
    { color: '#dc2626', start: 36,  end: 0   }, // Extreme Greed
  ]

  function polarToXY(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(Math.PI - rad),
      y: cy - radius * Math.sin(rad),
    }
  }

  function arcPath(startDeg, endDeg, outerR, innerR) {
    const o1 = polarToXY(startDeg, outerR)
    const o2 = polarToXY(endDeg,   outerR)
    const i1 = polarToXY(endDeg,   innerR)
    const i2 = polarToXY(startDeg, innerR)
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 0 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 1 ${i2.x} ${i2.y} Z`
  }

  // Needle tip
  const needleTipAngle = angle
  const tip = polarToXY(needleTipAngle, r - 6)
  const base1 = polarToXY(needleTipAngle + 90, 8)
  const base2 = polarToXY(needleTipAngle - 90, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <svg viewBox="0 0 200 108" style={{ width: 160, height: 88, overflow: 'visible' }} aria-label={`Fear/Greed gauge: ${cfg.label}`}>
        {/* Zone arcs */}
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.start, z.end, r, r - 22)} fill={z.color} opacity={0.85} />
        ))}
        {/* Track outer ring */}
        <path d={arcPath(180, 0, r + 2, r + 4)} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
        {/* Needle */}
        <polygon
          points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
          fill={cfg.accent}
          style={{ transition: 'all 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        {/* Hub */}
        <circle cx={cx} cy={cy} r={7} fill={cfg.accent} />
        <circle cx={cx} cy={cy} r={3.5} fill="white" />
        {/* Labels */}
        <text x="14" y="108" fontSize="8" fill="#16a34a" fontWeight="700" fontFamily="'DM Mono',monospace">FEAR</text>
        <text x="186" y="108" fontSize="8" fill="#dc2626" fontWeight="700" fontFamily="'DM Mono',monospace" textAnchor="end">GREED</text>
        <text x={cx} y="108" fontSize="8" fill="#6b7280" fontFamily="'DM Mono',monospace" textAnchor="middle">NEUTRAL</text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: cfg.accent, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.accent, letterSpacing: '.04em', marginTop: 2 }}>{cfg.label}</div>
      </div>
    </div>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 11px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: accent ?? '#111' }}>{value}</span>
    </div>
  )
}

export function FearGreedBanner() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    api.macro(ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e); setLoading(false) } })
    return () => ctrl.abort()
  }, [])

  if (loading) {
    return (
      <div style={{ height: 52, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', paddingLeft: 16, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }}>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>Loading sentiment gauge…</span>
      </div>
    )
  }

  if (error || !data || data.error) return null

  const severity     = data.severity ?? 'neutral'
  const cfg          = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.neutral
  const score        = data.fear_greed_score ?? 50
  const deviation    = data.dma_deviation != null ? (data.dma_deviation * 100).toFixed(1) : '—'
  const rsi          = data.rsi14 != null ? data.rsi14.toFixed(1) : '—'
  const devSign      = data.dma_deviation >= 0 ? '+' : ''

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid var(--border)`,
      borderLeft: `4px solid ${cfg.accent}`,
      borderRadius: 14,
      padding: '14px 18px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      boxSizing: 'border-box',
    }}>
      {/* Gauge */}
      <GaugeWidget score={score} severity={severity} />

      {/* Right side info */}
      <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Market Sentiment · VOO</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: cfg.accent, marginTop: 2 }}>{cfg.label}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill label="200-DMA Δ" value={`${devSign}${deviation}%`} accent={cfg.accent} />
          <StatPill label="RSI 14D"   value={rsi}                        accent={cfg.accent} />
          <StatPill label="VOO Price" value={data.current_price != null ? `$${data.current_price}` : '—'} />
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{cfg.message}</div>
      </div>
    </div>
  )
}
