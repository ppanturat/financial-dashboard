/**
 * ValuationBadge.jsx
 * Replaces Fear & Greed on individual stock pages.
 * Six-tier relative valuation: Extreme Discount → Deep Discount → Discount →
 * Fair Value → Premium → Extreme Premium
 * Uses metrics already loaded by MarketView (no extra API call).
 */

// ── Six-tier config ───────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'extreme-discount',
    label: 'Extreme Discount',
    threshold: v => v <= -0.35,
    color:  '#15803d',
    bg:     '#f0fdf4',
    border: '#86efac',
    icon:   '⬇⬇',
    detail: 'Trading at a severe discount vs. its own history. Either a deep value opportunity or a fundamental deterioration. Warrants thorough due diligence before assuming mean reversion.',
  },
  {
    id: 'deep-discount',
    label: 'Deep Discount',
    threshold: v => v <= -0.20,
    color:  '#16a34a',
    bg:     '#f0fdf4',
    border: '#bbf7d0',
    icon:   '⬇',
    detail: 'Forward multiples are meaningfully below historical norms. If fundamentals remain intact, this represents a potential entry point with asymmetric upside.',
  },
  {
    id: 'discount',
    label: 'Discount',
    threshold: v => v <= -0.08,
    color:  '#65a30d',
    bg:     '#f7fee7',
    border: '#d9f99d',
    icon:   '↓',
    detail: 'Modest discount to historical median. Market is applying a mild haircut — worth monitoring for a sustained re-rating catalyst.',
  },
  {
    id: 'fair-value',
    label: 'Fair Value',
    threshold: v => v < 0.12,
    color:  '#ca8a04',
    bg:     '#fefce8',
    border: '#fde68a',
    icon:   '≈',
    detail: 'Forward P/E is broadly aligned with historical median. The market is pricing in a standard growth premium with no significant discount or excess.',
  },
  {
    id: 'premium',
    label: 'Premium',
    threshold: v => v < 0.30,
    color:  '#ea580c',
    bg:     '#fff7ed',
    border: '#fed7aa',
    icon:   '↑',
    detail: 'Trading above historical norms. Elevated expectations are embedded in the price — execution risk is elevated and margin of safety is compressed.',
  },
  {
    id: 'extreme-premium',
    label: 'Extreme Premium',
    threshold: () => true,
    color:  '#dc2626',
    bg:     '#fef2f2',
    border: '#fca5a5',
    icon:   '⬆⬆',
    detail: 'Significantly above historical median. The stock prices in near-perfect execution with limited margin of safety. Any guidance miss could trigger sharp multiple compression.',
  },
]

function getTier(discountPct) {
  for (const t of TIERS) {
    if (t.threshold(discountPct)) return t
  }
  return TIERS[3] // fair value fallback
}

// ── Bar visual ────────────────────────────────────────────────────────────────
function ValuationBar({ discountPct }) {
  // Map -50% → +50% range to 0-100 position
  const clamped = Math.max(-0.5, Math.min(0.5, discountPct ?? 0))
  const pct     = ((clamped + 0.5) / 1.0) * 100

  return (
    <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'visible', marginTop: 4 }}>
      {/* Gradient track */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 3,
        background: 'linear-gradient(to right, #15803d, #65a30d, #ca8a04, #ea580c, #dc2626)',
      }} />
      {/* Centre tick */}
      <div style={{
        position: 'absolute', left: '50%', top: -2, bottom: -2,
        width: 1.5, background: 'rgba(0,0,0,0.25)',
      }} />
      {/* Needle */}
      <div style={{
        position: 'absolute', left: `${pct}%`, top: -3, bottom: -3,
        width: 3, background: '#111', borderRadius: 2,
        transform: 'translateX(-50%)',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
        transition: 'left 0.8s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ValuationBadge({ metrics }) {
  const [collapsed, setCollapsed] = useState(false)

  // Use metrics passed from parent — no extra API call needed
  const fpe    = metrics?.forward_pe
  const tpe    = metrics?.trailing_pe
  const ps     = metrics?.ps_ratio
  const pb     = metrics?.pb_ratio

  // We can only compute a valuation view if we have at least a forward P/E
  if (!fpe && !tpe) return null

  // Simple discount proxy: forward vs trailing P/E gap as % of trailing
  // (positive = forward > trailing = expected earnings growth = premium)
  // If both available, show the spread; otherwise show fair value
  let discountPct = null
  let displayLabel = null

  if (fpe && tpe && tpe > 0 && fpe > 0) {
    discountPct  = (fpe - tpe) / tpe    // positive = premium to trailing
    displayLabel = `Fwd vs Trailing P/E spread: ${discountPct >= 0 ? '+' : ''}${(discountPct * 100).toFixed(0)}%`
  }

  const tier = discountPct != null ? getTier(discountPct) : TIERS[3]

  return (
    <div style={{
      background: tier.bg,
      border: `1px solid ${tier.border}`,
      borderTop: `3px solid ${tier.color}`,
      borderRadius: 'var(--r)',
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* ── Header (always visible) ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '11px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Relative Valuation</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: tier.color,
            background: tier.color + '18',
            border: `1px solid ${tier.color}33`,
            borderRadius: 20, padding: '2px 9px',
          }}>
            {tier.icon} {tier.label}
          </span>
        </div>
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▼</span>
      </button>

      {/* ── Expanded body ── */}
      {!collapsed && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Valuation bar */}
          {discountPct != null && (
            <div>
              <ValuationBar discountPct={discountPct} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 9, color: '#15803d', fontWeight: 700 }}>DISCOUNT</span>
                <span style={{ fontSize: 9, color: 'var(--faint)', fontWeight: 600 }}>FAIR VALUE</span>
                <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 700 }}>PREMIUM</span>
              </div>
            </div>
          )}

          {/* Metric pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fpe && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fwd P/E</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: tier.color }}>{fpe.toFixed(1)}×</span>
              </div>
            )}
            {tpe && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Trailing P/E</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{tpe.toFixed(1)}×</span>
              </div>
            )}
            {ps && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>P/S</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ps.toFixed(1)}×</span>
              </div>
            )}
            {pb && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>P/B</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{pb.toFixed(1)}×</span>
              </div>
            )}
          </div>

          {/* Detail text */}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            {tier.detail}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--faint)' }}>
            Based on forward vs trailing P/E spread · Not financial advice
          </p>
        </div>
      )}
    </div>
  )
}

// Need useState imported
import { useState } from 'react'
