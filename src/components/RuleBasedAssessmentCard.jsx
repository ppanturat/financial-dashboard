import { runAdvancedDiagnostics } from '../lib/metricsSummary'

function buildParagraph(metrics = {}) {
  // (Keep your existing buildParagraph logic exactly as it was)
  const parts = []
  let bullScore = 0, bearScore = 0

  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  if (wcr != null) {
    if (wcr >= 2) { bullScore += 2; parts.push(`The balance sheet is in excellent shape, with a cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x.`) }
    else if (wcr >= 1) { bullScore += 1; parts.push(`The balance sheet is solid, with cash fully covering total debt (${wcr.toFixed(2)}x ratio).`) }
    else if (wcr >= 0.5) { bearScore += 1; parts.push(`The balance sheet shows some leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of total debt.`) }
    else { bearScore += 2; parts.push(`The balance sheet carries meaningful leverage risk: cash covers just ${(wcr * 100).toFixed(0)}% of total debt.`) }
  }

  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { bullScore += 2; parts.push(`Free cash flow is a standout strength at $${b.toFixed(1)}B annually.`) }
    else if (fcf > 0) { bullScore += 1; parts.push(`The business generates positive free cash flow of $${b.toFixed(2)}B.`) }
    else if (fcf > -1e9) { bearScore += 1; parts.push(`Free cash flow is currently negative at $${b.toFixed(2)}B.`) }
    else { bearScore += 2; parts.push(`The company is burning $${Math.abs(b).toFixed(1)}B in free cash flow annually.`) }
  }

  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { bullScore += 2; parts.push(`With a gross margin of ${pct}%, the business exhibits exceptional pricing power.`) }
    else if (gm > 0.3) { bullScore += 1; parts.push(`A gross margin of ${pct}% reflects a healthy spread.`) }
    else if (gm > 0.1) { bearScore += 1; parts.push(`At ${pct}% gross margin, the business operates on relatively thin spreads.`) }
    else { bearScore += 2; parts.push(`The ${pct}% gross margin is concerning.`) }
  }

  if (pe != null && pe > 0) {
    if (pe < 15) { bullScore += 2; parts.push(`At a forward P/E of ${pe.toFixed(1)}x, the valuation appears attractive.`) }
    else if (pe < 30) { bullScore += 1; parts.push(`The forward P/E of ${pe.toFixed(1)}x is reasonable.`) }
    else if (pe < 50) { bearScore += 1; parts.push(`Trading at a forward P/E of ${pe.toFixed(1)}x, the valuation embeds significant growth expectations.`) }
    else { bearScore += 2; parts.push(`A forward P/E of ${pe.toFixed(1)}x prices in near-perfect execution.`) }
  }

  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { bullScore += 2; parts.push(`Revenue growth of ${pct}% YoY puts this firmly in hypergrowth territory.`) }
    else if (rev > 0.08) { bullScore += 1; parts.push(`Year-over-year revenue growth of ${pct}% is healthy.`) }
    else if (rev >= 0) { parts.push(`Revenue growth has slowed to ${pct}% YoY.`) }
    else { bearScore += 2; parts.push(`Revenue contracted ${Math.abs(pct)}% YoY.`) }
  }

  const fcfWeight = fcf != null ? (fcf > 5e9 ? 2 : fcf > 0 ? 1 : fcf > -1e9 ? -1 : -2) : 0
  const gmWeight  = gm != null ? (gm > 0.6 ? 2 : gm > 0.3 ? 1 : gm > 0.1 ? -1 : -2) : 0
  const wcrWeight = wcr != null ? (wcr >= 2 ? 2 : wcr >= 1 ? 1 : wcr >= 0.5 ? -1 : -2) : 0
  const peWeight  = (pe != null && pe > 0) ? (pe < 15 ? 2 : pe < 30 ? 1 : pe < 50 ? -1 : -2) : 0
  const revWeight = rev != null ? (rev > 0.25 ? 2 : rev > 0.08 ? 1 : rev >= 0 ? 0 : -2) : 0

  const weightedNet = (fcfWeight * 1.5) + (gmWeight * 1.5) + wcrWeight + peWeight + revWeight
  const weightedMax = 13.0
  const rawScore = Math.round(50 + (weightedNet / weightedMax) * 45)
  const score = Math.min(97, Math.max(10, rawScore))

  let verdict, verdictColor
  if (score >= 80)      { verdict = 'Strong Buy';    verdictColor = '#16a34a' }
  else if (score >= 68) { verdict = 'Bullish';       verdictColor = '#22c55e' }
  else if (score >= 52) { verdict = 'Neutral';       verdictColor = '#ca8a04' }
  else if (score >= 38) { verdict = 'Caution';       verdictColor = '#ea580c' }
  else                  { verdict = 'Risk Elevated'; verdictColor = '#dc2626' }

  return { paragraph: parts.join(' '), verdict, score, verdictColor }
}

function buildEtfNarrative(ticker, holdings) {
  // Defensive guard for ETF arrays
  if (!Array.isArray(holdings) || holdings.length === 0) return null

  const top10Weight = holdings.slice(0, 10).reduce((s, h) => s + (h.weight || 0), 0)
  const top1Weight = holdings[0]?.weight || 0

  const lines = []
  
  if (top1Weight > 0.10) {
    lines.push(`⚠ Notably concentrated: The top holding alone accounts for ${(top1Weight * 100).toFixed(1)}% of assets. Single-stock risk is elevated.`)
  } else if (top10Weight > 0.5) {
    lines.push(`⚠ Moderately top-heavy: The top 10 names make up ${(top10Weight * 100).toFixed(0)}% of the fund.`)
  } else {
    lines.push(`✓ Well-diversified: The top 10 names represent just ${(top10Weight * 100).toFixed(0)}% of assets.`)
  }

  return lines
}

function EtfHoldingsBreakdown({ holdings }) {
  if (!Array.isArray(holdings) || holdings.length === 0) return null
  const topHoldings = holdings.slice(0, 10)
  const maxPct = topHoldings[0]?.weight || 1
  const BAR_COLORS = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff']

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Top Holdings
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {topHoldings.map((h, i) => (
          <div key={h.ticker || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 52, flexShrink: 0 }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${(h.weight / maxPct) * 100}%`, background: BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1] }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', minWidth: 38, textAlign: 'right', flexShrink: 0 }}>{(h.weight * 100).toFixed(1)}%</span>
            {h.name && <span style={{ fontSize: 11, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, flexShrink: 1 }}>{h.name}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, etfHoldings, loading }) {
  if (loading) return null

  if (isEtf) {
    const hasHoldings = Array.isArray(etfHoldings) && etfHoldings.length > 0
    const narrative = hasHoldings ? buildEtfNarrative(ticker, etfHoldings) : null

    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--text)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#111', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Fund Analysis</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>{ticker} · ETF</span>
        </div>
        {narrative ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {narrative.map((line, i) => <p key={i} style={{ fontSize: 13.5, color: line.includes('⚠') ? '#b45309' : '#15803d', fontWeight: 500, margin: 0 }}>{line}</p>)}
          </div>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>Holdings data temporarily unavailable for this ETF.</p>
        )}
        {hasHoldings && <EtfHoldingsBreakdown holdings={etfHoldings} />}
      </div>
    )
  }

  const result = buildParagraph(metrics)
  if (!result) return null

  const diagnostics = runAdvancedDiagnostics(metrics)
  const { paragraph, verdict, score, verdictColor } = result

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${verdictColor}`, borderRadius: 'var(--r)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Quantitative Assessment</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>{ticker}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, color: verdictColor, background: verdictColor + '18', border: `1px solid ${verdictColor}44` }}>{verdict}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>{score}/100</span>
        </div>
      </div>

      {diagnostics.redFlags.length > 0 && (
        <div style={{ padding: '12px', background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terminal Red Flags</h4>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#b91c1c', fontSize: '13px', lineHeight: 1.5 }}>
            {diagnostics.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}

      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', margin: 0 }}>{paragraph}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
        <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>Bull Probability</span>
          <span style={{ fontSize: '20px', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#15803d' }}>{diagnostics.bullProbability}%</span>
        </div>
        <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Bear Probability</span>
          <span style={{ fontSize: '20px', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#334155' }}>{diagnostics.bearProbability}%</span>
        </div>
      </div>
      
    </div>
  )
}