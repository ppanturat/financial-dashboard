// generates a comprehensive hardcoded assessment from raw metric values.
// used as the primary summary — shown even when the ai quota is exhausted.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// scores each metric 0–100 and returns a label + colour
function scoreWarChest(v) {
  if (v == null) return null
  if (v >= 3)   return { score: 95, label: 'Exceptional', color: 'green', note: 'Cash reserves dwarf total debt — near-zero financial distress risk.' }
  if (v >= 1.5) return { score: 80, label: 'Strong',      color: 'green', note: 'Cash comfortably exceeds debt obligations.' }
  if (v >= 1)   return { score: 65, label: 'Healthy',     color: 'green', note: 'Cash covers debt. Balance sheet is in good shape.' }
  if (v >= 0.7) return { score: 50, label: 'Adequate',    color: '',      note: 'Cash slightly below debt — manageable but worth watching.' }
  if (v >= 0.5) return { score: 35, label: 'Thin',        color: 'yellow', note: 'Limited cash buffer relative to debt load. Tightening conditions could pressure liquidity.' }
  if (v >= 0.2) return { score: 20, label: 'Stressed',    color: 'red',   note: 'Cash covers less than half of debt. Refinancing risk is elevated.' }
  return          { score: 8,  label: 'Critical',    color: 'red',   note: 'Dangerously low cash-to-debt. High risk of financial distress or dilutive capital raise.' }
}

function scoreFcf(v) {
  if (v == null) return null
  const b = v / 1e9
  if (b >= 20)  return { score: 98, label: 'Exceptional', color: 'green', note: `FCF of $${b.toFixed(1)}B — massive capital generation machine.` }
  if (b >= 5)   return { score: 88, label: 'Very Strong', color: 'green', note: `FCF of $${b.toFixed(1)}B — company self-funds growth with ease.` }
  if (b >= 1)   return { score: 75, label: 'Strong',      color: 'green', note: `FCF of $${b.toFixed(1)}B — healthy cash generation supporting operations and returns.` }
  if (b >= 0.1) return { score: 60, label: 'Positive',    color: 'green', note: `Positive FCF — operations generating more cash than they consume.` }
  if (b >= 0)   return { score: 45, label: 'Breakeven',   color: '',      note: 'Near-zero FCF — barely covering operational cash needs.' }
  if (b >= -0.5) return { score: 30, label: 'Burning',    color: 'yellow', note: `Negative FCF of ${b.toFixed(2)}B — burning cash. Sustainable only with strong growth or reserves.` }
  if (b >= -2)   return { score: 15, label: 'High Burn',  color: 'red',   note: `Significant cash burn of $${Math.abs(b).toFixed(1)}B — survival depends on continued funding.` }
  return           { score: 5,  label: 'Severe Burn', color: 'red',   note: `Extreme cash burn of $${Math.abs(b).toFixed(1)}B — existential risk without immediate capital.` }
}

function scoreGrossMargin(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 70) return { score: 95, label: 'World-Class', color: 'green', note: `${pct.toFixed(1)}% gross margin — software/luxury-tier pricing power.` }
  if (pct >= 50) return { score: 82, label: 'Excellent',   color: 'green', note: `${pct.toFixed(1)}% gross margin — strong pricing power and low unit costs.` }
  if (pct >= 35) return { score: 65, label: 'Good',        color: 'green', note: `${pct.toFixed(1)}% gross margin — solid for most sectors.` }
  if (pct >= 20) return { score: 48, label: 'Average',     color: '',      note: `${pct.toFixed(1)}% gross margin — typical for manufacturing or retail.` }
  if (pct >= 10) return { score: 30, label: 'Thin',        color: 'yellow', note: `${pct.toFixed(1)}% gross margin — minimal pricing power. Cost discipline is critical.` }
  if (pct >= 0)  return { score: 15, label: 'Razor-Thin',  color: 'red',   note: `${pct.toFixed(1)}% gross margin — nearly no room for error on costs.` }
  return           { score: 5,  label: 'Negative',    color: 'red',   note: `Negative gross margin — selling below cost. Unsustainable without rapid improvement.` }
}

function scoreForwardPE(v) {
  if (v == null) return null
  if (v <= 0)   return { score: 20, label: 'Loss-Making',  color: 'red',   note: 'Negative earnings — no meaningful P/E. Profitability is the core challenge.' }
  if (v < 10)   return { score: 88, label: 'Deep Value',   color: 'green', note: `P/E of ${v.toFixed(1)}× — priced at a significant discount to historical norms.` }
  if (v < 15)   return { score: 80, label: 'Cheap',        color: 'green', note: `P/E of ${v.toFixed(1)}× — below market average. Potential value opportunity.` }
  if (v < 20)   return { score: 68, label: 'Fair',         color: '',      note: `P/E of ${v.toFixed(1)}× — in line with broad market average.` }
  if (v < 30)   return { score: 55, label: 'Moderate',     color: '',      note: `P/E of ${v.toFixed(1)}× — modest premium. Requires consistent earnings delivery.` }
  if (v < 40)   return { score: 40, label: 'Premium',      color: 'yellow', note: `P/E of ${v.toFixed(1)}× — richly valued. Market expects strong growth execution.` }
  if (v < 60)   return { score: 25, label: 'Expensive',    color: 'red',   note: `P/E of ${v.toFixed(1)}× — expensive. Any miss in expectations could cause significant drawdown.` }
  return           { score: 10, label: 'Extreme',      color: 'red',   note: `P/E of ${v.toFixed(1)}× — priced for perfection. High risk of multiple compression.` }
}

function scoreRevenueYoY(v) {
  if (v == null) return null
  const pct = v * 100
  if (pct >= 50) return { score: 98, label: 'Hypergrowth',  color: 'green', note: `${pct.toFixed(1)}% YoY growth — hypergrowth stage. Execution and margin trajectory are key.` }
  if (pct >= 25) return { score: 88, label: 'Very High',    color: 'green', note: `${pct.toFixed(1)}% YoY growth — well above market rate. Strong demand signal.` }
  if (pct >= 15) return { score: 75, label: 'High',         color: 'green', note: `${pct.toFixed(1)}% YoY growth — outpacing most peers.` }
  if (pct >= 8)  return { score: 60, label: 'Healthy',      color: 'green', note: `${pct.toFixed(1)}% YoY growth — solid, above-inflation growth.` }
  if (pct >= 3)  return { score: 48, label: 'Modest',       color: '',      note: `${pct.toFixed(1)}% YoY growth — steady but low. Watch for deceleration.` }
  if (pct >= 0)  return { score: 35, label: 'Flat',         color: 'yellow', note: `${pct.toFixed(1)}% YoY growth — near stagnation. Pricing power or market share may be eroding.` }
  if (pct >= -10) return { score: 20, label: 'Declining',   color: 'red',   note: `${pct.toFixed(1)}% YoY — revenue contracting. Structural or cyclical headwind present.` }
  return            { score: 8,  label: 'Collapsing',   color: 'red',   note: `${pct.toFixed(1)}% YoY — severe revenue contraction. Business model under serious threat.` }
}

// builds the overall verdict from the composite score
function buildVerdict(score, scores) {
  const redFlags = scores.filter(s => s?.color === 'red').length
  const yellows  = scores.filter(s => s?.color === 'yellow').length
  const greens   = scores.filter(s => s?.color === 'green').length
  const available = scores.filter(Boolean).length

  if (available === 0) return { label: 'Insufficient Data', color: 'neutral', text: 'Not enough metrics available to form a meaningful assessment.' }

  if (score >= 80 && redFlags === 0) return {
    label: 'Strong Buy Signal', color: 'green',
    text: `Across ${greens} of ${available} available metrics, this company shows institutional-grade financial health. No red flags detected.`
  }
  if (score >= 65 && redFlags === 0) return {
    label: 'Positive Outlook', color: 'green',
    text: `Financial fundamentals are broadly healthy with ${greens} green signals. Minor areas to monitor but no critical concerns.`
  }
  if (score >= 50 && redFlags <= 1) return {
    label: 'Mixed but Stable', color: 'neutral',
    text: `A balanced picture — ${greens} strengths offset by ${yellows + redFlags} cautionary signals. Suitable for position sizing with active monitoring.`
  }
  if (score >= 35 && redFlags <= 2) return {
    label: 'Proceed with Caution', color: 'yellow',
    text: `${yellows} caution flags and ${redFlags} red flag(s) detected. Risk is elevated — only suitable for higher-risk portfolios with conviction.`
  }
  if (redFlags >= 3) return {
    label: 'High Risk', color: 'red',
    text: `${redFlags} critical red flags detected. Multiple dimensions of financial stress simultaneously — institutional risk managers would flag this position.`
  }
  return {
    label: 'Below Average', color: 'red',
    text: `Score of ${score}/100 — fundamentals are weak across multiple dimensions. Speculative at best without a clear catalyst for improvement.`
  }
}

export function generateMetricsSummary(metrics) {
  if (!metrics) return null

  const warChest = scoreWarChest(metrics.war_chest_ratio)
  const fcf      = scoreFcf(metrics.fcf)
  const margin   = scoreGrossMargin(metrics.gross_margin)
  const pe       = scoreForwardPE(metrics.forward_pe)
  const growth   = scoreRevenueYoY(metrics.revenue_yoy)

  const scores   = [warChest, fcf, margin, pe, growth]
  const valid    = scores.filter(Boolean)
  const avgScore = valid.length
    ? Math.round(valid.reduce((sum, s) => sum + s.score, 0) / valid.length)
    : 0

  const verdict = buildVerdict(avgScore, scores)

  return {
    score: avgScore,
    verdict,
    items: [
      { key: 'war_chest_ratio', label: 'Balance Sheet',   result: warChest },
      { key: 'fcf',             label: 'Cash Generation', result: fcf      },
      { key: 'gross_margin',    label: 'Profitability',   result: margin   },
      { key: 'forward_pe',      label: 'Valuation',       result: pe       },
      { key: 'revenue_yoy',     label: 'Growth',          result: growth   },
    ],
  }
}
