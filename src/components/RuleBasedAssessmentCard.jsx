function buildSignals(metrics = {}) {
  const score = { bull: 0, bear: 0 }
  const insights = []

  const pe = Number(metrics?.trailingPE ?? metrics?.forwardPE ?? 0)
  const peg = Number(metrics?.peg ?? 0)
  const margin = Number(metrics?.profitMargins ?? 0)
  const roe = Number(metrics?.returnOnEquity ?? 0)
  const growth = Number(metrics?.revenueGrowth ?? 0)
  const debt = Number(metrics?.debtToEquity ?? 0)
  const fcf = Number(metrics?.fcf ?? 0)
  const wcr = Number(metrics?.war_chest_ratio ?? 0)
  const asset_turnover = Number(metrics?.assetTurnover ?? 1)

  // ===== VALUATION (P/E) =====
  if (pe > 0 && pe < 15) {
    score.bull += 3
    insights.push('🟢 Attractive valuation: P/E under 15 signals undervaluation.')
  } else if (pe >= 15 && pe < 25) {
    score.bull += 2
    insights.push('🟡 Fair valuation: P/E between 15-25 is reasonable for growth.')
  } else if (pe >= 25 && pe < 35) {
    score.bear += 1
    insights.push('🟠 Premium valuation: Higher P/E may limit upside potential.')
  } else if (pe >= 35) {
    score.bear += 3
    insights.push('🔴 Expensive valuation: P/E above 35 carries significant downside risk.')
  }

  // ===== PEG RATIO =====
  if (peg > 0 && peg < 1) {
    score.bull += 2
    insights.push('🟢 Strong PEG: Growth is priced reasonably relative to P/E.')
  }

  // ===== PROFITABILITY (Margins) =====
  if (margin > 0.3) {
    score.bull += 3
    insights.push('🟢 Excellent margins: >30% signals strong pricing power and efficiency.')
  } else if (margin > 0.15) {
    score.bull += 2
    insights.push('🟡 Solid margins: 15-30% indicates good operational leverage.')
  } else if (margin > 0.05) {
    score.bear += 1
    insights.push('🟠 Thin margins: <15% reduces earnings cushion and limits durability.')
  } else if (margin <= 0.05) {
    score.bear += 2
    insights.push('🔴 Weak margins: Very thin margins signal margin compression risks.')
  }

  // ===== RETURN ON EQUITY =====
  if (roe > 0.2) {
    score.bull += 3
    insights.push('🟢 Exceptional ROE: >20% shows outstanding capital efficiency.')
  } else if (roe > 0.15) {
    score.bull += 2
    insights.push('🟡 Strong ROE: 15-20% indicates good management capital allocation.')
  } else if (roe > 0.1) {
    score.bull += 1
    insights.push('🟠 Adequate ROE: 10-15% is moderate but acceptable.')
  } else if (roe > 0) {
    score.bear += 1
    insights.push('🟠 Weak ROE: <10% suggests poor capital returns.')
  }

  // ===== GROWTH =====
  if (growth > 0.25) {
    score.bull += 3
    insights.push('🟢 Exceptional growth: >25% YoY revenue growth is remarkable.')
  } else if (growth > 0.15) {
    score.bull += 2
    insights.push('🟡 Strong growth: 15-25% indicates above-market expansion.')
  } else if (growth > 0.05) {
    score.bull += 1
    insights.push('🟡 Moderate growth: 5-15% is steady but not exceptional.')
  } else if (growth >= 0) {
    score.bear += 1
    insights.push('🟠 Slow growth: <5% suggests maturity or headwinds.')
  } else if (growth < 0) {
    score.bear += 3
    insights.push('🔴 Revenue decline: Negative growth requires investigation.')
  }

  // ===== LEVERAGE (Debt-to-Equity) =====
  if (debt > 0 && debt < 0.5) {
    score.bull += 2
    insights.push('🟢 Conservative leverage: Low debt provides financial flexibility.')
  } else if (debt >= 0.5 && debt < 1.5) {
    score.bear += 0
    insights.push('🟡 Moderate leverage: 0.5-1.5 D/E is manageable for most sectors.')
  } else if (debt >= 1.5 && debt < 3) {
    score.bear += 1
    insights.push('🟠 Elevated debt: >1.5 D/E raises refinancing and default risk.')
  } else if (debt >= 3) {
    score.bear += 3
    insights.push('🔴 High leverage: >3.0 D/E signals potential financial distress.')
  }

  // ===== FREE CASH FLOW =====
  if (fcf > 0) {
    score.bull += 2
    insights.push('🟢 Positive FCF: Strong cash generation supports dividends and buybacks.')
  } else if (fcf === 0) {
    score.bear += 1
    insights.push('🟠 No FCF: Company burns cash—sustainability is questionable.')
  } else if (fcf < 0) {
    score.bear += 2
    insights.push('🔴 Negative FCF: Cash burn limits growth optionality.')
  }

  // ===== WAR CHEST RATIO (Cash/Debt) =====
  if (wcr && wcr > 2) {
    score.bull += 2
    insights.push('🟢 Strong cash position: High cash/debt ratio enables M&A and weathering downturns.')
  } else if (wcr && wcr > 1) {
    score.bull += 1
    insights.push('🟡 Adequate liquidity: More cash than debt provides safety.')
  }

  // ===== COMPOSITE VERDICT =====
  const bull_threshold = 10
  const bear_threshold = 10
  
  let verdict = 'Balanced outlook'
  let color = '🟡'
  
  if (score.bull >= score.bear + 6) {
    verdict = 'Strong bullish signal'
    color = '🟢'
  } else if (score.bull >= score.bear + 3) {
    verdict = 'Moderately bullish'
    color = '🟢'
  } else if (score.bear >= score.bull + 6) {
    verdict = 'Strong risk indicators'
    color = '🔴'
  } else if (score.bear >= score.bull + 3) {
    verdict = 'Bearish headwinds'
    color = '🟠'
  }

  const confidence = Math.min(92, Math.max(45, 55 + (score.bull - score.bear) * 6))

  return {
    verdict: `${color} ${verdict}`,
    confidence: Math.round(confidence),
    insights: insights.slice(0, 5),
    score
  }
}

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, loading }) {
  if (loading) return null

  const assessment = buildSignals(metrics)

  return (
    <div className="ai-card">
      <div className="ai-head">
        <span className="ai-badge">Rule-Based Assessment</span>
        <span className="ai-sub">{ticker} · Deterministic Analysis Engine</span>
      </div>

      <div className="ai-body">
        {isEtf ? (
          <p>📊 ETF detected. Portfolio-level diversification naturally reduces single-company risk concentration.</p>
        ) : (
          <>
            <p><strong>Verdict:</strong> {assessment.verdict}</p>
            <p><strong>Confidence:</strong> {assessment.confidence}%</p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {assessment.insights.map((insight, idx) => (
                <div key={idx} className="metric-chip">{insight}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
