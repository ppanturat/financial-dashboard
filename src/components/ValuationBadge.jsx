/**
 * ValuationBadge.jsx
 * 
 * FIX: Replaced borderLeft with borderTop for the colour accent.
 * borderLeft on a flex child bleeds as a visible coloured line between cards
 * when the parent uses gap spacing, because the border renders outside the
 * card's background box. borderTop does not have this problem.
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const FLAG_CONFIG = {
  'Deep Discount': {
    color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
    icon: '↓', label: 'Deep Discount',
    detail: 'Trading significantly below its historical P/E median — potential value opportunity.',
  },
  'Heavy Premium': {
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    icon: '↑', label: 'Heavy Premium',
    detail: 'Trading well above its historical P/E median — elevated expectations embedded in price.',
  },
  'Fair Value': {
    color: '#ca8a04', bg: '#fefce8', border: '#fde68a',
    icon: '≈', label: 'Fair Value',
    detail: 'Current forward P/E is broadly in line with historical median — balanced risk/reward.',
  },
}

export function ValuationBadge({ ticker }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ticker) return
    const ctrl = new AbortController()
    setLoading(true)
    setData(null)
    api.valuation(ticker, ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => ctrl.abort()
  }, [ticker])

  if (loading || !data || data.error) return null
  if (!data.valuation_flag || !data.current_forward_pe) return null

  const cfg         = FLAG_CONFIG[data.valuation_flag] ?? FLAG_CONFIG['Fair Value']
  const discountPct = data.discount_pct != null ? Math.abs(data.discount_pct * 100).toFixed(0) : null
  const direction   = data.discount_pct < 0 ? 'below' : 'above'
  const currentPE   = data.current_forward_pe?.toFixed(1)
  const medianPE    = data.historical_median_pe?.toFixed(1)

  return (
    <div style={{
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      // FIX: borderTop accent only — never borderLeft
      borderTop:    `3px solid ${cfg.color}`,
      borderRadius: 8,
      padding:      '10px 14px',
      display:      'flex',
      flexDirection:'column',
      gap:          8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: cfg.color + '18', border: `1px solid ${cfg.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: cfg.color, flexShrink: 0,
        }}>{cfg.icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fwd P/E</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: cfg.color }}>{currentPE ?? '—'}×</div>
        </div>
        <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', alignSelf: 'stretch' }} />
        <div>
          <div style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hist. Median P/E</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: '#111' }}>{medianPE ?? '—'}×</div>
        </div>
        {discountPct && (
          <>
            <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', alignSelf: 'stretch' }} />
            <div>
              <div style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spread</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: cfg.color }}>{discountPct}% {direction}</div>
            </div>
          </>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: '#6b6a65', lineHeight: 1.5 }}>{cfg.detail}</p>
    </div>
  )
}
