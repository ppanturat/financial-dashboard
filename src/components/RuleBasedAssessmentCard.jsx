import { getSegmentStyle } from '../lib/stockSegments'

function buildParagraph(metrics = {}) {
  const parts = []
  let bullScore = 0, bearScore = 0

  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  // Expanded Balance Sheet Logic
  if (wcr != null) {
    if (wcr >= 2) { 
      bullScore += 2; 
      parts.push(`The balance sheet is exceptionally resilient with a cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x. The firm is completely insulated from refinancing risks and possesses the optionality to pursue acquisitions or buybacks without tapping credit markets.`); 
    }
    else if (wcr >= 1) { 
      bullScore += 1; 
      parts.push(`The balance sheet is solid, with cash fully covering total debt (${wcr.toFixed(2)}x). This provides a comfortable buffer against credit market tightening.`); 
    }
    else if (wcr >= 0.5) { 
      bearScore += 1; 
      parts.push(`The balance sheet carries notable leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of total debt. While manageable in a stable environment, rising rates could pressure future refinancing efforts.`); 
    }
    else { 
      bearScore += 2; 
      parts.push(`The balance sheet presents severe leverage risk. Cash covers just ${(wcr * 100).toFixed(0)}% of total debt, heavily constraining financial flexibility and leaving the firm highly vulnerable to forced dilutive capital raises.`); 
    }
  }

  // Expanded Free Cash Flow Logic
  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { 
      bullScore += 2; 
      parts.push(`Free cash flow is a standout strength at $${b.toFixed(1)}B annually. This massive capital generation allows the company to self-fund aggressive growth while continually returning capital to shareholders.`); 
    }
    else if (fcf > 0) { 
      bullScore += 1; 
      parts.push(`The business generates a healthy $${b.toFixed(2)}B in positive free cash flow, confirming operations are self-sustaining without external capital reliance.`); 
    }
    else if (fcf > -1e9) { 
      bearScore += 1; 
      parts.push(`Operating at a free cash flow deficit of $${Math.abs(b).toFixed(2)}B. While common during high-growth phases, failure to inflect to profitability soon presents a structural risk.`); 
    }
    else { 
      bearScore += 2; 
      parts.push(`The company is burning a dangerous $${Math.abs(b).toFixed(1)}B in cash annually. This rapid capital destruction represents an existential risk if revenue growth decelerates or funding markets freeze.`); 
    }
  }

  // Expanded Gross Margin Logic
  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { 
      bullScore += 2; 
      parts.push(`With a gross margin of ${pct}%, the business exhibits world-class pricing power. This wide spread provides a deep structural moat against cost inflation.`); 
    }
    else if (gm > 0.3) { 
      bullScore += 1; 
      parts.push(`A gross margin of ${pct}% reflects solid operational efficiency and reasonable pricing power within its sector.`); 
    }
    else if (gm > 0.1) { 
      bearScore += 1; 
      parts.push(`Operating on thin ${pct}% gross margins leaves minimal room for error. The firm is highly sensitive to input cost inflation and competitive pricing pressures.`); 
    }
    else { 
      bearScore += 2; 
      parts.push(`The razor-thin ${pct}% gross margin is a major red flag, severely constraining the ability to invest in R&D or absorb any operational headwinds.`); 
    }
  }

  // Expanded Forward P/E Logic
  if (pe != null && pe > 0) {
    if (pe < 15) { 
      bullScore += 2; 
      parts.push(`Trading at a forward P/E of ${pe.toFixed(1)}x, the valuation offers a clear margin of safety. The market expects little, meaning any positive earnings surprise could trigger a strong re-rating.`); 
    }
    else if (pe < 30) { 
      bullScore += 1; 
      parts.push(`The forward P/E of ${pe.toFixed(1)}x assigns a modest growth premium that is reasonable, provided the company executes consistently.`); 
    }
    else if (pe < 50) { 
      bearScore += 1; 
      parts.push(`At ${pe.toFixed(1)}x forward earnings, the valuation embeds high expectations. Investors must be prepared for steep multiple compression if growth decelerates.`); 
    }
    else { 
      bearScore += 2; 
      parts.push(`A forward P/E of ${pe.toFixed(1)}x prices in near-perfect execution for years ahead. At these premium levels, the stock leaves zero margin for error and carries massive downside risk on any earnings miss.`); 
    }
  }

  // Expanded Revenue Growth Logic
  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { 
      bullScore += 2; 
      parts.push(`Revenue is compounding at a hypergrowth rate of ${pct}% YoY, indicating aggressive market share capture and immense product demand.`); 
    }
    else if (rev > 0.08) { 
      bullScore += 1; 
      parts.push(`Top-line growth of ${pct}% YoY is healthy, signaling sustained demand above general inflation levels.`); 
    }
    else if (rev >= 0) { 
      parts.push(`Revenue growth has stagnated at ${pct}% YoY. This deceleration warrants scrutiny to ensure the business is not hitting total addressable market saturation.`); 
    }
    else { 
      bearScore += 2; 
      parts.push(`Revenue actually contracted by ${Math.abs(pct)}% YoY. This is a severe demand headwind that must reverse before the fundamental outlook can improve.`); 
    }
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid #000000', borderRadius: 'var(--r)', padding: '18px 20px' }}>
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

  const { paragraph, verdict, score, verdictColor } = result

  return (
    // UI Update: Hardcoded black border applied here via borderLeft
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid #000000', borderRadius: 'var(--r)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
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

      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', margin: 0 }}>{paragraph}</p>
      
    </div>
  )
}