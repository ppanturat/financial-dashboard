/**
 * AdoptionRedFlagCards.jsx
 * Fixed: removed borderLeft that caused the green line artifact above cards.
 * The card now uses a top border accent instead of a left border, which doesn't
 * bleed into sibling elements.
 */
import { useState } from 'react'

const SEVERITY = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🚨', badgeLabel: 'Critical Flag' },
  warning: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '⚠️', badgeLabel: 'Warning'       },
  caution: { color: '#ca8a04', bg: '#fefce8', border: '#fde68a', icon: '🔶', badgeLabel: 'Caution'       },
  pass:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅', badgeLabel: 'Pass'          },
}

function AlertCard({ severity, title, text, children, defaultCollapsed = false }) {
  const cfg = SEVERITY[severity] ?? SEVERITY.caution
  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <div style={{
      background: cfg.bg,
      // FIX: Use border + borderTop accent only. No borderLeft — that was causing
      // the green line artifact that appeared above these cards in the DOM flow.
      border: `1px solid ${cfg.border}`,
      borderTop: `3px solid ${cfg.color}`,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 0,
    }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '11px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
              {cfg.badgeLabel}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginTop: 1 }}>
              {title}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, color: cfg.color,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', flexShrink: 0,
        }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{text}</p>
          {children}
        </div>
      )}
    </div>
  )
}

export function AdoptionCheckCard({ result }) {
  if (!result) return null
  return <AlertCard severity={result.severity} title={result.title} text={result.text} defaultCollapsed={result.severity === 'pass'} />
}

function formatRunway(runway) {
  if (runway == null) return null
  return `${runway.toFixed(1)} years (${Math.round(runway * 12)} months)`
}

export function TerminalRedFlagCard({ result }) {
  if (!result) return null
  const runwayStr = result.runway != null ? formatRunway(result.runway) : null
  return (
    <AlertCard severity={result.severity} title={result.title} text={result.text} defaultCollapsed={result.severity === 'pass'}>
      {runwayStr && result.triggered && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cash Runway</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: result.severity === 'danger' ? '#dc2626' : '#ca8a04' }}>{runwayStr}</span>
        </div>
      )}
    </AlertCard>
  )
}

export function AssessmentModulesAB({ adoption, redFlag }) {
  if (!adoption && !redFlag) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {adoption && <AdoptionCheckCard result={adoption} />}
      {redFlag   && <TerminalRedFlagCard result={redFlag} />}
    </div>
  )
}
