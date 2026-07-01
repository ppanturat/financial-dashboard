/**
 * AiScanCard.jsx
 * Displays the AI-generated stock analysis from /api/ai/{ticker}
 * Shows verdict, bull/bear case, risks, and quality score.
 * Gracefully handles null (AI scan unavailable).
 */
import { useState } from 'react'

const VERDICT_CFG = {
  Bull:    { color: '#15803d', bg: '#f0fdf4', border: '#86efac', icon: '📈', label: 'Bullish' },
  Bear:    { color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', icon: '📉', label: 'Bearish' },
  Neutral: { color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', icon: '⚖️', label: 'Neutral' },
}

function QualityDots({ score }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: 2,
          background: i < score ? '#4f46e5' : '#e5e7eb',
          transition: 'background 0.2s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4, fontFamily: "var(--font-body),monospace" }}>
        {score}/10
      </span>
    </div>
  )
}

function ConfidencePips({ confidence }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < confidence ? '#f59e0b' : '#e5e7eb',
        }} />
      ))}
    </div>
  )
}

function CaseList({ items, accent }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
          <span style={{ color: accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function SkeletonScan() {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '18px 20px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 90, height: 28, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
      </div>
    </div>
  )
}

export function AiScanCard({ aiScan, loading }) {
  const [expanded, setExpanded] = useState(true)

  if (loading) return <SkeletonScan />
  if (!aiScan || aiScan.error) return null

  const cfg = VERDICT_CFG[aiScan.verdict] ?? VERDICT_CFG.Neutral

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${cfg.border}`,
      borderTop: `3px solid ${cfg.color}`,
      borderRadius: 12,
      padding: '16px 18px',
      marginBottom: 16,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Verdict badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 8, padding: '4px 12px',
            fontWeight: 800, fontSize: 13, color: cfg.color,
            fontFamily: "var(--font-body), sans-serif",
          }}>
            {cfg.icon} AI {cfg.label}
          </span>

          {/* Confidence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Confidence</span>
            <ConfidencePips confidence={aiScan.confidence ?? 0} />
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7,
            padding: '4px 10px', cursor: 'pointer', fontSize: 11,
            color: '#6b7280', fontWeight: 600, fontFamily: "var(--font-body), sans-serif",
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
          <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▼</span>
        </button>
      </div>

      {/* One-liner */}
      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.5 }}>
        {aiScan.one_liner}
      </p>

      {expanded && (
        <>
          {/* Bull / Bear grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* Bull case */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
                📈 Bull Case
              </div>
              <CaseList items={aiScan.bull_case ?? []} accent="#15803d" />
            </div>

            {/* Bear case */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
                📉 Bear Case
              </div>
              <CaseList items={aiScan.bear_case ?? []} accent="#b91c1c" />
            </div>
          </div>

          {/* Valuation comment */}
          {aiScan.valuation_comment && (
            <div style={{
              background: '#fafaf9', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '9px 13px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>💰</span>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{aiScan.valuation_comment}</p>
            </div>
          )}

          {/* Key risks */}
          {aiScan.key_risks?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>
                ⚠️ Key Risks
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {aiScan.key_risks.map((risk, i) => (
                  <span key={i} style={{
                    background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 99,
                    padding: '3px 10px', fontSize: 12, color: '#92400e', fontWeight: 500,
                  }}>{risk}</span>
                ))}
              </div>
            </div>
          )}

          {/* Business quality score */}
          {aiScan.quality_score != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px solid #f0ede8' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Business Quality</span>
              <QualityDots score={aiScan.quality_score} />
            </div>
          )}
        </>
      )}

      {/* AI disclaimer */}
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f0ede8' }}>
        AI-generated analysis — not financial advice. Based on publicly available data only.
      </div>
    </div>
  )
}
