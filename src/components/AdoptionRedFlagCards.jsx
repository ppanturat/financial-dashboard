/**
 * AdoptionRedFlagCards.jsx
 *
 * Green line fix:
 * The previous borderLeft rendered as a standalone 4px coloured line between
 * sibling flex items in the .content column when the card was collapsed.
 * Because .content uses gap (not margin), and the card itself had no
 * background on the wrapper, the left border of the NEXT sibling appeared
 * as a floating line.
 *
 * Solution: Use borderTop accent ONLY. Remove all borderLeft usage.
 * Cards now have a solid white/bg background so there's nothing to bleed.
 */
import { useState } from 'react'

const SEVERITY = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🚨', badgeLabel: 'Critical Flag' },
  warning: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '⚠️',  badgeLabel: 'Warning'       },
  caution: { color: '#ca8a04', bg: '#fefce8', border: '#fde68a', icon: '🔶', badgeLabel: 'Caution'       },
  pass:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅', badgeLabel: 'Pass'          },
}

function AlertCard({ severity, title, text, children, defaultCollapsed = false }) {
  const cfg = SEVERITY[severity] ?? SEVERITY.caution
  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <div style={{
      // Solid backgrounds are critical — no transparent wrappers
      background: cfg.bg,
      border:    `1px solid ${cfg.border}`,
      // TOP accent only — prevents left-border line artifact between flex siblings
      borderTop: `3px solid ${cfg.color}`,
      borderRadius: 'var(--r, 10px)',
      overflow: 'hidden',
      // Ensure this element fully paints its background
      boxSizing: 'border-box',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '13px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
              {cfg.badgeLabel}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginTop: 2 }}>
              {title}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 12, color: cfg.color,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 15, color: '#374151', lineHeight: 1.65 }}>{text}</p>
          {children}
        </div>
      )}
    </div>
  )
}

export function AdoptionCheckCard({ result }) {
  if (!result) return null
  return (
    <AlertCard
      severity={result.severity}
      title={result.title}
      text={result.text}
      defaultCollapsed={result.severity === 'pass'}
    />
  )
}

function formatRunway(runway) {
  if (runway == null) return null
  return `${runway.toFixed(1)} years (${Math.round(runway * 12)} months)`
}

export function TerminalRedFlagCard({ result }) {
  if (!result) return null
  const runwayStr = result.runway != null ? formatRunway(result.runway) : null
  return (
    <AlertCard
      severity={result.severity}
      title={result.title}
      text={result.text}
      defaultCollapsed={result.severity === 'pass'}
    >
      {runwayStr && result.triggered && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 11, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cash Runway</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: result.severity === 'danger' ? '#dc2626' : '#ca8a04' }}>
            {runwayStr}
          </span>
        </div>
      )}
    </AlertCard>
  )
}

export function AssessmentModulesAB({ adoption, redFlag }) {
  if (!adoption && !redFlag) return null
  return (
    <>
      {adoption && <AdoptionCheckCard result={adoption} />}
      {redFlag   && <TerminalRedFlagCard result={redFlag} />}
    </>
  )
}
