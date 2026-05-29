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

  // Balance sheet
  if (wcr != null) {
    if (wcr >= 2) { bullScore += 2; parts.push(`The balance sheet is in excellent shape, with a cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x — meaning the company holds significantly more cash than debt and faces minimal financial distress risk.`) }
    else if (wcr >= 1) { bullScore += 1; parts.push(`The balance sheet is solid, with cash fully covering total debt (${wcr.toFixed(2)}x ratio), leaving the company well-positioned to manage its obligations.`) }
    else if (wcr >= 0.5) { bearScore += 1; parts.push(`The balance sheet shows some leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of total debt — manageable for now, but worth monitoring in a rising rate environment.`) }
    else { bearScore += 2; parts.push(`The balance sheet carries meaningful leverage risk: cash covers just ${(wcr * 100).toFixed(0)}% of total debt, which could constrain financial flexibility or force dilutive capital raises.`) }
  }

  // Free cash flow
  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { bullScore += 2; parts.push(`Free cash flow is a standout strength at $${b.toFixed(1)}B annually, giving the company ample firepower to self-fund growth, return capital to shareholders, and weather downturns without tapping debt markets.`) }
    else if (fcf > 0) { bullScore += 1; parts.push(`The business generates positive free cash flow of $${b.toFixed(2)}B, confirming that operations are self-sustaining and cash is accumulating rather than being consumed.`) }
    else if (fcf > -1e9) { bearScore += 1; parts.push(`Free cash flow is currently negative at $${b.toFixed(2)}B, indicating the company is spending more than it earns from operations — acceptable in a high-growth phase, but a concern for mature businesses.`) }
    else { bearScore += 2; parts.push(`The company is burning $${Math.abs(b).toFixed(1)}B in free cash flow annually, a rate that raises questions about long-term capital sustainability and dependence on external financing.`) }
  }

  // Gross margin
  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { bullScore += 2; parts.push(`With a gross margin of ${pct}%, the business exhibits exceptional pricing power — a hallmark of software, pharma, or luxury-tier economics where customers pay a significant premium over cost.`) }
    else if (gm > 0.3) { bullScore += 1; parts.push(`A gross margin of ${pct}% reflects a healthy spread between revenue and cost of goods, indicating reasonable pricing power and operational efficiency.`) }
    else if (gm > 0.1) { bearScore += 1; parts.push(`At ${pct}% gross margin, the business operates on relatively thin spreads, leaving limited buffer against cost inflation or competitive pricing pressure.`) }
    else { bearScore += 2; parts.push(`The ${pct}% gross margin is concerning — there is very little room between revenue and cost of goods, which constrains the ability to invest in growth or absorb headwinds.`) }
  }

  // Forward P/E
  if (pe != null && pe > 0) {
    if (pe < 15) { bullScore += 2; parts.push(`At a forward P/E of ${pe.toFixed(1)}x, the valuation appears attractive relative to historical market averages, potentially offering a margin of safety for new entrants.`) }
    else if (pe < 30) { bullScore += 1; parts.push(`The forward P/E of ${pe.toFixed(1)}x is reasonable — the market is assigning a modest growth premium, but not one that requires heroic execution to justify.`) }
    else if (pe < 50) { bearScore += 1; parts.push(`Trading at a forward P/E of ${pe.toFixed(1)}x, the valuation embeds significant growth expectations. Any disappointment in earnings delivery could trigger a sharp de-rating.`) }
    else { bearScore += 2; parts.push(`A forward P/E of ${pe.toFixed(1)}x prices in near-perfect execution for years ahead. At these levels, the stock leaves very little margin of safety and is highly sensitive to macro or earnings surprises.`) }
  }

  // Revenue growth
  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { bullScore += 2; parts.push(`Revenue growth of ${pct}% YoY puts this firmly in hypergrowth territory — demand is accelerating and the company is clearly gaining market share or expanding its addressable market.`) }
    else if (rev > 0.08) { bullScore += 1; parts.push(`Year-over-year revenue growth of ${pct}% is healthy and above average, pointing to sustained demand and a business that continues to expand its footprint.`) }
    else if (rev >= 0) { parts.push(`Revenue growth has slowed to ${pct}% YoY — still positive, but the deceleration warrants attention and raises questions about whether the business is approaching saturation.`) }
    else { bearScore += 2; parts.push(`Revenue contracted ${Math.abs(pct)}% YoY, a clear sign of demand headwinds or market share erosion that will need to reverse before the fundamental outlook can improve.`) }
  }

  // Score and verdict — weighted: FCF and margin matter most
  const fcfWeight = fcf != null ? (fcf > 5e9 ? 2 : fcf > 0 ? 1 : fcf > -1e9 ? -1 : -2) : 0
  const gmWeight  = gm != null ? (gm > 0.6 ? 2 : gm > 0.3 ? 1 : gm > 0.1 ? -1 : -2) : 0
  const wcrWeight = wcr != null ? (wcr >= 2 ? 2 : wcr >= 1 ? 1 : wcr >= 0.5 ? -1 : -2) : 0
  const peWeight  = (pe != null && pe > 0) ? (pe < 15 ? 2 : pe < 30 ? 1 : pe < 50 ? -1 : -2) : 0
  const revWeight = rev != null ? (rev > 0.25 ? 2 : rev > 0.08 ? 1 : rev >= 0 ? 0 : -2) : 0

  // Weighted net: FCF + margin get 1.5x multiplier
  const weightedNet = (fcfWeight * 1.5) + (gmWeight * 1.5) + wcrWeight + peWeight + revWeight
  const weightedMax = 13.0 // max possible (2*1.5 + 2*1.5 + 2 + 2 + 2)
  const rawScore = Math.round(50 + (weightedNet / weightedMax) * 45)
  const score = Math.min(97, Math.max(10, rawScore))

  // Verdict — strictly score-driven so both cards agree directionally
  let verdict, verdictColor
  if (score >= 80)      { verdict = 'Strong Buy';    verdictColor = '#16a34a' }
  else if (score >= 68) { verdict = 'Bullish';       verdictColor = '#22c55e' }
  else if (score >= 52) { verdict = 'Neutral';       verdictColor = '#ca8a04' }
  else if (score >= 38) { verdict = 'Caution';       verdictColor = '#ea580c' }
  else                  { verdict = 'Risk Elevated'; verdictColor = '#dc2626' }

  const closers = {
    'Strong Buy':    'Taken together, the fundamentals present a compelling case — this is a well-run business with multiple financial strengths and no major red flags at this time.',
    'Bullish':       'On balance, the positives outweigh the negatives. The fundamental picture supports a constructive view, though active monitoring of the weaker areas remains prudent.',
    'Neutral':       'The overall picture is balanced — genuine strengths and real risks coexist. A position would need to be sized appropriately, with close attention paid to how the cautionary metrics evolve.',
    'Caution':       'The risk signals are material and should not be dismissed. Conviction would require either a significant margin of safety in the price or a clear near-term catalyst to reverse the weaker metrics.',
    'Risk Elevated': 'Multiple dimensions of financial stress are present simultaneously. This profile warrants significant caution — the downside risks appear to outweigh the potential upside under current conditions.',
  }

  return { paragraph: parts.join(' ') + ' ' + closers[verdict], verdict, score, verdictColor }
}

// ETF holdings breakdown component
function EtfHoldingsBreakdown({ holdings }) {
  if (!holdings?.length) return null

  const topHoldings = holdings.slice(0, 10)
  const maxPct = topHoldings[0]?.weight || 1

  const barColor = (i) => {
    const colors = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0']
    return colors[Math.min(i, colors.length - 1)]
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        Top Holdings
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {topHoldings.map((h, i) => (
          <div key={h.ticker || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700,
              color: 'var(--text)', minWidth: 52, flexShrink: 0,
            }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${(h.weight / maxPct) * 100}%`,
                background: barColor(i),
                transition: 'width .4s ease',
              }} />
            </div>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              color: 'var(--faint)', minWidth: 38, textAlign: 'right', flexShrink: 0,
            }}>{(h.weight * 100).toFixed(1)}%</span>
            {h.name && (
              <span style={{
                fontSize: 11, color: 'var(--faint)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 160, flexShrink: 1,
              }}>{h.name}</span>
            )}
          </div>
        ))}
      </div>
      {holdings.length > 10 && (
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8, fontStyle: 'italic' }}>
          +{holdings.length - 10} more holdings not shown
        </div>
      )}
    </div>
  )
}

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, etfHoldings, loading }) {
  if (loading) return null

  if (isEtf) {
    const hasHoldings = etfHoldings?.length > 0
    const totalShown = etfHoldings?.slice(0, 10).reduce((s, h) => s + (h.weight || 0), 0) || 0

    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '3px solid #475569', borderRadius: 'var(--r)',
        padding: '18px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#475569', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Fund Analysis
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {ticker} · ETF
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
          {hasHoldings
            ? `This ETF holds ${etfHoldings.length} positions. The top 10 holdings represent ${(totalShown * 100).toFixed(1)}% of fund assets. Evaluate this fund based on its expense ratio, underlying index methodology, tracking error, and sector or geographic exposure.`
            : 'ETF detected. Individual company metrics are not applicable. Evaluate this fund based on its expense ratio, underlying index methodology, tracking error, and sector or geographic exposure.'
          }
        </p>
        {hasHoldings && <EtfHoldingsBreakdown holdings={etfHoldings} />}
      </div>
    )
  }

  const result = buildParagraph(metrics)

  if (!result) return null

  const { paragraph, verdict, score, verdictColor } = result

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${verdictColor}`, borderRadius: 'var(--r)',
      padding: '18px 20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Quantitative Assessment
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {ticker} · Rule-Based Engine
          </span>
        </div>
        {/* Verdict chip + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            color: verdictColor,
            background: verdictColor + '18',
            border: `1px solid ${verdictColor}44`,
          }}>{verdict}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {score}/100
          </span>
        </div>
      </div>

      {/* The single paragraph */}
      <p style={{
        fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)',
        margin: 0,
      }}>
        {paragraph}
      </p>
    </div>
  )
}
