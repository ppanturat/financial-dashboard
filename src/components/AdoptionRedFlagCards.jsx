/**
 * AdoptionRedFlagCards.jsx
 *
 * FIX: Removed borderLeft entirely. It was rendering as a standalone coloured
 * line between cards in the flex content column because:
 *   1. The border renders OUTSIDE the background box
 *   2. When gap spacing separates cards, the border of one card visually
 *      floats in the gap between it and the next card
 *
 * Solution: borderTop accent only. The card always has a solid background
 * so there is nothing to bleed between siblings.
 */
import { useState } from 'react'

const SEVERITY = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '🚨', badgeLabel: 'Critical Flag' },
  warning: { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', icon: '⚠️',  badgeLabel: 'Warning'       },
  caution: { color: '#ca8a04', bg: '#fefce8', border: '#fde68a', icon: '🔶', badgeLabel: 'Caution'       },
  pass:    { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✅', badgeLabel: 'Pass'          },
}

function AlertCard({ severity, title, text, children }) {
  const cfg = SEVERITY[severity] ?? SEVERITY.caution

  return (
    <div style={{
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      // FIX: borderTop only — never borderLeft
      borderTop:    `3px solid ${cfg.color}`,
      borderRadius: 8,
      padding:      '14px 16px',
      display:      'flex',
      flexDirection:'column',
      gap:          10,
      // Explicit box-sizing ensures the background always fills the full box
      boxSizing:    'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {cfg.badgeLabel}
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
            {title}
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{text}</p>
      {children}
    </div>
  )
}

export function AdoptionCheckCard({ result }) {
  if (!result) return null
  return <AlertCard severity={result.severity} title={result.title} text={result.text} />
}

function formatRunway(runway) {
  if (runway == null) return null
  return `${runway.toFixed(1)} years (${Math.round(runway * 12)} months)`
}

export function TerminalRedFlagCard({ result }) {
  if (!result) return null
  const runwayStr = result.runway != null ? formatRunway(result.runway) : null
  return (
    <AlertCard severity={result.severity} title={result.title} text={result.text}>
      {runwayStr && result.triggered && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cash Runway</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: result.severity === 'danger' ? '#dc2626' : '#ca8a04' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {adoption && <AdoptionCheckCard result={adoption} />}
      {redFlag   && <TerminalRedFlagCard result={redFlag} />}
    </div>
  )
}
