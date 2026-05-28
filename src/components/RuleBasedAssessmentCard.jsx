import { getSegmentStyle } from '../lib/stockSegments'

// Verdict color scheme
const VERDICT_STYLES = {
  'Strong Buy':   { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', dot: '#16a34a' },
  'Bullish':      { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', dot: '#22c55e' },
  'Neutral':      { bg: '#fefce8', border: '#ca8a04', text: '#92400e', dot: '#ca8a04' },
  'Caution':      { bg: '#fff7ed', border: '#ea580c', text: '#c2410c', dot: '#ea580c' },
  'Risk Elevated':{ bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', dot: '#dc2626' },
}

function buildSignals(metrics = {}) {
  // All metrics come from the API /api/data response:
  // war_chest_ratio, fcf, gross_margin, forward_pe, revenue_yoy
  const signals = []
  let bullScore = 0, bearScore = 0

  // 1. War Chest Ratio (cash/debt)
  const wcr = metrics?.war_chest_ratio
  if (wcr != null) {
    if (wcr >= 2) {
      bullScore += 2
      signals.push({ type: 'bull', label: 'Cash Fortress', note: `Cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x — company can comfortably cover its obligations.` })
    } else if (wcr >= 1) {
      bullScore += 1
      signals.push({ type: 'bull', label: 'Healthy Liquidity', note: `Cash covers debt (${wcr.toFixed(2)}x). Balance sheet is in solid shape.` })
    } else if (wcr >= 0.5) {
      bearScore += 1
      signals.push({ type: 'warn', label: 'Leverage Watch', note: `Cash-to-debt ratio of ${wcr.toFixed(2)}x. Debt is manageable but warrants monitoring.` })
    } else {
      bearScore += 2
      signals.push({ type: 'bear', label: 'Debt Pressure', note: `Cash only covers ${(wcr * 100).toFixed(0)}% of debt. High leverage could strain operations.` })
    }
  }

  // 2. Free Cash Flow
  const fcf = metrics?.fcf
  if (fcf != null) {
    const fcfB = fcf / 1e9
    if (fcf > 5e9) {
      bullScore += 2
      signals.push({ type: 'bull', label: 'Cash Machine', note: `Generating $${fcfB.toFixed(1)}B in free cash flow — strong fuel for buybacks, dividends, and R&D.` })
    } else if (fcf > 0) {
      bullScore += 1
      signals.push({ type: 'bull', label: 'FCF Positive', note: `Positive free cash flow of $${fcfB.toFixed(2)}B. Business generates more than it spends.` })
    } else if (fcf > -1e9) {
      bearScore += 1
      signals.push({ type: 'warn', label: 'Cash Burn', note: `Burning $${Math.abs(fcfB).toFixed(2)}B in FCF. Acceptable for growth-stage, risky for mature businesses.` })
    } else {
      bearScore += 2
      signals.push({ type: 'bear', label: 'Heavy Cash Burn', note: `FCF of -$${Math.abs(fcfB).toFixed(1)}B. Company requires external capital to sustain operations.` })
    }
  }

  // 3. Gross Margin
  const gm = metrics?.gross_margin
  if (gm != null) {
    if (gm > 0.6) {
      bullScore += 2
      signals.push({ type: 'bull', label: 'High-Margin Business', note: `Gross margin of ${(gm * 100).toFixed(1)}% — exceptional pricing power and scalability.` })
    } else if (gm > 0.3) {
      bullScore += 1
      signals.push({ type: 'bull', label: 'Solid Margins', note: `${(gm * 100).toFixed(1)}% gross margin. Healthy spread between revenue and cost of goods.` })
    } else if (gm > 0.1) {
      bearScore += 1
      signals.push({ type: 'warn', label: 'Thin Margins', note: `${(gm * 100).toFixed(1)}% gross margin. Limited buffer against cost inflation or competitive pressure.` })
    } else {
      bearScore += 2
      signals.push({ type: 'bear', label: 'Margin Risk', note: `Gross margin of just ${(gm * 100).toFixed(1)}%. Very little room for error on the cost side.` })
    }
  }

  // 4. Forward P/E
  const pe = metrics?.forward_pe
  if (pe != null && pe > 0) {
    if (pe < 15) {
      bullScore += 2
      signals.push({ type: 'bull', label: 'Attractive Valuation', note: `Forward P/E of ${pe.toFixed(1)}x — trading at a discount relative to historical market averages.` })
    } else if (pe < 30) {
      bullScore += 1
      signals.push({ type: 'bull', label: 'Fair Valuation', note: `Forward P/E of ${pe.toFixed(1)}x. Reasonable for a quality business with growth prospects.` })
    } else if (pe < 50) {
      bearScore += 1
      signals.push({ type: 'warn', label: 'Premium Priced', note: `Forward P/E of ${pe.toFixed(1)}x. Market is pricing in significant future growth — execution risk is elevated.` })
    } else {
      bearScore += 2
      signals.push({ type: 'bear', label: 'Expensive', note: `Forward P/E of ${pe.toFixed(1)}x. Valuation leaves little margin of safety. Sentiment-driven risk.` })
    }
  }

  // 5. Revenue YoY Growth
  const rev = metrics?.revenue_yoy
  if (rev != null) {
    if (rev > 0.25) {
      bullScore += 2
      signals.push({ type: 'bull', label: 'Hyper Growth', note: `Revenue growing at ${(rev * 100).toFixed(1)}% YoY — well above market average. Strong demand momentum.` })
    } else if (rev > 0.08) {
      bullScore += 1
      signals.push({ type: 'bull', label: 'Healthy Growth', note: `${(rev * 100).toFixed(1)}% revenue growth YoY. Business is expanding at a solid pace.` })
    } else if (rev >= 0) {
      signals.push({ type: 'warn', label: 'Slow Growth', note: `Revenue grew only ${(rev * 100).toFixed(1)}% YoY. Growth may be plateauing — watch for re-acceleration catalysts.` })
    } else {
      bearScore += 2
      signals.push({ type: 'bear', label: 'Revenue Decline', note: `Revenue contracted ${(Math.abs(rev) * 100).toFixed(1)}% YoY. Demand headwinds or structural challenges present.` })
    }
  }

  // Derive verdict
  const net = bullScore - bearScore
  let verdict
  if (net >= 5)       verdict = 'Strong Buy'
  else if (net >= 2)  verdict = 'Bullish'
  else if (net >= -1) verdict = 'Neutral'
  else if (net >= -3) verdict = 'Caution'
  else                verdict = 'Risk Elevated'

  const total = bullScore + bearScore || 1
  const score = Math.round(50 + (net / total) * 40)

  return { verdict, score: Math.min(95, Math.max(10, score)), signals, bullScore, bearScore }
}

const SIGNAL_ICONS = {
  bull: '↑',
  warn: '~',
  bear: '↓',
}
const SIGNAL_COLORS = {
  bull: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d', label: '#166534' },
  warn: { bg: '#fefce8', border: '#fef08a', icon: '#ca8a04', text: '#92400e', label: '#854d0e' },
  bear: { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#b91c1c', label: '#991b1b' },
}

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, loading }) {
  if (loading) return null

  if (isEtf) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '3px solid #475569', borderRadius: 'var(--r)',
        padding: '18px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff', background: '#475569',
            padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em'
          }}>Quantitative Assessment</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {ticker} · Fund Analysis
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          ETF detected. Individual company metrics are not applicable. Evaluate this fund based on 
          its expense ratio, underlying index methodology, tracking error, and sector/geographic exposure.
        </p>
      </div>
    )
  }

  const { verdict, score, signals, bullScore, bearScore } = buildSignals(metrics)
  const vs = VERDICT_STYLES[verdict] || VERDICT_STYLES['Neutral']

  const hasData = signals.length > 0

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${vs.border}`, borderRadius: 'var(--r)',
      padding: '18px 20px', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)',
          padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em'
        }}>Quantitative Assessment</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
          {ticker} · Rule-Based Engine
        </span>
      </div>

      {!hasData ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
          Insufficient data to generate a signal. Try a well-covered ticker.
        </p>
      ) : (
        <>
          {/* Verdict row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            padding: '12px 14px', borderRadius: 10,
            background: vs.bg, border: `1px solid ${vs.border}`
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: vs.text, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>
                Overall Verdict
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: vs.text }}>{verdict}</div>
            </div>
            {/* Score gauge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 400, color: vs.border, lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: 10, color: vs.text, fontWeight: 600, letterSpacing: '.06em' }}>/ 100</div>
            </div>
          </div>

          {/* Bull/Bear tally */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{bullScore}</div>
              <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600, letterSpacing: '.06em' }}>BULL SIGNALS</div>
            </div>
            <div style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{bearScore}</div>
              <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 600, letterSpacing: '.06em' }}>BEAR SIGNALS</div>
            </div>
          </div>

          {/* Individual signals */}
          <div style={{ display: 'grid', gap: 8 }}>
            {signals.map((sig, i) => {
              const sc = SIGNAL_COLORS[sig.type]
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 9,
                  background: sc.bg, border: `1px solid ${sc.border}`
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: sc.icon, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, marginTop: 1
                  }}>
                    {SIGNAL_ICONS[sig.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: sc.label, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 2 }}>
                      {sig.label}
                    </div>
                    <div style={{ fontSize: 13, color: sc.text, lineHeight: 1.5 }}>
                      {sig.note}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
