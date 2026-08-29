// Altman Z-Score / Piotroski F-Score / Beneish M-Score — standalone quant
// model cards. Deliberately kept OUT of the RuleBasedAssessmentCard /
// MetricsSummaryCard 0-100 weighted score (see the note at the top of
// assessmentEngine.js's "module D" section) since these are categorical
// academic composite models, not continuous metrics on the same scale.
//
// border-top accent only — border-left floats visibly in flex gaps between
// cards (same convention as AdoptionRedFlagCards.jsx / ValuationBadge.jsx).
import {
  calculateAltmanZScore,
  calculatePiotroskiFScore,
  calculateBeneishMScore,
} from '../lib/assessmentEngine'

function QuantCard({ badge, title, color, mainValue, mainLabel, text, footnote }) {
  return (
    <div style={{
      background:   color + '0d',
      border:       `1px solid ${color}33`,
      borderTop:    `3px solid ${color}`,
      borderRadius: 8,
      padding:      '14px 16px',
      display:      'flex',
      flexDirection:'column',
      gap:          10,
      boxSizing:    'border-box',
      height:       '100%',
    }}>
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {badge}
        </span>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3, marginTop: 2 }}>
          {title}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 24, fontWeight: 800, color }}>
          {mainValue}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color, background: color + '18',
          border: `1px solid ${color}44`, borderRadius: 24, padding: '3px 10px',
        }}>
          {mainLabel}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>{text}</p>
      {footnote && <p style={{ margin: 0, fontSize: 10.5, color: '#6b6a65', fontStyle: 'italic', lineHeight: 1.5 }}>{footnote}</p>}
    </div>
  )
}

function PiotroskiTestList({ tests }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '3px 10px', marginTop: -4 }}>
      {tests.map(t => (
        <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: t.pass ? '#15803d' : '#9ca3af' }}>
          <span>{t.pass ? '✓' : '✕'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
        </div>
      ))}
    </div>
  )
}

export function QuantModelsCards({ altmanInputs, piotroskiInputs, beneishInputs, isEtf, loading }) {
  if (isEtf || loading) return null

  const z = calculateAltmanZScore(altmanInputs)
  const f = calculatePiotroskiFScore(piotroskiInputs)
  const m = calculateBeneishMScore(beneishInputs)

  // if none of the three could be computed (missing statement data for this
  // ticker), don't render an empty section
  if (!z && !f && !m) return null

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">Quant Models</span>
        <span style={{ fontSize: 12, color: 'var(--faint)', fontStyle: 'italic' }}>
          Altman Z · Piotroski F · Beneish M — academic composite models, informational only
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, alignItems: 'stretch' }}>
        {z && (
          <QuantCard
            badge="Altman Z-Score"
            title="Bankruptcy / Distress Risk"
            color={z.color}
            mainValue={z.score.toFixed(2)}
            mainLabel={z.label}
            text={z.text}
            footnote="Z > 2.99 Safe · 1.81–2.99 Grey · < 1.81 Distress"
          />
        )}

        {f && (
          <QuantCard
            badge="Piotroski F-Score"
            title="Fundamental Strength (YoY)"
            color={f.color}
            mainValue={`${f.score} / 9`}
            mainLabel={f.tier}
            text={f.text}
            footnote="8–9 Strong · 4–5 Average · 0–2 Weak"
          />
        )}

        {m && (
          <QuantCard
            badge="Beneish M-Score"
            title="Earnings Manipulation Risk"
            color={m.color}
            mainValue={m.score.toFixed(2)}
            mainLabel={m.flagged ? 'Flagged' : 'Clean'}
            text={m.text}
            footnote="M > -1.78 statistically flags elevated manipulation risk"
          />
        )}
      </div>

      {f && (
        <div style={{
          marginTop: 10, background: f.color + '0d', border: `1px solid ${f.color}33`,
          borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: f.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Piotroski Test Breakdown
          </div>
          <PiotroskiTestList tests={f.tests} />
        </div>
      )}
    </div>
  )
}
