import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const SEVERITY_MSG = {
  danger:            { accent: '#22c55e', message: 'Markets are exhibiting extreme greed. Elevated valuations increase drawdown risk.' },
  warning:           { accent: '#84cc16', message: 'Investor sentiment has tilted greedy. Exercise selective discipline on new entries.' },
  'neutral-bullish': { accent: '#eab308', message: 'Sentiment is balanced with a mild bullish tilt. Fundamentals should still drive positioning.' },
  'neutral-bearish': { accent: '#eab308', message: 'Sentiment is balanced with a mild bearish tilt. Fundamentals should still drive positioning.' },
  caution:           { accent: '#f97316', message: 'Elevated fear is creating selective mispricing. Disciplined accumulation may be warranted.' },
  opportunity:       { accent: '#ef4444', message: 'Extreme fear historically precedes recoveries. High-quality assets may be on deep discount.' },
}

// single continuous stroked arc (gradient) — no gaps/seams vs hand-built wedges
const W = 200, H = 110
const CX = W / 2, CY = 100, R = 80
const STROKE = 16

// semicircle path, left (180deg) to right (0deg), drawn over the top
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

function needleAngleDeg(score) {
  // score 0 -> 180deg (left), score 100 -> 0deg (right)
  return 180 - (Math.min(Math.max(score, 0), 100) / 100) * 180
}

function Gauge({ score, accent, label }) {
  const angle = needleAngleDeg(score)
  const rad = (angle * Math.PI) / 180
  const needleLen = R - STROKE / 2 - 4
  const tipX = CX + needleLen * Math.cos(rad)
  const tipY = CY - needleLen * Math.sin(rad)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      {/* extra viewBox width/height so edge labels never clip, plus side padding */}
      <svg viewBox={`-14 0 ${W + 28} ${H + 6}`} style={{ width: 208 * 1.2, height: 105 * 1.2, overflow: 'visible' }} aria-label={`Fear/Greed gauge score ${score}`}>
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

        {/* Edge labels — positioned below/outside the arc ends with room to breathe */}
        <text x={CX - R - 20} y={H + 17} fontSize="15" fontWeight="700" fill="#ef4444" fontFamily="var(--font-body),monospace" textAnchor="start" padding-top="20">FEAR</text>
        <text x={CX + R + 23} y={H + 17} fontSize="15" fontWeight="700" fill="#22c55e" fontFamily="var(--font-body),monospace" textAnchor="end" padding-top="20">GREED</text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontSize: 25, fontWeight: 800, fontFamily: "var(--font-body),monospace", color: accent, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: accent, letterSpacing: '.05em', marginTop: 3 }}>{label}</div>
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
      <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 14, fontWeight: 700, color: accent ?? 'var(--text, #1a1916)' }}>
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

  const severity  = data.severity ?? 'neutral-bullish'
  const cfg       = SEVERITY_MSG[severity] ?? SEVERITY_MSG['neutral-bullish']
  const label     = data.label ?? 'Neutral'
  const score     = Math.round(data.fear_greed_score ?? 50)
  const devSign   = (data.dma_deviation ?? 0) >= 0 ? '+' : ''
  const deviation = data.dma_deviation != null ? `${devSign}${(data.dma_deviation * 100).toFixed(1)}%` : '—'
  const rsi       = data.rsi14 != null ? data.rsi14.toFixed(1) : '—'

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
      <Gauge score={score} accent={cfg.accent} label={label} />

      <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Market Sentiment
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: cfg.accent, marginTop: 2, fontFamily: "var(--font-body),sans-serif" }}>
            {label}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill label="200-DMA Δ" value={deviation} accent={cfg.accent} />
          <StatPill label="RSI 14D"   value={rsi} />
        </div>

        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          {cfg.message}
        </p>
      </div>
    </div>
  )
}
