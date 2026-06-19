/**
 * FearGreedBanner.jsx
 * SVG semicircle gauge with animated needle.
 * NaN bug fix: score is guarded to always be a valid number before being
 * passed to the SVG transform. During loading, the needle stays at -90° (left).
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function scoreToConfig(score) {
  if (score >= 80) return { label: 'Extreme Greed', color: '#dc2626' }
  if (score >= 65) return { label: 'Greed',         color: '#ea580c' }
  if (score >= 45) return { label: 'Neutral',        color: '#ca8a04' }
  if (score >= 25) return { label: 'Fear',           color: '#3b82f6' }
  return               { label: 'Extreme Fear',   color: '#1d4ed8' }
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────────
function GaugeNeedle({ score, loading }) {
  // FIX: Clamp score to a valid number. If loading or NaN, park needle at left (0°).
  const safeScore = loading ? 0 : (Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50)
  const cfg = scoreToConfig(safeScore)

  // score 0→100 maps to angle -180°→0° (left to right around top of arc)
  const angle = -180 + (safeScore / 100) * 180

  const cx = 100, cy = 100
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
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 1 ${x4} ${y4} Z`
  }

  return (
    <svg viewBox="20 30 160 90" width="220" height="110" aria-label={`Fear & Greed: ${cfg.label} (${safeScore})`}>
      {/* Coloured arc segments */}
      {segments.map((s, i) => (
        <path key={i} d={arcPath(s.from, s.to)} fill={s.color} opacity={loading ? 0.25 : 0.85} />
      ))}

      {/* Divider lines between segments */}
      {[144, 108, 72, 36].map(deg => {
        const r1 = 56, r2 = 80
        const rad = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
            x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
            stroke="var(--bg, #f5f4f1)" strokeWidth="2"
          />
        )
      })}

      {/* Needle — uses CSS transform so rotation is always a valid number */}
      <g style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `rotate(${angle}deg)`,
        transition: loading ? 'none' : 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: loading ? 0.3 : 1,
      }}>
        <line x1={cx} y1={cy} x2={cx + 72} y2={cy}
          stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx - 12} y2={cy}
          stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Pivot */}
      <circle cx={cx} cy={cy} r="5" fill={loading ? '#ccc' : cfg.color} />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--bg, #f5f4f1)" />

      {/* Score label */}
      <text x={cx} y={cy + 22}
        textAnchor="middle" fontSize="15" fontWeight="800"
        fontFamily="'DM Mono', monospace" fill={loading ? '#ccc' : cfg.color}>
        {loading ? '…' : safeScore}
      </text>

      {/* Zone labels */}
      <text x="28"  y={cy + 4} fontSize="7" fill="#1d4ed8" fontWeight="700" textAnchor="middle">FEAR</text>
      <text x="172" y={cy + 4} fontSize="7" fill="#dc2626" fontWeight="700" textAnchor="middle">GREED</text>
    </svg>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '5px 10px', background: 'rgba(0,0,0,0.03)',
      borderRadius: 6, border: '1px solid rgba(0,0,0,0.07)',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
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

  // FIX: Always derive a safe numeric score. data may be null during load.
  const score = Number.isFinite(data?.fear_greed_score) ? data.fear_greed_score : (loading ? 0 : 50)
  const cfg   = scoreToConfig(score)
  const dev   = Number.isFinite(data?.dma_deviation)
    ? `${data.dma_deviation >= 0 ? '+' : ''}${(data.dma_deviation * 100).toFixed(1)}%`
    : '—'
  const rsi   = Number.isFinite(data?.rsi14) ? data.rsi14.toFixed(1) : '—'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-md)',
      borderTop: `3px solid ${loading ? '#e5e7eb' : cfg.color}`,
      borderRadius: 'var(--r)',
      marginBottom: 20,
      overflow: 'hidden',
      transition: 'border-top-color 0.6s',
    }}>
      {/* ── Always-visible header ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.02em' }}>
            Market Fear & Greed
          </span>
          {!loading && data && !data.error && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: cfg.color,
              background: cfg.color + '14',
              border: `1px solid ${cfg.color}33`,
              borderRadius: 20, padding: '2px 10px',
            }}>
              {cfg.label} · {score}
            </span>
          )}
          {loading && (
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>Loading…</span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▼</span>
      </button>

      {/* ── Expandable body ── */}
      {!collapsed && (
        <div style={{
          padding: '0 16px 16px',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: 20,
        }}>
          {data?.error ? (
            <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>
              Could not load macro data.
            </p>
          ) : (
            <>
              {/* Gauge — always renders; loading state dims & parks needle */}
              <div style={{ flexShrink: 0 }}>
                <GaugeNeedle score={score} loading={loading} />
              </div>

              {/* Right side stats */}
              <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Pill label="Score"      value={loading ? '…' : score}   color={loading ? '#ccc' : cfg.color} />
                  <Pill label="200-DMA Δ"  value={dev} color={loading ? '#ccc' : cfg.color} />
                  <Pill label="RSI 14d"    value={rsi} />
                  <Pill label="VOO"        value={!loading && data?.current_price ? `$${data.current_price}` : '—'} />
                </div>
                {!loading && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {score >= 80
                      ? 'Extreme greed dominates market positioning. Elevated valuations increase near-term drawdown risk.'
                      : score >= 65
                      ? 'Investor sentiment has tilted greedy. Exercise selective discipline on new positions.'
                      : score >= 45
                      ? 'Markets are in a balanced sentiment regime. Fundamentals should drive positioning.'
                      : score >= 25
                      ? 'Fear is elevated, creating selective mispricing. Disciplined accumulation may be warranted.'
                      : 'Extreme fear dominates. Quality assets may offer asymmetric upside for patient investors.'}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 10, color: 'var(--faint)' }}>
                  Derived from VOO 200-day MA & 14-day RSI · Not financial advice
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
