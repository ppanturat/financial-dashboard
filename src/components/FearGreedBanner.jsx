/**
 * FearGreedBanner.jsx
 * Market-level Fear & Greed gauge using a proper SVG semicircle with
 * an animated clock-hand needle. Data is fetched from /api/macro (VOO-based).
 * Collapsible. Lives only on the News Feed / Global Intelligence page.
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// ── Colour zones (0-100 score) ────────────────────────────────────────────────
function scoreToConfig(score) {
  if (score >= 80) return { label: 'Extreme Greed', color: '#dc2626', zone: 'extreme-greed' }
  if (score >= 65) return { label: 'Greed',         color: '#ea580c', zone: 'greed'         }
  if (score >= 45) return { label: 'Neutral',        color: '#ca8a04', zone: 'neutral'       }
  if (score >= 25) return { label: 'Fear',           color: '#3b82f6', zone: 'fear'          }
  return               { label: 'Extreme Fear',   color: '#1d4ed8', zone: 'extreme-fear'  }
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────────
// Semicircle: radius 80, centre 100,100, arc from 180° to 0° (left→right)
function GaugeNeedle({ score }) {
  // score 0→100 maps to angle -180°→0° (left to right around top)
  const angle = -180 + (score / 100) * 180
  const cfg = scoreToConfig(score)

  // Convert angle to radians for needle endpoint
  const rad = (angle * Math.PI) / 180
  const cx = 100, cy = 100, r = 68
  const nx = cx + r * Math.cos(rad)
  const ny = cy + r * Math.sin(rad)

  // Arc segments: Extreme Fear | Fear | Neutral | Greed | Extreme Greed
  // Each 36° slice of the 180° semicircle
  const segments = [
    { color: '#1d4ed8', from: 180, to: 144 },
    { color: '#3b82f6', from: 144, to: 108 },
    { color: '#ca8a04', from: 108, to: 72  },
    { color: '#ea580c', from: 72,  to: 36  },
    { color: '#dc2626', from: 36,  to: 0   },
  ]

  function arcPath(fromDeg, toDeg, outerR = 78, innerR = 58) {
    const f = (fromDeg * Math.PI) / 180
    const t = (toDeg   * Math.PI) / 180
    const x1 = cx + outerR * Math.cos(f), y1 = cy + outerR * Math.sin(f)
    const x2 = cx + outerR * Math.cos(t), y2 = cy + outerR * Math.sin(t)
    const x3 = cx + innerR * Math.cos(t), y3 = cy + innerR * Math.sin(t)
    const x4 = cx + innerR * Math.cos(f), y4 = cy + innerR * Math.sin(f)
    // large-arc-flag: 0 since each segment is < 180°
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 1 ${x4} ${y4} Z`
  }

  return (
    <svg
      viewBox="20 30 160 90"
      width="220"
      height="110"
      aria-label={`Fear & Greed: ${cfg.label} (${score})`}
    >
      {/* Segments */}
      {segments.map((s, i) => (
        <path key={i} d={arcPath(s.from, s.to)} fill={s.color} opacity="0.85" />
      ))}

      {/* Gap lines between segments */}
      {[144, 108, 72, 36].map(deg => {
        const r1 = 56, r2 = 80
        const rad2 = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={cx + r1 * Math.cos(rad2)} y1={cy + r1 * Math.sin(rad2)}
            x2={cx + r2 * Math.cos(rad2)} y2={cy + r2 * Math.sin(rad2)}
            stroke="var(--bg, #f5f4f1)" strokeWidth="2"
          />
        )
      })}

      {/* Needle — animated via CSS transform */}
      <g style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `rotate(${angle}deg)`,
        transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Needle shaft */}
        <line
          x1={cx} y1={cy}
          x2={cx + 72} y2={cy}
          stroke={cfg.color} strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Needle tail */}
        <line
          x1={cx} y1={cy}
          x2={cx - 12} y2={cy}
          stroke={cfg.color} strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {/* Centre pivot */}
      <circle cx={cx} cy={cy} r="5" fill={cfg.color} />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--bg, #f5f4f1)" />

      {/* Score label */}
      <text
        x={cx} y={cy + 22}
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fontFamily="'DM Mono', monospace"
        fill={cfg.color}
      >
        {score}
      </text>

      {/* Zone labels */}
      <text x="28"  y={cy + 4} fontSize="7" fill="#1d4ed8" fontWeight="700" textAnchor="middle">FEAR</text>
      <text x="172" y={cy + 4} fontSize="7" fill="#dc2626" fontWeight="700" textAnchor="middle">GREED</text>
    </svg>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '6px 12px',
      background: 'rgba(0,0,0,0.03)',
      borderRadius: 7,
      border: '1px solid rgba(0,0,0,0.07)',
      minWidth: 80,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function FearGreedBanner() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    api.macro(ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => ctrl.abort()
  }, [])

  const score = data?.fear_greed_score ?? 50
  const cfg   = scoreToConfig(score)
  const dev   = data?.dma_deviation != null ? `${data.dma_deviation >= 0 ? '+' : ''}${(data.dma_deviation * 100).toFixed(1)}%` : '—'
  const rsi   = data?.rsi14 != null ? data.rsi14.toFixed(1) : '—'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-md)',
      borderTop: `3px solid ${cfg.color}`,
      borderRadius: 'var(--r)',
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      {/* ── Header row (always visible) ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.02em' }}>
            Market Fear & Greed
          </span>
          {!loading && data && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: cfg.color,
              background: cfg.color + '14',
              border: `1px solid ${cfg.color}33`,
              borderRadius: 20, padding: '2px 10px',
            }}>
              {cfg.label} · {score}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▼</span>
      </button>

      {/* ── Expanded content ── */}
      {!collapsed && (
        <div style={{
          padding: '0 16px 16px',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: 20,
        }}>
          {loading ? (
            <div style={{ height: 110, display: 'flex', alignItems: 'center', color: 'var(--faint)', fontSize: 12 }}>
              Loading market data…
            </div>
          ) : !data || data.error ? (
            <div style={{ fontSize: 12, color: 'var(--faint)', padding: '8px 0' }}>
              Could not load macro data. Check your backend connection.
            </div>
          ) : (
            <>
              {/* Gauge */}
              <div style={{ flexShrink: 0 }}>
                <GaugeNeedle score={score} />
              </div>

              {/* Right side: stats + description */}
              <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatPill label="Score"     value={score}    color={cfg.color} />
                  <StatPill label="200-DMA Δ" value={dev}      color={cfg.color} />
                  <StatPill label="RSI 14d"   value={rsi}      />
                  <StatPill label="VOO"        value={data.current_price != null ? `$${data.current_price}` : '—'} />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {score >= 80
                    ? 'Extreme greed dominates market positioning. Elevated valuations increase near-term drawdown risk — maintain disciplined entry criteria.'
                    : score >= 65
                    ? 'Investor sentiment has tilted greedy. Exercise selective discipline on new positions and avoid chasing momentum blindly.'
                    : score >= 45
                    ? 'Markets are in a balanced sentiment regime. Fundamentals should drive positioning over sentiment signals.'
                    : score >= 25
                    ? 'Fear is elevated, creating selective mispricing opportunities in high-quality assets. Disciplined accumulation may be warranted.'
                    : 'Extreme fear dominates. Historically, this has preceded meaningful recoveries. High-conviction positions in quality assets may offer asymmetric upside.'}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: 'var(--faint)' }}>
                  Derived from VOO 200-day MA deviation & 14-day RSI · Not financial advice
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
