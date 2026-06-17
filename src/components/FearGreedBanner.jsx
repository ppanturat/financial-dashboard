/**
 * FearGreedBanner.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Persistent top-of-dashboard macro sentiment banner.
 * Displays the Fear & Greed score derived from VOO's 200-DMA and 14-day RSI.
 *
 * Severity mapping:
 *   "danger"      → Extreme Greed  → Red warning UI
 *   "opportunity" → Extreme Fear   → Green opportunity UI
 *   "warning"     → Greed          → Orange UI
 *   "caution"     → Fear           → Yellow UI
 *   "neutral"     → Neutral        → Muted grey UI
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// ── Colour configs per severity ───────────────────────────────────────────────
const SEVERITY_CONFIG = {
  danger: {
    bg:         '#fef2f2',
    border:     '#fca5a5',
    accent:     '#dc2626',
    trackBg:    '#fecaca',
    fillColor:  '#dc2626',
    label:      'Extreme Greed',
    icon:       '🔴',
    message:    'Markets are exhibiting extreme greed. Elevated valuations increase drawdown risk.',
  },
  warning: {
    bg:         '#fff7ed',
    border:     '#fdba74',
    accent:     '#ea580c',
    trackBg:    '#fed7aa',
    fillColor:  '#ea580c',
    label:      'Greed',
    icon:       '🟠',
    message:    'Investor sentiment has tilted greedy. Exercise selective discipline on new entries.',
  },
  neutral: {
    bg:         'var(--surface)',
    border:     'var(--border-md)',
    accent:     '#6b6a65',
    trackBg:    'rgba(0,0,0,0.06)',
    fillColor:  '#6b6a65',
    label:      'Neutral',
    icon:       '⚪',
    message:    'Markets are in a balanced sentiment regime. Fundamentals should drive positioning.',
  },
  caution: {
    bg:         '#fefce8',
    border:     '#fef08a',
    accent:     '#ca8a04',
    trackBg:    '#fde68a',
    fillColor:  '#ca8a04',
    label:      'Fear',
    icon:       '🟡',
    message:    'Elevated fear is creating selective mispricing. Disciplined accumulation may be warranted.',
  },
  opportunity: {
    bg:         '#f0fdf4',
    border:     '#86efac',
    accent:     '#16a34a',
    trackBg:    '#bbf7d0',
    fillColor:  '#16a34a',
    label:      'Extreme Fear',
    icon:       '🟢',
    message:    'Extreme fear historically precedes recoveries. High-quality assets may be on deep discount.',
  },
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score, fillColor, trackBg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 120 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: trackBg, overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${score}%`,
          background: fillColor,
          borderRadius: 3,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
        {/* Midpoint tick */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: 1, background: 'rgba(0,0,0,0.15)',
        }} />
      </div>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 12, fontWeight: 600,
        color: fillColor, minWidth: 32, textAlign: 'right',
      }}>
        {score}
      </span>
    </div>
  )
}

// ── Sub-stat pill ─────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 1,
      padding: '5px 10px',
      background: 'rgba(0,0,0,0.04)',
      borderRadius: 6,
      border: '1px solid rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 12, fontWeight: 700,
        color: accent ?? '#111',
      }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
      <div style={{
        height: 44, borderRadius: 'var(--r)',
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', paddingLeft: 16,
        marginBottom: 16, animation: 'pulse 1.5s ease infinite',
      }}>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>Loading macro sentiment…</span>
      </div>
    )
  }

  if (error || !data || data.error) return null

  const severity  = data.severity ?? 'neutral'
  const cfg       = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.neutral
  const score     = data.fear_greed_score ?? 50
  const deviation = data.dma_deviation != null ? (data.dma_deviation * 100).toFixed(1) : '—'
  const rsi       = data.rsi14 != null ? data.rsi14.toFixed(1) : '—'
  const deviationSign = data.dma_deviation >= 0 ? '+' : ''

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.accent}`,
      borderRadius: 'var(--r)',
      padding: '10px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>{cfg.icon}</span>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: '#6b6a65', textTransform: 'uppercase', letterSpacing: '0.07em',
            lineHeight: 1,
          }}>
            Market Sentiment · VOO
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: cfg.accent, lineHeight: 1.4,
          }}>
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <ScoreBar score={score} fillColor={cfg.fillColor} trackBg={cfg.trackBg} />

      {/* Sub-stats */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatPill label="200-DMA Δ" value={`${deviationSign}${deviation}%`} accent={cfg.accent} />
        <StatPill label="RSI 14d"   value={rsi} accent={cfg.accent} />
        <StatPill label="VOO Price" value={data.current_price != null ? `$${data.current_price}` : '—'} />
      </div>

      {/* Message */}
      <div style={{
        flex: '1 1 100%',
        fontSize: 12,
        color: '#6b6a65',
        lineHeight: 1.5,
        paddingTop: 2,
      }}>
        {cfg.message}
      </div>
    </div>
  )
}
