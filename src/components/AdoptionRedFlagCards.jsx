/**
 * AdoptionRedFlagCards.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders Module A (Adoption Reality Check) and Module B (Terminal Red Flag)
 * output from assessmentEngine.js.
 *
 * Both components are purely display — they receive pre-computed result objects
 * and render them. No API calls, no LLM, no side effects.
 *
 * Usage:
 *   import { runAdoptionCheck, runTerminalRedFlagSweep } from '../lib/assessmentEngine'
 *   const adoption = runAdoptionCheck(metrics)
 *   const redFlag  = runTerminalRedFlagSweep(metrics)
 *
 *   <AdoptionCheckCard result={adoption} />
 *   <TerminalRedFlagCard result={redFlag} />
 */

// ── Shared: severity config ───────────────────────────────────────────────────
const SEVERITY = {
  danger: {
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    icon: '🚨', badgeLabel: 'Critical Flag',
  },
  warning: {
    color: '#ea580c', bg: '#fff7ed', border: '#fdba74',
    icon: '⚠️', badgeLabel: 'Warning',
  },
  caution: {
    color: '#ca8a04', bg: '#fefce8', border: '#fde68a',
    icon: '🔶', badgeLabel: 'Caution',
  },
  pass: {
    color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
    icon: '✅', badgeLabel: 'Pass',
  },
}

// ── Shared card shell ─────────────────────────────────────────────────────────
function AlertCard({ severity, title, text, children }) {
  const cfg = SEVERITY[severity] ?? SEVERITY.caution
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {cfg.badgeLabel}
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
            {title}
          </div>
        </div>
      </div>

      {/* Body text */}
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
        {text}
      </p>

      {/* Optional extra content */}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module A — Adoption Reality Check
// ─────────────────────────────────────────────────────────────────────────────
export function AdoptionCheckCard({ result }) {
  if (!result) return null
  return (
    <AlertCard
      severity={result.severity}
      title={result.title}
      text={result.text}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Module B — Terminal Red Flag Sweep
// ─────────────────────────────────────────────────────────────────────────────

/** Formats years as "X.X years (N months)" */
function formatRunway(runway) {
  if (runway == null) return null
  const yrs = runway.toFixed(1)
  const mos = Math.round(runway * 12)
  return `${yrs} years (${mos} months)`
}

export function TerminalRedFlagCard({ result }) {
  if (!result) return null

  const runwayStr = result.runway != null ? formatRunway(result.runway) : null

  return (
    <AlertCard
      severity={result.severity}
      title={result.title}
      text={result.text}
    >
      {/* Runway pill — only for cases with meaningful FCF burn */}
      {runwayStr && result.triggered && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 10, color: '#6b6a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cash Runway
          </span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 12, fontWeight: 700,
            color: result.severity === 'danger' ? '#dc2626' : '#ca8a04',
          }}>
            {runwayStr}
          </span>
        </div>
      )}
    </AlertCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: renders both modules stacked
// ─────────────────────────────────────────────────────────────────────────────
export function AssessmentModulesAB({ adoption, redFlag }) {
  if (!adoption && !redFlag) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {adoption && <AdoptionCheckCard result={adoption} />}
      {redFlag   && <TerminalRedFlagCard result={redFlag} />}
    </div>
  )
}
