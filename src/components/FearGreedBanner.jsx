import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Score 0 = Extreme Fear (left), 100 = Extreme Greed (right)
const ZONES = [
  { label: 'Extreme Fear', color: '#ef4444', from: 0,  to: 20  },
  { label: 'Fear',         color: '#f97316', from: 20, to: 40  },
  { label: 'Neutral',      color: '#eab308', from: 40, to: 60  },
  { label: 'Greed',        color: '#84cc16', from: 60, to: 80  },
  { label: 'Extreme Greed',color: '#22c55e', from: 80, to: 100 },
]

const SEVERITY_MSG = {
  danger:      { label: 'Extreme Greed', accent: '#22c55e', message: 'Markets are exhibiting extreme greed. Elevated valuations increase drawdown risk.' },
  warning:     { label: 'Greed',         accent: '#84cc16', message: 'Investor sentiment has tilted greedy. Exercise selective discipline on new entries.' },
  neutral:     { label: 'Neutral',       accent: '#eab308', message: 'Markets are in a balanced sentiment regime. Fundamentals should drive positioning.' },
  caution:     { label: 'Fear',          accent: '#f97316', message: 'Elevated fear is creating selective mispricing. Disciplined accumulation may be warranted.' },
  opportunity: { label: 'Extreme Fear',  accent: '#ef4444', message: 'Extreme fear historically precedes recoveries. High-quality assets may be on deep discount.' },
}

// Gauge geometry
const CX = 110, CY = 100, R_OUT = 90, R_IN = 62

// Convert score (0–100) to SVG angle in degrees
// 0 score = 180° (left), 100 score = 0° (right)
function scoreToAngle(score) {
  return 180 - (Math.min(Math.max(score, 0), 100) / 100) * 180
}

// Point on circle from standard math angle (0° = right, 90° = top in SVG coords)
function pt(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

// Donut arc from startScore to endScore
function arcPath(fromScore, toScore) {
  const a1 = scoreToAngle(fromScore)  // start angle
  const a2 = scoreToAngle(toScore)    // end angle
  const o1 = pt(a1, R_OUT), o2 = pt(a2, R_OUT)
  const i1 = pt(a1, R_IN),  i2 = pt(a2, R_IN)
  // arc sweeps from a1 to a2 (decreasing angle = clockwise sweep in our system)
  // large-arc = 0 since each zone is < 180°
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${R_OUT} ${R_OUT} 0 0 0 ${o2.x} ${o2.y}`,  // outer arc (CCW sweep flag=0 goes right→left)
    `L ${i2.x} ${i2.y}`,
    `A ${R_IN} ${R_IN} 0 0 1 ${i1.x} ${i1.y}`,   // inner arc (sweep back)
    'Z',
  ].join(' ')
}

function Gauge({ score, accent }) {
  const needleAngle = scoreToAngle(score)
  // Needle: thin triangle pointing outward from hub
  const tipPt  = pt(needleAngle, R_OUT - 8)
  const base   = pt(needleAngle + 90, 5)
  const base2  = pt(needleAngle - 90, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <svg
        viewBox="0 0 220 108"
        style={{ width: 180, height: 95, overflow: 'visible' }}
        aria-label={`Fear/Greed gauge score ${score}`}
      >
        {/* Zone arcs */}
        {ZONES.map(z => (
          <path key={z.label} d={arcPath(z.from, z.to)} fill={z.color} opacity={0.88} />
        ))}

        {/* Thin gap lines between zones */}
        {[20, 40, 60, 80].map(score => {
          const a = scoreToAngle(score)
          const p1 = pt(a, R_IN - 2), p2 = pt(a, R_OUT + 2)
          return <line key={score} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeWidth={1.5} />
        })}

        {/* Needle */}
        <polygon
          points={`${tipPt.x},${tipPt.y} ${base.x},${base.y} ${base2.x},${base2.y}`}
          fill="#1a1916"
          style={{ transition: 'all 1.1s cubic-bezier(0.34,1.3,0.64,1)' }}
        />
        {/* Hub circle */}
        <circle cx={CX} cy={CY} r={9}   fill="#1a1916" />
        <circle cx={CX} cy={CY} r={5}   fill="white"   />
        <circle cx={CX} cy={CY} r={2.5} fill={accent}  />

        {/* Edge labels */}
        <text x={10}  y={105} fontSize="8.5" fontWeight="700" fill="#ef4444" fontFamily="'DM Mono',monospace" textAnchor="start">FEAR</text>
        <text x={210} y={105} fontSize="8.5" fontWeight="700" fill="#22c55e" fontFamily="'DM Mono',monospace" textAnchor="end">GREED</text>
      </svg>

      {/* Score + label below gauge */}
      <div style={{ textAlign: 'center', marginTop: -4 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: accent, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '.05em', marginTop: 3 }}>
          {ZONES.find(z => score >= z.from && score <= z.to)?.label ?? 'Neutral'}
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '7px 12px',
      background: 'var(--surface-2, #f0ede8)',
      borderRadius: 9,
      border: '1px solid var(--border, #e5e1da)',
      minWidth: 80,
    }}>
      <span style={{ fontSize: 10, color: 'var(--faint, #9e9890)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: accent ?? 'var(--text, #1a1916)' }}>
        {value}
      </span>
    </div>
  )
}

export function FearGreedBanner() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    api.macro(ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => ctrl.abort()
  }, [])

  if (loading) return (
    <div style={{
      height: 56, borderRadius: 14,
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', paddingLeft: 18, marginBottom: 16,
    }}>
      <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 4 }} />
    </div>
  )

  if (!data || data.error) return null

  const severity = data.severity ?? 'neutral'
  const cfg      = SEVERITY_MSG[severity] ?? SEVERITY_MSG.neutral
  const score    = Math.round(data.fear_greed_score ?? 50)
  const devSign  = (data.dma_deviation ?? 0) >= 0 ? '+' : ''
  const deviation = data.dma_deviation != null ? `${devSign}${(data.dma_deviation * 100).toFixed(1)}%` : '—'
  const rsi       = data.rsi14 != null ? data.rsi14.toFixed(1) : '—'
  const price     = data.current_price != null ? `$${data.current_price}` : '—'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${cfg.accent}`,
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      flexWrap: 'wrap',
      boxSizing: 'border-box',
    }}>
      <Gauge score={score} accent={cfg.accent} />

      <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Market Sentiment · VOO
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cfg.accent, marginTop: 2, fontFamily: "'Syne',sans-serif" }}>
            {cfg.label}
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill label="200-DMA Δ" value={deviation} accent={cfg.accent} />
          <StatPill label="RSI 14D"   value={rsi} />
          <StatPill label="VOO Price" value={price} />
        </div>

        {/* Message */}
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          {cfg.message}
        </p>
      </div>
    </div>
  )
}
