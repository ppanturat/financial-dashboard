function buildSignals(metrics = {}) {
  const score = { bull: 0, bear: 0 }
  const insights = []

  const pe = Number(metrics?.trailingPE ?? 0)
  const margin = Number(metrics?.profitMargins ?? 0)
  const roe = Number(metrics?.returnOnEquity ?? 0)
  const growth = Number(metrics?.revenueGrowth ?? 0)
  const debt = Number(metrics?.debtToEquity ?? 0)

  if (pe > 0 && pe < 25) {
    score.bull += 2
    insights.push('Valuation remains within a healthy range.')
  } else if (pe >= 40) {
    score.bear += 2
    insights.push('Premium valuation raises downside risk.')
  }

  if (margin > 0.2) {
    score.bull += 2
    insights.push('Strong profit margins indicate operational efficiency.')
  } else if (margin < 0.05) {
    score.bear += 1
    insights.push('Thin margins can pressure future earnings.')
  }

  if (roe > 0.15) {
    score.bull += 2
    insights.push('Return on equity signals strong capital efficiency.')
  }

  if (growth > 0.12) {
    score.bull += 2
    insights.push('Revenue growth trend is accelerating.')
  } else if (growth < 0) {
    score.bear += 2
    insights.push('Negative revenue growth trend detected.')
  }

  if (debt > 150) {
    score.bear += 2
    insights.push('Debt load is elevated relative to equity.')
  }

  const verdict = score.bull >= score.bear + 2
    ? 'Bullish setup'
    : score.bear >= score.bull + 2
      ? 'Risk elevated'
      : 'Balanced outlook'

  return { verdict, confidence: Math.min(95, 55 + score.bull * 7 - score.bear * 4), insights: insights.slice(0,4) }
}

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, loading }) {
  if (loading) return null

  const assessment = buildSignals(metrics)

  return (
    <div className="ai-card">
      <div className="ai-head">
        <span className="ai-badge">Rule-Based Assessment</span>
        <span className="ai-sub">{ticker} · Deterministic Signal Engine</span>
      </div>

      <div className="ai-body">
        {isEtf ? (
          <p>ETF detected. Portfolio-level diversification lowers single-company risk concentration.</p>
        ) : (
          <>
            <p><strong>Verdict:</strong> {assessment.verdict}</p>
            <p><strong>Confidence:</strong> {assessment.confidence}%</p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {assessment.insights.map((insight, idx) => (
                <div key={idx} className="metric-chip">• {insight}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
