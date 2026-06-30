import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const SEVERITY_MSG = {
  danger:      { label: 'Extreme Greed', accent: '#22c55e', message: 'Markets are exhibiting extreme greed. Elevated valuations increase drawdown risk.' },
  warning:     { label: 'Greed',         accent: '#84cc16', message: 'Investor sentiment has tilted greedy. Exercise selective discipline on new entries.' },
  neutral:     { label: 'Neutral',       accent: '#eab308', message: 'Markets are in a balanced sentiment regime. Fundamentals should drive positioning.' },
  caution:     { label: 'Fear',          accent: '#f97316', message: 'Elevated fear is creating selective mispricing. Disciplined accumulation may be warranted.' },
  opportunity: { label: 'Extreme Fear',  accent: '#ef4444', message: 'Extreme fear historically precedes recoveries. High-quality assets may be on deep discount.' },
}

function zoneLabel(score) {
  if (score <= 20) return 'Extreme Fear'
  if (score <= 40) return 'Fear'
  if (score <= 60) return 'Neutral'
  if (score <= 80) return 'Greed'
  return 'Extreme Greed'
}

// ── Simple, reliable semicircle gauge ──────────────────────────────────────
// A single continuous stroked arc (using a gradient) is far more robust
// than hand-built donut wedge paths — no gaps, no seams, no angle bugs.
const W = 200, H = 110
const CX = W / 2, CY = 100, R = 80
const STROKE = 16

// Standard semicircle path, left (180°) to right (0°), drawn over the top
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

function needleAngleDeg(score) {
  // score 0   → 180° (pointing left)
  // score 100 → 0°   (pointing right)
  return 180 - (Math.min(Math.max(score, 0), 100) / 100) * 180
}

function Gauge({ score, accent }) {
  const angle = needleAngleDeg(score)
  const rad = (angle * Math.PI) / 180
  const needleLen = R - STROKE / 2 - 4
  const tipX = CX + needleLen * Math.cos(rad)
  const tipY = CY - needleLen * Math.sin(rad)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 180, height: 99, overflow: 'visible' }} aria-label={`Fear/Greed gauge score ${score}`}>
        <defs>
          <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ef4444" />
            <stop offset="25%"  stopColor="#f97316" />
            <stop offset="50%"  stopColor="#eab308" />
            <stop offset="75%"  stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Track background */}
        <path d={ARC_PATH} fill="none" stroke="#eee9e0" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Colored gradient arc */}
        <path d={ARC_PATH} fill="none" stroke="url(#fgGradient)" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Needle */}
        <line
          x1={CX} y1={CY} x2={tipX} y2={tipY}
          stroke="#1a1916" strokeWidth={3} strokeLinecap="round"
          style={{ transition: 'all 1s cubic-bezier(0.34,1.3,0.64,1)' }}
        />
        <circle cx={CX} cy={CY} r={7} fill="#1a1916" />
        <circle cx={CX} cy={CY} r={3} fill="#fff" />

        {/* Edge labels */}
        <text x={CX - R} y={H - 2} fontSize="9" fontWeight="700" fill="#ef4444" fontFamily="'DM Mono',monospace" textAnchor="start">FEAR</text>
        <text x={CX + R} y={H - 2} fontSize="9" fontWeight="700" fill="#22c55e" fontFamily="'DM Mono',monospace" textAnchor="end">GREED</text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: accent, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '.05em', marginTop: 3 }}>{zoneLabel(score)}</div>
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

  const severity  = data.severity ?? 'neutral'
  const cfg       = SEVERITY_MSG[severity] ?? SEVERITY_MSG.neutral
  const score     = Math.round(data.fear_greed_score ?? 50)
  const devSign   = (data.dma_deviation ?? 0) >= 0 ? '+' : ''
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
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Market Sentiment · VOO
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cfg.accent, marginTop: 2, fontFamily: "'Syne',sans-serif" }}>
            {cfg.label}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill label="200-DMA Δ" value={deviation} accent={cfg.accent} />
          <StatPill label="RSI 14D"   value={rsi} />
          <StatPill label="VOO Price" value={price} />
        </div>

        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          {cfg.message}
        </p>
      </div>
    </div>
  )
}
