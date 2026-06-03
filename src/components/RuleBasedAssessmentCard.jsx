import { getSegmentStyle } from '../lib/stockSegments'

// ─── Stock assessment (unchanged) ────────────────────────────────────────────

function buildParagraph(metrics = {}) {
  const parts = []
  let bullScore = 0, bearScore = 0

  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  if (wcr != null) {
    if (wcr >= 2) { bullScore += 2; parts.push(`The balance sheet is in excellent shape, with a cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x — meaning the company holds significantly more cash than debt and faces minimal financial distress risk.`) }
    else if (wcr >= 1) { bullScore += 1; parts.push(`The balance sheet is solid, with cash fully covering total debt (${wcr.toFixed(2)}x ratio), leaving the company well-positioned to manage its obligations.`) }
    else if (wcr >= 0.5) { bearScore += 1; parts.push(`The balance sheet shows some leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of total debt — manageable for now, but worth monitoring in a rising rate environment.`) }
    else { bearScore += 2; parts.push(`The balance sheet carries meaningful leverage risk: cash covers just ${(wcr * 100).toFixed(0)}% of total debt, which could constrain financial flexibility or force dilutive capital raises.`) }
  }

  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { bullScore += 2; parts.push(`Free cash flow is a standout strength at $${b.toFixed(1)}B annually, giving the company ample firepower to self-fund growth, return capital to shareholders, and weather downturns without tapping debt markets.`) }
    else if (fcf > 0) { bullScore += 1; parts.push(`The business generates positive free cash flow of $${b.toFixed(2)}B, confirming that operations are self-sustaining and cash is accumulating rather than being consumed.`) }
    else if (fcf > -1e9) { bearScore += 1; parts.push(`Free cash flow is currently negative at $${b.toFixed(2)}B, indicating the company is spending more than it earns from operations — acceptable in a high-growth phase, but a concern for mature businesses.`) }
    else { bearScore += 2; parts.push(`The company is burning $${Math.abs(b).toFixed(1)}B in free cash flow annually, a rate that raises questions about long-term capital sustainability and dependence on external financing.`) }
  }

  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { bullScore += 2; parts.push(`With a gross margin of ${pct}%, the business exhibits exceptional pricing power — a hallmark of software, pharma, or luxury-tier economics where customers pay a significant premium over cost.`) }
    else if (gm > 0.3) { bullScore += 1; parts.push(`A gross margin of ${pct}% reflects a healthy spread between revenue and cost of goods, indicating reasonable pricing power and operational efficiency.`) }
    else if (gm > 0.1) { bearScore += 1; parts.push(`At ${pct}% gross margin, the business operates on relatively thin spreads, leaving limited buffer against cost inflation or competitive pricing pressure.`) }
    else { bearScore += 2; parts.push(`The ${pct}% gross margin is concerning — there is very little room between revenue and cost of goods, which constrains the ability to invest in growth or absorb headwinds.`) }
  }

  if (pe != null && pe > 0) {
    if (pe < 15) { bullScore += 2; parts.push(`At a forward P/E of ${pe.toFixed(1)}x, the valuation appears attractive relative to historical market averages, potentially offering a margin of safety for new entrants.`) }
    else if (pe < 30) { bullScore += 1; parts.push(`The forward P/E of ${pe.toFixed(1)}x is reasonable — the market is assigning a modest growth premium, but not one that requires heroic execution to justify.`) }
    else if (pe < 50) { bearScore += 1; parts.push(`Trading at a forward P/E of ${pe.toFixed(1)}x, the valuation embeds significant growth expectations. Any disappointment in earnings delivery could trigger a sharp de-rating.`) }
    else { bearScore += 2; parts.push(`A forward P/E of ${pe.toFixed(1)}x prices in near-perfect execution for years ahead. At these levels, the stock leaves very little margin of safety and is highly sensitive to macro or earnings surprises.`) }
  }

  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { bullScore += 2; parts.push(`Revenue growth of ${pct}% YoY puts this firmly in hypergrowth territory — demand is accelerating and the company is clearly gaining market share or expanding its addressable market.`) }
    else if (rev > 0.08) { bullScore += 1; parts.push(`Year-over-year revenue growth of ${pct}% is healthy and above average, pointing to sustained demand and a business that continues to expand its footprint.`) }
    else if (rev >= 0) { parts.push(`Revenue growth has slowed to ${pct}% YoY — still positive, but the deceleration warrants attention and raises questions about whether the business is approaching saturation.`) }
    else { bearScore += 2; parts.push(`Revenue contracted ${Math.abs(pct)}% YoY, a clear sign of demand headwinds or market share erosion that will need to reverse before the fundamental outlook can improve.`) }
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

  const closers = {
    'Strong Buy':    'Taken together, the fundamentals present a compelling case — this is a well-run business with multiple financial strengths and no major red flags at this time.',
    'Bullish':       'On balance, the positives outweigh the negatives. The fundamental picture supports a constructive view, though active monitoring of the weaker areas remains prudent.',
    'Neutral':       'The overall picture is balanced — genuine strengths and real risks coexist. A position would need to be sized appropriately, with close attention paid to how the cautionary metrics evolve.',
    'Caution':       'The risk signals are material and should not be dismissed. Conviction would require either a significant margin of safety in the price or a clear near-term catalyst to reverse the weaker metrics.',
    'Risk Elevated': 'Multiple dimensions of financial stress are present simultaneously. This profile warrants significant caution — the downside risks appear to outweigh the potential upside under current conditions.',
  }

  return { paragraph: parts.join(' ') + ' ' + closers[verdict], verdict, score, verdictColor }
}

// ─── ETF analysis engine ──────────────────────────────────────────────────────

const KNOWN_ETF_PROFILES = {
  // Broad market
  VOO:  { name: 'Vanguard S&P 500', expense: 0.03, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend' },
  SPY:  { name: 'SPDR S&P 500',     expense: 0.09, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend' },
  IVV:  { name: 'iShares Core S&P 500', expense: 0.03, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend' },
  VTI:  { name: 'Vanguard Total Market', expense: 0.03, category: 'broad', benchmark: 'Total US Market', style: 'Passive Blend' },
  SCHB: { name: 'Schwab US Broad Market', expense: 0.03, category: 'broad', benchmark: 'Total US Market', style: 'Passive Blend' },
  // Growth / Tech
  QQQ:  { name: 'Invesco QQQ (Nasdaq-100)', expense: 0.20, category: 'growth', benchmark: 'Nasdaq-100', style: 'Passive Growth' },
  VGT:  { name: 'Vanguard IT Sector',       expense: 0.10, category: 'growth', benchmark: 'MSCI US IMI IT', style: 'Passive Growth' },
  XLK:  { name: 'SPDR Technology Select',   expense: 0.13, category: 'growth', benchmark: 'S&P 500 Tech', style: 'Passive Growth' },
  ARKK: { name: 'ARK Innovation',           expense: 0.75, category: 'growth', benchmark: 'None', style: 'Active Growth' },
  SOXX: { name: 'iShares Semiconductor',    expense: 0.35, category: 'growth', benchmark: 'ICE Semiconductor', style: 'Passive Growth' },
  SMH:  { name: 'VanEck Semiconductor',     expense: 0.35, category: 'growth', benchmark: 'MVIS Semiconductor', style: 'Passive Growth' },
  // Dividend / Income
  VYM:  { name: 'Vanguard High Dividend Yield', expense: 0.06, category: 'dividend', benchmark: 'FTSE High Dividend', style: 'Passive Income' },
  SCHD: { name: 'Schwab US Dividend Equity',    expense: 0.06, category: 'dividend', benchmark: 'Dow Jones 100 Div', style: 'Passive Income' },
  DVY:  { name: 'iShares Select Dividend',      expense: 0.38, category: 'dividend', benchmark: 'Dow Jones Select Div', style: 'Passive Income' },
  VIG:  { name: 'Vanguard Dividend Appreciation', expense: 0.06, category: 'dividend', benchmark: 'S&P US Div Growers', style: 'Passive Income' },
  // International
  VEA:  { name: 'Vanguard Developed Markets', expense: 0.05, category: 'intl', benchmark: 'FTSE Developed ex-US', style: 'Passive Intl' },
  VWO:  { name: 'Vanguard Emerging Markets',  expense: 0.08, category: 'intl', benchmark: 'FTSE Emerging',       style: 'Passive Intl' },
  EEM:  { name: 'iShares MSCI Emerging Mkts', expense: 0.70, category: 'intl', benchmark: 'MSCI Emerging',       style: 'Passive Intl' },
  IEFA: { name: 'iShares Core MSCI EAFE',     expense: 0.07, category: 'intl', benchmark: 'MSCI EAFE',           style: 'Passive Intl' },
  // Bonds
  BND:  { name: 'Vanguard Total Bond Market', expense: 0.03, category: 'bond', benchmark: 'Bloomberg US Agg', style: 'Passive Fixed Income' },
  AGG:  { name: 'iShares Core US Aggregate',  expense: 0.03, category: 'bond', benchmark: 'Bloomberg US Agg', style: 'Passive Fixed Income' },
  TLT:  { name: 'iShares 20+ Year Treasury',  expense: 0.15, category: 'bond', benchmark: '20+ Yr Treasury',  style: 'Passive Fixed Income' },
  HYG:  { name: 'iShares iBoxx High Yield',   expense: 0.48, category: 'bond', benchmark: 'Markit iBoxx HY',  style: 'Passive Fixed Income' },
  LQD:  { name: 'iShares Investment Grade Corp', expense: 0.14, category: 'bond', benchmark: 'Markit iBoxx IG', style: 'Passive Fixed Income' },
}

const TECH_TICKERS    = new Set(['AAPL','MSFT','NVDA','GOOGL','GOOG','META','AMZN','AVGO','TSM','ASML','AMD','INTC','ORCL','CRM','ADBE','QCOM','TXN','AMAT','LRCX','KLAC'])
const HEALTH_TICKERS  = new Set(['JNJ','UNH','LLY','ABBV','PFE','MRK','TMO','ABT','DHR','BMY','AMGN','GILD','ISRG','REGN','VRTX','BSX','ELV','CI','CVS','HUM'])
const FINANCE_TICKERS = new Set(['BRK-B','JPM','V','MA','BAC','WFC','GS','MS','BLK','SCHW','AXP','USB','PNC','TFC','COF','ICE','CME','MMC','AON','SPGI'])
const ENERGY_TICKERS  = new Set(['XOM','CVX','COP','SLB','EOG','OXY','PSX','VLO','MPC','KMI','WMB','PXD','DVN','HES','FANG'])

function analyseEtf(ticker, holdings) {
  const t = ticker.toUpperCase()
  const profile = KNOWN_ETF_PROFILES[t] || null

  // Derive category from holdings if profile unknown
  const tickers = (holdings || []).map(h => h.ticker?.toUpperCase())
  const top10Weight = (holdings || []).slice(0, 10).reduce((s, h) => s + (h.weight || 0), 0)
  const top1Weight  = (holdings || [])[0]?.weight || 0
  const holdingCount = (holdings || []).length

  const techCount    = tickers.filter(t => TECH_TICKERS.has(t)).length
  const healthCount  = tickers.filter(t => HEALTH_TICKERS.has(t)).length
  const financeCount = tickers.filter(t => FINANCE_TICKERS.has(t)).length
  const energyCount  = tickers.filter(t => ENERGY_TICKERS.has(t)).length

  let category = profile?.category
  if (!category) {
    if (techCount >= 3)    category = 'growth'
    else if (healthCount >= 3)  category = 'health'
    else if (financeCount >= 3) category = 'finance'
    else if (energyCount >= 3)  category = 'energy'
    else                        category = 'broad'
  }

  // Expense ratio assessment
  const expense = profile?.expense ?? null
  let expenseRating = null, expenseColor = null, expenseNote = null
  if (expense != null) {
    if (expense <= 0.05)      { expenseRating = 'Ultra-Low'; expenseColor = '#16a34a'; expenseNote = `${(expense * 100).toFixed(2)}% — best-in-class cost efficiency. Drag on returns is negligible.` }
    else if (expense <= 0.15) { expenseRating = 'Low';       expenseColor = '#22c55e'; expenseNote = `${(expense * 100).toFixed(2)}% — competitive fee. Cost headwind is minimal over time.` }
    else if (expense <= 0.40) { expenseRating = 'Moderate';  expenseColor = '#ca8a04'; expenseNote = `${(expense * 100).toFixed(2)}% — reasonable for a specialised or active-tilted fund.` }
    else if (expense <= 0.75) { expenseRating = 'High';      expenseColor = '#ea580c'; expenseNote = `${(expense * 100).toFixed(2)}% — elevated. You pay ~$${(expense * 10).toFixed(0)} per $1,000 invested annually in fees.` }
    else                      { expenseRating = 'Very High'; expenseColor = '#dc2626'; expenseNote = `${(expense * 100).toFixed(2)}% — heavy fee drag. Requires substantially better returns just to match cheaper peers.` }
  }

  // Concentration risk
  let concentrationRating, concentrationColor, concentrationNote
  if (top1Weight > 0.15) {
    concentrationRating = 'Very High'; concentrationColor = '#dc2626'
    concentrationNote = `Top holding is ${(top1Weight * 100).toFixed(1)}% of the fund — single-stock risk is significant. A 20% drop in one name moves the whole fund ~${(top1Weight * 20).toFixed(1)}%.`
  } else if (top1Weight > 0.10) {
    concentrationRating = 'High'; concentrationColor = '#ea580c'
    concentrationNote = `Top holding represents ${(top1Weight * 100).toFixed(1)}% — meaningful exposure to one name. Top 10 = ${(top10Weight * 100).toFixed(0)}% of assets.`
  } else if (top10Weight > 0.55) {
    concentrationRating = 'Moderate'; concentrationColor = '#ca8a04'
    concentrationNote = `Top 10 holdings account for ${(top10Weight * 100).toFixed(0)}% of assets. A handful of names drive most of the performance.`
  } else {
    concentrationRating = 'Well-Spread'; concentrationColor = '#16a34a'
    concentrationNote = `Top 10 make up only ${(top10Weight * 100).toFixed(0)}% of assets — genuinely diversified across names.`
  }

  // Diversification breadth
  let breadthNote
  if (holdingCount === 0)       breadthNote = null
  else if (holdingCount < 30)   breadthNote = `Narrow — only ${holdingCount} holdings.`
  else if (holdingCount < 100)  breadthNote = `Focused — ${holdingCount} holdings gives targeted exposure.`
  else if (holdingCount < 500)  breadthNote = `Balanced — ${holdingCount} holdings across multiple names.`
  else                          breadthNote = `Broad — ${holdingCount}+ holdings, deep diversification.`

  // Category profile
  const CATEGORY_META = {
    broad:   { label: 'Broad Market',  icon: '🌐', color: '#6366f1', riskLevel: 'Medium',    riskColor: '#ca8a04', tagline: 'Tracks the overall market. Returns mirror broad economic growth.', volatility: 'Medium', interestRateSensitivity: 'Low', bestFor: 'Passive investors, long-term core holdings, simplicity seekers' },
    growth:  { label: 'Growth / Tech', icon: '🚀', color: '#2563eb', riskLevel: 'High',       riskColor: '#dc2626', tagline: 'Tech & high-growth tilt. High upside, high beta — amplified swings in both directions.', volatility: 'High', interestRateSensitivity: 'High', bestFor: 'Growth investors with long horizons comfortable with drawdowns > 30%' },
    dividend:{ label: 'Dividend Income', icon: '💰', color: '#16a34a', riskLevel: 'Low-Med', riskColor: '#22c55e', tagline: 'Selected for dividend consistency. Lower volatility, steady income stream.', volatility: 'Low–Medium', interestRateSensitivity: 'Medium', bestFor: 'Income-seekers, retirees, investors wanting regular cash distributions' },
    intl:    { label: 'International', icon: '🌍', color: '#0891b2', riskLevel: 'Medium',    riskColor: '#ca8a04', tagline: 'Non-US exposure. Adds diversification but introduces currency and geopolitical risk.', volatility: 'Medium–High', interestRateSensitivity: 'Low', bestFor: 'Investors reducing US home-country bias, geographic diversification' },
    bond:    { label: 'Fixed Income',  icon: '🏛️', color: '#7c3aed', riskLevel: 'Low',       riskColor: '#16a34a', tagline: 'Returns driven by interest rates, not equity markets. Capital preservation focus.', volatility: 'Low', interestRateSensitivity: 'Very High', bestFor: 'Conservative investors, equity hedges, capital preservation' },
    health:  { label: 'Healthcare',    icon: '🏥', color: '#059669', riskLevel: 'Medium',    riskColor: '#ca8a04', tagline: 'Defensive sector. Lower cyclicality but exposed to drug pricing and regulatory risk.', volatility: 'Medium', interestRateSensitivity: 'Low', bestFor: 'Defensive tilts, aging population thesis, diversification away from tech' },
    finance: { label: 'Financials',    icon: '🏦', color: '#1d4ed8', riskLevel: 'Med-High',  riskColor: '#ea580c', tagline: 'Tied to credit cycles and rate spreads. Benefits from rising rates, suffers in recessions.', volatility: 'Medium–High', interestRateSensitivity: 'High', bestFor: 'Rate-rising environments, value investors, cyclical tilts' },
    energy:  { label: 'Energy',        icon: '⚡', color: '#b45309', riskLevel: 'High',       riskColor: '#dc2626', tagline: 'Highly cyclical. Returns dominated by oil/gas price swings and global supply dynamics.', volatility: 'High', interestRateSensitivity: 'Low', bestFor: 'Commodity cycle plays, inflation hedges, energy transition exposure' },
  }

  const meta = CATEGORY_META[category] || CATEGORY_META['broad']

  // Risk signals
  const risks = []
  if (top1Weight > 0.12)    risks.push({ label: 'Concentration Risk', detail: `Single name is ${(top1Weight*100).toFixed(1)}% of the fund`, severity: 'warn' })
  if (expense != null && expense > 0.40) risks.push({ label: 'High Fee Drag', detail: `${(expense*100).toFixed(2)}% annual cost erodes compounding`, severity: 'warn' })
  if (category === 'growth') risks.push({ label: 'Rate Sensitivity', detail: 'Growth/tech valuations compress when rates rise', severity: 'info' })
  if (category === 'bond')   risks.push({ label: 'Duration Risk', detail: 'Long-duration bonds fall when interest rates rise', severity: 'info' })
  if (category === 'intl')   risks.push({ label: 'Currency Risk', detail: 'Returns affected by USD strengthening vs foreign currencies', severity: 'info' })
  if (category === 'energy') risks.push({ label: 'Commodity Cyclicality', detail: 'Highly dependent on oil & gas price direction', severity: 'warn' })
  if (profile?.style?.startsWith('Active')) risks.push({ label: 'Active Management Risk', detail: 'Manager skill risk; historically active funds underperform over 10yr+', severity: 'warn' })

  return { category, meta, profile, expense, expenseRating, expenseColor, expenseNote, concentrationRating, concentrationColor, concentrationNote, breadthNote, risks, top1Weight, top10Weight, holdingCount }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EtfStatPill({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      background: 'var(--surface-2, rgba(255,255,255,0.04))',
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '10px 14px', minWidth: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  )
}

function RiskSignal({ label, detail, severity }) {
  const color = severity === 'warn' ? '#ea580c' : '#6366f1'
  const bg    = severity === 'warn' ? '#ea580c14' : '#6366f114'
  const icon  = severity === 'warn' ? '⚠' : 'ℹ'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: bg, border: `1px solid ${color}33`,
      borderRadius: 6, padding: '8px 10px',
    }}>
      <span style={{ fontSize: 12, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  )
}

function EtfHoldingsBreakdown({ holdings }) {
  if (!holdings?.length) return null
  const topHoldings = holdings.slice(0, 10)
  const maxPct = topHoldings[0]?.weight || 1
  const BAR_COLORS = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff']

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Top Holdings
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {topHoldings.map((h, i) => (
          <div key={h.ticker || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 52, flexShrink: 0 }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surface-2, rgba(255,255,255,0.06))', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${(h.weight / maxPct) * 100}%`, background: BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1], transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', minWidth: 38, textAlign: 'right', flexShrink: 0 }}>{(h.weight * 100).toFixed(1)}%</span>
            {h.name && (
              <span style={{ fontSize: 11, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, flexShrink: 1 }}>{h.name}</span>
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

// ─── Main ETF card ────────────────────────────────────────────────────────────

function EtfAnalysisCard({ ticker, etfHoldings }) {
  const hasHoldings = etfHoldings?.length > 0
  const analysis = analyseEtf(ticker, hasHoldings ? etfHoldings : [])
  const { meta, profile, expenseRating, expenseColor, expenseNote, concentrationRating, concentrationColor, concentrationNote, breadthNote, risks } = analysis

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 'var(--r)', padding: '18px 20px',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#111', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Fund Analysis
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {ticker} · ETF
          </span>
        </div>
        {/* Category badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          color: meta.color,
          background: meta.color + '18',
          border: `1px solid ${meta.color}44`,
        }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* ── Tagline ── */}
      <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65, margin: '0 0 16px' }}>
        {meta.tagline}
      </p>

      {/* ── Fund profile name ── */}
      {profile?.name && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px', fontStyle: 'italic' }}>
          {profile.name}{profile.benchmark ? ` · Tracks: ${profile.benchmark}` : ''}{profile.style ? ` · ${profile.style}` : ''}
        </p>
      )}

      {/* ── Stat pills row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
        {expenseRating && (
          <EtfStatPill label="Expense Ratio" value={expenseRating} valueColor={expenseColor} />
        )}
        <EtfStatPill
          label="Concentration"
          value={concentrationRating}
          valueColor={concentrationColor}
        />
        <EtfStatPill label="Volatility" value={meta.volatility} valueColor={meta.riskColor} />
        <EtfStatPill label="Rate Sensitivity" value={meta.interestRateSensitivity} valueColor={meta.interestRateSensitivity === 'Very High' || meta.interestRateSensitivity === 'High' ? '#ea580c' : 'var(--text)'} />
        {breadthNote && (
          <EtfStatPill label="Breadth" value={breadthNote.split(' — ')[0]} />
        )}
      </div>

      {/* ── Detail notes (expense + concentration) ── */}
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {expenseNote && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${expenseColor}66` }}>
            <strong style={{ color: expenseColor }}>Expense Ratio:</strong> {expenseNote}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${concentrationColor}66` }}>
          <strong style={{ color: concentrationColor }}>Concentration:</strong> {concentrationNote}
        </div>
        {breadthNote && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
            <strong style={{ color: 'var(--text)' }}>Breadth:</strong> {breadthNote}
          </div>
        )}
      </div>

      {/* ── Risk signals ── */}
      {risks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Risk Signals
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {risks.map((r, i) => <RiskSignal key={i} {...r} />)}
          </div>
        </div>
      )}

      {/* ── Best suited for ── */}
      <div style={{
        fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6,
        background: 'var(--surface-2, rgba(255,255,255,0.03))',
        border: '1px solid var(--border)', borderRadius: 6,
        padding: '10px 12px', marginBottom: hasHoldings ? 0 : 0,
      }}>
        <strong style={{ color: 'var(--text)' }}>Best suited for:</strong> {meta.bestFor}
      </div>

      {/* ── Holdings breakdown ── */}
      {hasHoldings && <EtfHoldingsBreakdown holdings={etfHoldings} />}
    </div>
  )
}

// ─── Stock assessment card (unchanged export) ─────────────────────────────────

export function RuleBasedAssessmentCard({ ticker, metrics, isEtf, etfHoldings, loading }) {
  if (loading) return null

  if (isEtf) {
    return <EtfAnalysisCard ticker={ticker} etfHoldings={etfHoldings} />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Quantitative Assessment
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>
            {ticker} · Rule-Based Engine
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            color: verdictColor, background: verdictColor + '18', border: `1px solid ${verdictColor}44`,
          }}>{verdict}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>{score}/100</span>
        </div>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', margin: 0 }}>
        {paragraph}
      </p>
    </div>
  )
}
