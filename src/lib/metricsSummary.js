// ── Rule-Based Fundamental Assessment ────────────────────────────────────────
// Comprehensive scoring engine — no AI required.
// Each dimension scores 0–100 and returns a label, colour, and analyst note.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ── Individual Scorers ────────────────────────────────────────────────────────

function scoreWarChest(v) {
  if (v == null) return null
  if (v >= 3)   return { score: 95, label: 'Exceptional',  color: 'green',  note: 'Cash reserves dwarf total debt — near-zero financial distress risk.' }
  if (v >= 1.5) return { score: 80, label: 'Strong',       color: 'green',  note: 'Cash comfortably exceeds debt obligations.' }
  if (v >= 1)   return { score: 65, label: 'Healthy',      color: 'green',  note: 'Cash covers debt. Balance sheet is in good shape.' }
  if (v >= 0.7) return { score: 50, label: 'Adequate',     color: '',       note: 'Cash slightly below debt — manageable but worth watching.' }
  if (v >= 0.5) return { score: 35, label: 'Thin',         color: 'yellow', note: 'Limited cash buffer relative to debt load. Tightening conditions could pressure liquidity.' }
  if (v >= 0.2) return { score: 20, label: 'Stressed',     color: 'red',    note: 'Cash covers less than half of debt. Refinancing risk is elevated.' }
  return          { score: 8,  label: 'Critical',      color: 'red',    note: 'Dangerously low cash-to-debt. High risk of financial distress or dilutive capital raise.' }
}

function scoreFcf(v) {
  if (v == null) return null
  const b = v / 1e9
  if (b >= 20)   return { score: 98, label: 'Exceptional', color: 'green',  note: `FCF of $${b.toFixed(1)}B — massive capital generation machine.` }
  if (b >= 5)    return { score: 88, label: 'Very Strong', color: 'green',  note: `FCF of $${b.toFixed(1)}B — company self-funds growth with ease.` }
  if (b >= 1)    return { score: 75, label: 'Strong',      color: 'green',  note: `FCF of $${b.toFixed(1)}B — healthy cash generation supporting operations and returns.` }
  if (b >= 0.1)  return { score: 60, label: 'Positive',    color: 'green',  note: 'Positive FCF — operations generating more cash than they consume.' }
  if (b >= 0)    return { score: 45, label: 'Breakeven',   color: '',       note: 'Near-zero FCF — barely covering operational cash needs.' }
  if (b >= -0.5) return { score: 30, label: 'Burning',     color: 'yellow', note: `Negative FCF of $${Math.abs(b).toFixed(2)}B — burning cash. Sustainable only with strong growth or reserves.` }
  if (b >= -2)   return { score: 15, label: 'High Burn',   color: 'red',    note: `Significant cash burn of $${Math.abs(b).toFixed(1)}B — survival depends on continued funding.` }
  return           { score: 5,  label: 'Severe Burn',  color: 'red',    note: `Extreme cash burn of $${Math.abs(b).toFixed(1)}B — existential risk without immediate capital.` }
}

function scoreGrossMargin(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 70) return { score: 95, label: 'World-Class', color: 'green',  note: `${pct.toFixed(1)}% gross margin — software/luxury-tier pricing power.` }
  if (pct >= 50) return { score: 82, label: 'Excellent',   color: 'green',  note: `${pct.toFixed(1)}% gross margin — strong pricing power and low unit costs.` }
  if (pct >= 35) return { score: 65, label: 'Good',        color: 'green',  note: `${pct.toFixed(1)}% gross margin — solid for most sectors.` }
  if (pct >= 20) return { score: 48, label: 'Average',     color: '',       note: `${pct.toFixed(1)}% gross margin — typical for manufacturing or retail.` }
  if (pct >= 10) return { score: 30, label: 'Thin',        color: 'yellow', note: `${pct.toFixed(1)}% gross margin — minimal pricing power. Cost discipline is critical.` }
  if (pct >= 0)  return { score: 15, label: 'Razor-Thin',  color: 'red',    note: `${pct.toFixed(1)}% gross margin — nearly no room for error on costs.` }
  return           { score: 5,  label: 'Negative',    color: 'red',    note: 'Negative gross margin — selling below cost. Unsustainable without rapid improvement.' }
}

function scoreOperatingMargin(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 30) return { score: 95, label: 'Elite',      color: 'green',  note: `${pct.toFixed(1)}% operating margin — best-in-class operational leverage.` }
  if (pct >= 20) return { score: 82, label: 'Strong',     color: 'green',  note: `${pct.toFixed(1)}% operating margin — efficient cost structure.` }
  if (pct >= 12) return { score: 65, label: 'Healthy',    color: 'green',  note: `${pct.toFixed(1)}% operating margin — comfortably profitable.` }
  if (pct >= 5)  return { score: 48, label: 'Adequate',   color: '',       note: `${pct.toFixed(1)}% operating margin — breakeven risk if top line softens.` }
  if (pct >= 0)  return { score: 30, label: 'Marginal',   color: 'yellow', note: `${pct.toFixed(1)}% operating margin — operating near breakeven.` }
  return           { score: 10, label: 'Operating Loss', color: 'red',  note: `${pct.toFixed(1)}% operating margin — spending more than earned from operations.` }
}

function scoreNetMargin(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 25) return { score: 95, label: 'Exceptional',  color: 'green',  note: `${pct.toFixed(1)}% net margin — premium earnings quality.` }
  if (pct >= 15) return { score: 82, label: 'Strong',       color: 'green',  note: `${pct.toFixed(1)}% net margin — high earnings retention.` }
  if (pct >= 8)  return { score: 65, label: 'Good',         color: 'green',  note: `${pct.toFixed(1)}% net margin — solid bottom-line performance.` }
  if (pct >= 3)  return { score: 45, label: 'Modest',       color: '',       note: `${pct.toFixed(1)}% net margin — any headwind could flip to red.` }
  if (pct >= 0)  return { score: 28, label: 'Near Zero',    color: 'yellow', note: `${pct.toFixed(1)}% net margin — barely profitable after all costs.` }
  return           { score: 8,  label: 'Loss-Making',   color: 'red',    note: `${pct.toFixed(1)}% net margin — net losses reduce shareholder equity.` }
}

function scoreForwardPE(v) {
  if (v == null) return null
  if (v <= 0)  return { score: 20, label: 'Loss-Making', color: 'red',    note: 'Negative earnings — no meaningful P/E. Profitability is the core challenge.' }
  if (v < 10)  return { score: 88, label: 'Deep Value',  color: 'green',  note: `P/E of ${v.toFixed(1)}× — priced at a significant discount to historical norms.` }
  if (v < 15)  return { score: 80, label: 'Cheap',       color: 'green',  note: `P/E of ${v.toFixed(1)}× — below market average. Potential value opportunity.` }
  if (v < 20)  return { score: 68, label: 'Fair',        color: '',       note: `P/E of ${v.toFixed(1)}× — in line with broad market average.` }
  if (v < 30)  return { score: 55, label: 'Moderate',    color: '',       note: `P/E of ${v.toFixed(1)}× — modest premium. Requires consistent earnings delivery.` }
  if (v < 40)  return { score: 40, label: 'Premium',     color: 'yellow', note: `P/E of ${v.toFixed(1)}× — richly valued. Market expects strong growth execution.` }
  if (v < 60)  return { score: 25, label: 'Expensive',   color: 'red',    note: `P/E of ${v.toFixed(1)}× — expensive. Any earnings miss risks a sharp drawdown.` }
  return         { score: 10, label: 'Extreme',      color: 'red',    note: `P/E of ${v.toFixed(1)}× — priced for perfection. High multiple compression risk.` }
}

function scorePSRatio(v) {
  if (v == null) return null
  if (v < 1)   return { score: 90, label: 'Deep Value',  color: 'green',  note: `P/S of ${v.toFixed(1)}× — potential undervaluation relative to revenue.` }
  if (v < 3)   return { score: 72, label: 'Reasonable',  color: 'green',  note: `P/S of ${v.toFixed(1)}× — fair revenue multiple for most sectors.` }
  if (v < 6)   return { score: 55, label: 'Moderate',    color: '',       note: `P/S of ${v.toFixed(1)}× — growth premium priced in.` }
  if (v < 12)  return { score: 38, label: 'Elevated',    color: 'yellow', note: `P/S of ${v.toFixed(1)}× — high expectations embedded in price.` }
  return         { score: 18, label: 'Extreme',      color: 'red',    note: `P/S of ${v.toFixed(1)}× — requires exceptional long-term revenue growth to justify.` }
}

function scorePBRatio(v) {
  if (v == null) return null
  if (v < 1)   return { score: 90, label: 'Below Book',  color: 'green',  note: `P/B of ${v.toFixed(1)}× — trading below net asset value, often a value signal.` }
  if (v < 2)   return { score: 75, label: 'Reasonable',  color: 'green',  note: `P/B of ${v.toFixed(1)}× — modest book premium.` }
  if (v < 4)   return { score: 55, label: 'Fair',        color: '',       note: `P/B of ${v.toFixed(1)}× — normal for asset-light or profitable businesses.` }
  if (v < 8)   return { score: 38, label: 'Elevated',    color: 'yellow', note: `P/B of ${v.toFixed(1)}× — significant goodwill/intangible premium.` }
  return         { score: 18, label: 'Extreme',      color: 'red',    note: `P/B of ${v.toFixed(1)}× — intangibles dominate or growth expectations are very high.` }
}

function scoreRevenueYoY(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 50)  return { score: 98, label: 'Hypergrowth', color: 'green',  note: `${pct.toFixed(1)}% YoY growth — hypergrowth stage. Execution and margin trajectory are key.` }
  if (pct >= 25)  return { score: 88, label: 'Very High',   color: 'green',  note: `${pct.toFixed(1)}% YoY — well above market rate. Strong demand signal.` }
  if (pct >= 15)  return { score: 75, label: 'High',        color: 'green',  note: `${pct.toFixed(1)}% YoY — outpacing most peers.` }
  if (pct >= 8)   return { score: 60, label: 'Healthy',     color: 'green',  note: `${pct.toFixed(1)}% YoY — solid, above-inflation growth.` }
  if (pct >= 3)   return { score: 48, label: 'Modest',      color: '',       note: `${pct.toFixed(1)}% YoY — steady but low. Watch for deceleration.` }
  if (pct >= 0)   return { score: 35, label: 'Flat',        color: 'yellow', note: `${pct.toFixed(1)}% YoY — near stagnation. Pricing power or market share may be eroding.` }
  if (pct >= -10) return { score: 20, label: 'Declining',   color: 'red',    note: `${pct.toFixed(1)}% YoY — revenue contracting. Structural or cyclical headwind present.` }
  return            { score: 8,  label: 'Collapsing',   color: 'red',    note: `${pct.toFixed(1)}% YoY — severe revenue contraction. Business model under serious threat.` }
}

function scoreEarningsYoY(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 50)  return { score: 98, label: 'Surging',    color: 'green',  note: `Earnings up ${pct.toFixed(1)}% YoY — accelerating profitability.` }
  if (pct >= 20)  return { score: 82, label: 'Strong',     color: 'green',  note: `Earnings up ${pct.toFixed(1)}% YoY — solid earnings momentum.` }
  if (pct >= 5)   return { score: 65, label: 'Growing',    color: 'green',  note: `Earnings up ${pct.toFixed(1)}% YoY — consistent improvement.` }
  if (pct >= 0)   return { score: 48, label: 'Flat',       color: '',       note: `Earnings near flat YoY — stagnant profitability growth.` }
  if (pct >= -20) return { score: 28, label: 'Declining',  color: 'yellow', note: `Earnings down ${Math.abs(pct).toFixed(1)}% YoY — compression underway.` }
  return            { score: 10, label: 'Collapsing',  color: 'red',    note: `Earnings down ${Math.abs(pct).toFixed(1)}% YoY — serious deterioration.` }
}

function scoreDebtToEquity(v) {
  if (v == null) return null
  // yfinance returns this as a percentage (e.g. 50 = 50%)
  const ratio = v / 100
  if (ratio < 0.3)  return { score: 92, label: 'Minimal',    color: 'green',  note: `D/E of ${ratio.toFixed(2)} — very low leverage, maximum financial flexibility.` }
  if (ratio < 0.75) return { score: 75, label: 'Conservative', color: 'green', note: `D/E of ${ratio.toFixed(2)} — conservative capital structure.` }
  if (ratio < 1.5)  return { score: 55, label: 'Moderate',   color: '',       note: `D/E of ${ratio.toFixed(2)} — manageable leverage.` }
  if (ratio < 3)    return { score: 35, label: 'Elevated',   color: 'yellow', note: `D/E of ${ratio.toFixed(2)} — high leverage amplifies downside risk.` }
  return              { score: 12, label: 'Excessive',   color: 'red',    note: `D/E of ${ratio.toFixed(2)} — debt load creates meaningful stress risk.` }
}

function scoreCurrentRatio(v) {
  if (v == null) return null
  if (v >= 3)   return { score: 88, label: 'Very Strong', color: 'green',  note: `Current ratio ${v.toFixed(1)} — ample short-term liquidity buffer.` }
  if (v >= 2)   return { score: 78, label: 'Strong',      color: 'green',  note: `Current ratio ${v.toFixed(1)} — healthy coverage of short-term obligations.` }
  if (v >= 1.5) return { score: 65, label: 'Healthy',     color: 'green',  note: `Current ratio ${v.toFixed(1)} — comfortable liquidity position.` }
  if (v >= 1)   return { score: 48, label: 'Adequate',    color: '',       note: `Current ratio ${v.toFixed(1)} — just covers short-term liabilities.` }
  return          { score: 18, label: 'Tight',         color: 'red',    note: `Current ratio ${v.toFixed(1)} — current liabilities exceed current assets. Liquidity risk.` }
}

function scoreROE(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 30)  return { score: 95, label: 'Exceptional',   color: 'green',  note: `ROE of ${pct.toFixed(1)}% — exceptional return on shareholder capital.` }
  if (pct >= 20)  return { score: 82, label: 'Strong',        color: 'green',  note: `ROE of ${pct.toFixed(1)}% — above-average capital efficiency.` }
  if (pct >= 12)  return { score: 65, label: 'Healthy',       color: 'green',  note: `ROE of ${pct.toFixed(1)}% — solid returns on equity.` }
  if (pct >= 5)   return { score: 45, label: 'Adequate',      color: '',       note: `ROE of ${pct.toFixed(1)}% — modest capital productivity.` }
  if (pct >= 0)   return { score: 25, label: 'Poor',          color: 'yellow', note: `ROE of ${pct.toFixed(1)}% — barely generating returns for shareholders.` }
  return            { score: 8,  label: 'Destroying Value', color: 'red',  note: `Negative ROE — losses eroding shareholder equity.` }
}

function scoreShortInterest(v) {
  if (v == null) return null
  if (v < 3)  return { score: 88, label: 'Low',          color: 'green',  note: `Short ratio of ${v.toFixed(1)} days — minimal short-seller conviction against this stock.` }
  if (v < 6)  return { score: 65, label: 'Moderate',     color: '',       note: `Short ratio of ${v.toFixed(1)} days — some skepticism but not alarming.` }
  if (v < 10) return { score: 40, label: 'Elevated',     color: 'yellow', note: `Short ratio of ${v.toFixed(1)} days — significant short interest. Potential squeeze or warning signal.` }
  return        { score: 15, label: 'High',          color: 'red',    note: `Short ratio of ${v.toFixed(1)} days — heavy short conviction. Market deeply skeptical of this stock.` }
}

// ── Weighted Composite Verdict ────────────────────────────────────────────────

function buildVerdict(score, allScores) {
  const redFlags  = allScores.filter(s => s?.color === 'red').length
  const yellows   = allScores.filter(s => s?.color === 'yellow').length
  const greens    = allScores.filter(s => s?.color === 'green').length
  const available = allScores.filter(Boolean).length

  if (available === 0) return {
    label: 'Insufficient Data', color: 'neutral',
    text: 'Not enough metrics available to form a meaningful assessment.'
  }

  if (score >= 82 && redFlags === 0) return {
    label: 'Strong Buy Signal', color: 'green',
    text: `${greens} of ${available} available metrics flash green with zero critical red flags. Institutional-grade financial health across balance sheet, profitability, and growth.`
  }
  if (score >= 68 && redFlags <= 1) return {
    label: 'Positive Outlook', color: 'green',
    text: `Broadly healthy fundamentals with ${greens} positive signals and only ${redFlags} concern(s). Well-positioned for continued performance barring macro shocks.`
  }
  if (score >= 52 && redFlags <= 2) return {
    label: 'Mixed but Stable', color: 'neutral',
    text: `A balanced picture — ${greens} strengths offset by ${yellows + redFlags} cautionary signals. Suitable for position sizing with active monitoring.`
  }
  if (score >= 36 && redFlags <= 3) return {
    label: 'Proceed with Caution', color: 'yellow',
    text: `${yellows} caution flags and ${redFlags} red flag(s) detected. Risk is elevated — only suitable for higher-risk portfolios with high conviction.`
  }
  if (redFlags >= 4) return {
    label: 'High Risk', color: 'red',
    text: `${redFlags} critical red flags detected simultaneously. Multiple dimensions of financial stress — institutional risk managers would flag or exit this position.`
  }
  return {
    label: 'Below Average', color: 'red',
    text: `Score of ${score}/100 — fundamentals are weak across multiple dimensions. Speculative at best without a clear catalyst for improvement.`
  }
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function generateMetricsSummary(metrics) {
  if (!metrics) return null

  // Core dimensions (always shown when data present)
  const warChest = scoreWarChest(metrics.war_chest_ratio)
  const fcf      = scoreFcf(metrics.fcf)
  const margin   = scoreGrossMargin(metrics.gross_margin)
  const opMargin = scoreOperatingMargin(metrics.operating_margin)
  const netMargin= scoreNetMargin(metrics.net_margin)
  const pe       = scoreForwardPE(metrics.forward_pe)
  const ps       = scorePSRatio(metrics.ps_ratio)
  const pb       = scorePBRatio(metrics.pb_ratio)
  const growth   = scoreRevenueYoY(metrics.revenue_yoy)
  const eGrowth  = scoreEarningsYoY(metrics.earnings_yoy)
  const dte      = scoreDebtToEquity(metrics.debt_to_equity)
  const cr       = scoreCurrentRatio(metrics.current_ratio)
  const roe      = scoreROE(metrics.roe)
  const short    = scoreShortInterest(metrics.short_ratio)

  // Weighted scoring: core fundamentals get more weight
  const weightedItems = [
    { result: warChest, weight: 1.5 },
    { result: fcf,      weight: 1.5 },
    { result: margin,   weight: 1.2 },
    { result: opMargin, weight: 1.2 },
    { result: netMargin,weight: 1.0 },
    { result: pe,       weight: 1.0 },
    { result: ps,       weight: 0.7 },
    { result: pb,       weight: 0.6 },
    { result: growth,   weight: 1.2 },
    { result: eGrowth,  weight: 1.0 },
    { result: dte,      weight: 1.0 },
    { result: cr,       weight: 0.9 },
    { result: roe,      weight: 1.0 },
    { result: short,    weight: 0.5 },
  ]

  const validItems = weightedItems.filter(i => i.result != null)
  const totalWeight = validItems.reduce((s, i) => s + i.weight, 0)
  const weightedScore = totalWeight > 0
    ? Math.round(validItems.reduce((s, i) => s + i.result.score * i.weight, 0) / totalWeight)
    : 0

  const allScores = weightedItems.map(i => i.result)
  const verdict = buildVerdict(weightedScore, allScores)

  return {
    score: weightedScore,
    verdict,
    items: [
      { key: 'war_chest_ratio',  label: 'Balance Sheet',         result: warChest  },
      { key: 'current_ratio',    label: 'Short-Term Liquidity',  result: cr        },
      { key: 'debt_to_equity',   label: 'Leverage',              result: dte       },
      { key: 'fcf',              label: 'Cash Generation',       result: fcf       },
      { key: 'gross_margin',     label: 'Gross Profitability',   result: margin    },
      { key: 'operating_margin', label: 'Operating Efficiency',  result: opMargin  },
      { key: 'net_margin',       label: 'Net Profitability',     result: netMargin },
      { key: 'roe',              label: 'Return on Equity',      result: roe       },
      { key: 'forward_pe',       label: 'P/E Valuation',         result: pe        },
      { key: 'ps_ratio',         label: 'P/S Valuation',         result: ps        },
      { key: 'pb_ratio',         label: 'P/B Valuation',         result: pb        },
      { key: 'revenue_yoy',      label: 'Revenue Growth',        result: growth    },
      { key: 'earnings_yoy',     label: 'Earnings Growth',       result: eGrowth   },
      { key: 'short_ratio',      label: 'Short Interest',        result: short     },
    ],
  }
}
