import { getSegmentStyle } from '../lib/stockSegments'

// ─── Stock assessment ────────────────────────────────────────────

function buildParagraph(metrics = {}) {
  const parts = []
  let bullScore = 0, bearScore = 0

  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  // War Chest Ratio (Balance Sheet)
  if (wcr != null) {
    if (wcr >= 2) { 
      bullScore += 2; 
      parts.push(`The balance sheet passes the Terminal Red Flag sweep with ease, boasting a cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x. Holding significantly more cash than debt eliminates near-term insolvency risk and provides massive optionality for M&A or buybacks during downturns.`) 
    }
    else if (wcr >= 1) { 
      bullScore += 1; 
      parts.push(`The balance sheet is solid, with cash fully covering total debt (${wcr.toFixed(2)}x ratio). This provides a neutral, stable foundation, leaving the company well-positioned to manage obligations without relying on turbulent credit markets.`) 
    }
    else if (wcr >= 0.5) { 
      bearScore += 1; 
      parts.push(`The balance sheet shows moderate leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of total debt. While manageable in a vacuum, the Bear case dictates that this limits financial flexibility and increases vulnerability in a persistently high-rate environment.`) 
    }
    else { 
      bearScore += 2; 
      parts.push(`A Terminal Red Flag triggers on the balance sheet: cash covers just ${(wcr * 100).toFixed(0)}% of total debt. This carries meaningful distress risk, increasing the probability of forced, dilutive capital raises or debt restructuring if macro conditions tighten.`) 
    }
  }

  // Free Cash Flow
  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { 
      bullScore += 2; 
      parts.push(`Free cash flow is a standout strength at $${b.toFixed(1)}B annually. This structural cash generation provides the ultimate defensive moat, giving the company ample firepower to self-fund growth and return capital to shareholders regardless of market conditions.`) 
    }
    else if (fcf > 0) { 
      bullScore += 1; 
      parts.push(`The business generates positive free cash flow of $${b.toFixed(2)}B, confirming that core operations are self-sustaining and cash is accumulating rather than being drained.`) 
    }
    else if (fcf > -1e9) { 
      bearScore += 1; 
      parts.push(`Free cash flow is currently negative at $${Math.abs(b).toFixed(2)}B. While an aggressive cash burn can be acceptable for modern infrastructure plays scaling multi-billion dollar launch backlogs, this relies entirely on maintaining a safe liquid cash cushion. If execution falters, the Bear vs. Bull probability tilts negatively.`) 
    }
    else { 
      bearScore += 2; 
      parts.push(`The company is burning a massive $${Math.abs(b).toFixed(1)}B in free cash flow annually. Without a clear line of sight to operating leverage, this level of capital destruction represents a severe Terminal Red Flag, forcing perpetual dependence on external equity or debt financing.`) 
    }
  }

  // Gross Margin
  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { 
      bullScore += 2; 
      parts.push(`With a gross margin of ${pct}%, the business exhibits exceptional pricing power. This is a hallmark of software, pharma, or luxury-tier economics, providing an excellent buffer against supply chain shocks and inflation.`) 
    }
    else if (gm > 0.3) { 
      bullScore += 1; 
      parts.push(`A gross margin of ${pct}% reflects a healthy spread between revenue and cost of goods, indicating reasonable operational efficiency and baseline pricing power.`) 
    }
    else if (gm > 0.1) { 
      bearScore += 1; 
      parts.push(`Operating on thin gross margins of ${pct}% leaves virtually no margin of error. In a Bear scenario, even slight cost inflation or competitive pricing pressure will obliterate the bottom line.`) 
    }
    else { 
      bearScore += 2; 
      parts.push(`The highly depressed ${pct}% gross margin is severely concerning. The structural unit economics are broken, constraining the ability to invest in growth and signaling a deep lack of competitive advantage.`) 
    }
  }

  // Forward P/E
  if (pe != null && pe > 0) {
    if (pe < 15) { 
      bullScore += 2; 
      parts.push(`At a forward P/E of ${pe.toFixed(1)}x, the valuation builds in a significant margin of safety. While value traps must be actively monitored, this multiple limits downside risk and provides asymmetric upside if growth reaccelerates.`) 
    }
    else if (pe < 30) { 
      bullScore += 1; 
      parts.push(`The forward P/E of ${pe.toFixed(1)}x is reasonable. The market is assigning a modest premium, balancing growth expectations without demanding heroic execution to justify the price.`) 
    }
    else if (pe < 50) { 
      bearScore += 1; 
      parts.push(`Trading at a forward P/E of ${pe.toFixed(1)}x, the valuation embeds steep growth expectations. Zero bias dictates acknowledging that any earnings miss or guidance cut at these levels will trigger immediate, sharp multiple compression.`) 
    }
    else { 
      bearScore += 2; 
      parts.push(`A forward P/E of ${pe.toFixed(1)}x prices in absolute perfection for years ahead. The Bear case is highly prominent here: the stock leaves zero margin of safety and is acutely vulnerable to macro shocks or slight growth decelerations.`) 
    }
  }

  // Revenue YoY
  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { 
      bullScore += 2; 
      parts.push(`Revenue growth of ${pct}% YoY firmly anchors the Bull case, putting the company in hypergrowth territory. Demand is visibly accelerating as they rapidly expand their addressable market and capture share.`) 
    }
    else if (rev > 0.08) { 
      bullScore += 1; 
      parts.push(`Year-over-year revenue growth of ${pct}% is healthy, pointing to sustained structural demand and a business that continues to scale reliably.`) 
    }
    else if (rev >= 0) { 
      parts.push(`Revenue growth has stalled to ${pct}% YoY. While technically positive, this stagnation warrants strict neutrality and requires investigation to determine if the core market has saturated.`) 
    }
    else { 
      bearScore += 2; 
      parts.push(`Revenue contracted by ${Math.abs(pct)}% YoY, highlighting a clear Bear case materializing. Demand is eroding, and a fundamental turnaround is explicitly required before the downside trajectory can reverse.`) 
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

// ─── ETF analysis engine ──────────────────────────────────────────────────────

const KNOWN_ETF_PROFILES = {
  // Broad market
  VOO:  { name: 'Vanguard S&P 500', expense: 0.0003, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend', totalHoldings: 505 },
  SPY:  { name: 'SPDR S&P 500',     expense: 0.0009, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend', totalHoldings: 505 },
  IVV:  { name: 'iShares Core S&P 500', expense: 0.0003, category: 'broad', benchmark: 'S&P 500', style: 'Passive Blend', totalHoldings: 505 },
  VTI:  { name: 'Vanguard Total Market', expense: 0.0003, category: 'broad', benchmark: 'Total US Market', style: 'Passive Blend', totalHoldings: 3750 },
  SCHB: { name: 'Schwab US Broad Market', expense: 0.0003, category: 'broad', benchmark: 'Total US Market', style: 'Passive Blend', totalHoldings: 2500 },
  // Growth / Tech
  QQQ:  { name: 'Invesco QQQ (Nasdaq-100)', expense: 0.0020, category: 'growth', benchmark: 'Nasdaq-100', style: 'Passive Growth', totalHoldings: 101 },
  VGT:  { name: 'Vanguard IT Sector',       expense: 0.0010, category: 'growth', benchmark: 'MSCI US IMI IT', style: 'Passive Growth', totalHoldings: 320 },
  XLK:  { name: 'SPDR Technology Select',   expense: 0.0013, category: 'growth', benchmark: 'S&P 500 Tech', style: 'Passive Growth', totalHoldings: 65 },
  ARKK: { name: 'ARK Innovation',           expense: 0.0075, category: 'growth', benchmark: 'None', style: 'Active Growth', totalHoldings: 35 },
  SOXX: { name: 'iShares Semiconductor',    expense: 0.0035, category: 'growth', benchmark: 'ICE Semiconductor', style: 'Passive Growth', totalHoldings: 30 },
  SMH:  { name: 'VanEck Semiconductor',     expense: 0.0035, category: 'growth', benchmark: 'MVIS Semiconductor', style: 'Passive Growth', totalHoldings: 25 },
  // Dividend / Income
  VYM:  { name: 'Vanguard High Dividend Yield', expense: 0.0006, category: 'dividend', benchmark: 'FTSE High Dividend', style: 'Passive Income', totalHoldings: 450 },
  SCHD: { name: 'Schwab US Dividend Equity',    expense: 0.0006, category: 'dividend', benchmark: 'Dow Jones 100 Div', style: 'Passive Income', totalHoldings: 100 },
  DVY:  { name: 'iShares Select Dividend',      expense: 0.0038, category: 'dividend', benchmark: 'Dow Jones Select Div', style: 'Passive Income', totalHoldings: 100 },
  VIG:  { name: 'Vanguard Dividend Appreciation', expense: 0.0006, category: 'dividend', benchmark: 'S&P US Div Growers', style: 'Passive Income', totalHoldings: 315 },
  // International
  VEA:  { name: 'Vanguard Developed Markets', expense: 0.0005, category: 'intl', benchmark: 'FTSE Developed ex-US', style: 'Passive Intl', totalHoldings: 4000 },
  VWO:  { name: 'Vanguard Emerging Markets',  expense: 0.0008, category: 'intl', benchmark: 'FTSE Emerging',       style: 'Passive Intl', totalHoldings: 5000 },
  EEM:  { name: 'iShares MSCI Emerging Mkts', expense: 0.0070, category: 'intl', benchmark: 'MSCI Emerging',       style: 'Passive Intl', totalHoldings: 1200 },
  IEFA: { name: 'iShares Core MSCI EAFE',     expense: 0.0007, category: 'intl', benchmark: 'MSCI EAFE',           style: 'Passive Intl', totalHoldings: 3000 },
  // Bonds
  BND:  { name: 'Vanguard Total Bond Market', expense: 0.0003, category: 'bond', benchmark: 'Bloomberg US Agg', style: 'Passive Fixed Income', totalHoldings: 10000 },
  AGG:  { name: 'iShares Core US Aggregate',  expense: 0.0003, category: 'bond', benchmark: 'Bloomberg US Agg', style: 'Passive Fixed Income', totalHoldings: 10000 },
  TLT:  { name: 'iShares 20+ Year Treasury',  expense: 0.0015, category: 'bond', benchmark: '20+ Yr Treasury',  style: 'Passive Fixed Income', totalHoldings: 40 },
  HYG:  { name: 'iShares iBoxx High Yield',   expense: 0.0048, category: 'bond', benchmark: 'Markit iBoxx HY',  style: 'Passive Fixed Income', totalHoldings: 1200 },
  LQD:  { name: 'iShares Investment Grade Corp', expense: 0.0014, category: 'bond', benchmark: 'Markit iBoxx IG', style: 'Passive Fixed Income', totalHoldings: 2500 },
}

const TECH_TICKERS    = new Set(['AAPL','MSFT','NVDA','GOOGL','GOOG','META','AMZN','AVGO','TSM','ASML','AMD','INTC','ORCL','CRM','ADBE','QCOM','TXN','AMAT','LRCX','KLAC'])
const HEALTH_TICKERS  = new Set(['JNJ','UNH','LLY','ABBV','PFE','MRK','TMO','ABT','DHR','BMY','AMGN','GILD','ISRG','REGN','VRTX','BSX','ELV','CI','CVS','HUM'])
const FINANCE_TICKERS = new Set(['BRK-B','JPM','V','MA','BAC','WFC','GS','MS','BLK','SCHW','AXP','USB','PNC','TFC','COF','ICE','CME','MMC','AON','SPGI'])
const ENERGY_TICKERS  = new Set(['XOM','CVX','COP','SLB','EOG','OXY','PSX','VLO','MPC','KMI','WMB','PXD','DVN','HES','FANG'])

function analyseEtf(ticker, holdings) {
  const t = ticker.toUpperCase()
  const profile = KNOWN_ETF_PROFILES[t] || null

  const tickers = (holdings || []).map(h => h.ticker?.toUpperCase())
  const top10Weight = (holdings || []).slice(0, 10).reduce((s, h) => s + (h.weight || 0), 0)
  const top1Weight  = (holdings || [])[0]?.weight || 0
  
  // Refactored breadth logic using structural total if available
  const trueHoldingCount = profile?.totalHoldings || (holdings || []).length

  const techCount    = tickers.filter(tkr => TECH_TICKERS.has(tkr)).length
  const healthCount  = tickers.filter(tkr => HEALTH_TICKERS.has(tkr)).length
  const financeCount = tickers.filter(tkr => FINANCE_TICKERS.has(tkr)).length
  const energyCount  = tickers.filter(tkr => ENERGY_TICKERS.has(tkr)).length

  let category = profile?.category
  if (!category) {
    if (techCount >= 3)    category = 'growth'
    else if (healthCount >= 3)  category = 'health'
    else if (financeCount >= 3) category = 'finance'
    else if (energyCount >= 3)  category = 'energy'
    else                        category = 'broad'
  }

  // Refactored Expense ratio assessment (decimal fixed & text expanded)
  const expense = profile?.expense ?? null
  let expenseRating = null, expenseColor = null, expenseNote = null
  if (expense != null) {
    const expensePctStr = (expense * 100).toFixed(2)
    if (expense <= 0.0005) { 
      expenseRating = 'Ultra-Low'; expenseColor = '#16a34a'; 
      expenseNote = `${expensePctStr}% — Represents best-in-class cost efficiency. Over a 10-year compounding horizon, saving on fees fundamentally maximizes capital velocity and ensures you capture nearly the entirety of the gross index return.` 
    }
    else if (expense <= 0.0015) { 
      expenseRating = 'Low'; expenseColor = '#22c55e'; 
      expenseNote = `${expensePctStr}% — A highly competitive fee structure. The drag on capital appreciation remains minimal over long-term holding periods.` 
    }
    else if (expense <= 0.0040) { 
      expenseRating = 'Moderate'; expenseColor = '#ca8a04'; 
      expenseNote = `${expensePctStr}% — Reasonable pricing for a specialized sector or actively-tilted fund, though it requires structural outperformance to justify the ongoing capital leak against cheaper passive alternatives.` 
    }
    else if (expense <= 0.0075) { 
      expenseRating = 'High'; expenseColor = '#ea580c'; 
      expenseNote = `${expensePctStr}% — Elevated fee drag. You are paying ~$${(expense * 10000).toFixed(0)} per $10,000 invested annually. Actively monitor this; the fund must consistently generate alpha to prevent fees from eating into the core equity risk premium.` 
    }
    else { 
      expenseRating = 'Very High'; expenseColor = '#dc2626'; 
      expenseNote = `${expensePctStr}% — Severe structural headwind. Fees this high act as a Terminal Red Flag for long-term holders, demanding flawless management execution just to match the baseline returns of cheaper peers.` 
    }
  }

  // Refactored Concentration risk
  let concentrationRating, concentrationColor, concentrationNote
  if (top1Weight > 0.15) {
    concentrationRating = 'Very High'; concentrationColor = '#dc2626'
    concentrationNote = `The top holding dictates ${(top1Weight * 100).toFixed(1)}% of the fund. This implicitly binds the fund's performance directly to single-name tech volatility. The Bear case here involves a violent sector rotation out of mega-caps, which would drag down this entire portfolio and negate any supposed ETF diversification.`
  } else if (top1Weight > 0.10) {
    concentrationRating = 'High'; concentrationColor = '#ea580c'
    concentrationNote = `Meaningful single-stock exposure with the top asset at ${(top1Weight * 100).toFixed(1)}%. With the Top 10 making up ${(top10Weight * 100).toFixed(0)}% of assets, this fund behaves more like an active mega-cap proxy than a broad market insulator.`
  } else if (top10Weight > 0.55) {
    concentrationRating = 'Moderate'; concentrationColor = '#ca8a04'
    concentrationNote = `Top 10 holdings account for ${(top10Weight * 100).toFixed(0)}% of assets. A concentrated handful of names are actively driving the bulk of performance, maintaining a neutral balance between focus and broader stability.`
  } else {
    concentrationRating = 'Well-Spread'; concentrationColor = '#16a34a'
    concentrationNote = `Genuinely diversified. The top 10 names constitute only ${(top10Weight * 100).toFixed(0)}% of the asset base, severely limiting the blast radius if individual components suffer earnings shocks.`
  }

  // Diversification breadth
  let breadthNote
  if (trueHoldingCount === 0)       breadthNote = null
  else if (trueHoldingCount < 30)   breadthNote = `Narrow — Concentrated exposure of just ${trueHoldingCount} holdings.`
  else if (trueHoldingCount < 100)  breadthNote = `Focused — ${trueHoldingCount} holdings, delivering highly targeted sector exposure.`
  else if (trueHoldingCount < 500)  breadthNote = `Balanced — ${trueHoldingCount} holdings spread across multiple sub-sectors.`
  else                              breadthNote = `Broad — Deep systemic diversification with ${trueHoldingCount}+ underlying holdings.`

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

  const risks = []
  if (top1Weight > 0.12)    risks.push({ label: 'Concentration Risk', detail: `Single name is ${(top1Weight*100).toFixed(1)}% of the fund`, severity: 'warn' })
  if (expense != null && expense > 0.0040) risks.push({ label: 'High Fee Drag', detail: `${(expense*100).toFixed(2)}% annual cost erodes compounding`, severity: 'warn' })
  if (category === 'growth') risks.push({ label: 'Rate Sensitivity', detail: 'Growth/tech valuations compress when rates rise', severity: 'info' })
  if (category === 'bond')   risks.push({ label: 'Duration Risk', detail: 'Long-duration bonds fall when interest rates rise', severity: 'info' })
  if (category === 'intl')   risks.push({ label: 'Currency Risk', detail: 'Returns affected by USD strengthening vs foreign currencies', severity: 'info' })
  if (category === 'energy') risks.push({ label: 'Commodity Cyclicality', detail: 'Highly dependent on oil & gas price direction', severity: 'warn' })
  if (profile?.style?.startsWith('Active')) risks.push({ label: 'Active Management Risk', detail: 'Manager skill risk; historically active funds underperform over 10yr+', severity: 'warn' })

  return { category, meta, profile, expense, expenseRating, expenseColor, expenseNote, concentrationRating, concentrationColor, concentrationNote, breadthNote, risks, top1Weight, top10Weight, holdingCount: trueHoldingCount }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Replaced EtfStatPill with full-width EtfFullWidthMetric rows
function EtfFullWidthMetric({ label, value, valueColor, description, borderColor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: 'var(--surface-2, rgba(255,255,255,0.02))',
      border: '1px solid var(--border)', 
      borderLeft: `4px solid ${borderColor || 'var(--border)'}`,
      borderRadius: 8, padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--text)', fontFamily: "'DM Mono', monospace" }}>
          {value}
        </span>
      </div>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, opacity: 0.9 }}>
          {description}
        </div>
      )}
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
      borderRadius: 6, padding: '10px 12px',
    }}>
      <span style={{ fontSize: 13, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, lineHeight: 1.5, opacity: 0.9 }}>{detail}</div>
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
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        Top Holdings
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {topHoldings.map((h, i) => (
          <div key={h.ticker || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 52, flexShrink: 0 }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--surface-2, rgba(255,255,255,0.06))', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${(h.weight / maxPct) * 100}%`, background: BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1], transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>{(h.weight * 100).toFixed(1)}%</span>
            {h.name && (
              <span style={{ fontSize: 12, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, flexShrink: 1 }}>{h.name}</span>
            )}
          </div>
        ))}
      </div>
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
      borderLeft: `4px solid ${meta.color || 'var(--text)'}`,
      borderRadius: 'var(--r)', padding: '24px'
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#111', padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Fund Analysis
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--faint)' }}>
            {ticker} · ETF
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 24,
          color: meta.color, background: meta.color + '18', border: `1px solid ${meta.color}44`,
        }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* ── Tagline & Profile ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.65, margin: '0 0 8px', fontWeight: 500 }}>
          {meta.tagline}
        </p>
        {profile?.name && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
            {profile.name}{profile.benchmark ? ` · Tracks: ${profile.benchmark}` : ''}{profile.style ? ` · ${profile.style}` : ''}
          </p>
        )}
      </div>

      {/* ── Full-Width Stacked Metrics ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {expenseRating && (
          <EtfFullWidthMetric 
            label="Expense Ratio" 
            value={expenseRating} 
            valueColor={expenseColor} 
            borderColor={expenseColor}
            description={expenseNote} 
          />
        )}
        <EtfFullWidthMetric 
          label="Concentration" 
          value={concentrationRating} 
          valueColor={concentrationColor} 
          borderColor={concentrationColor}
          description={concentrationNote} 
        />
        <EtfFullWidthMetric 
          label="Volatility & Breadth" 
          value={meta.volatility} 
          valueColor={meta.riskColor} 
          borderColor={meta.riskColor}
          description={breadthNote} 
        />
      </div>

      {/* ── Risk signals ── */}
      {risks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Risk Signals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, i) => <RiskSignal key={i} {...r} />)}
          </div>
        </div>
      )}

      {/* ── Best suited for ── */}
      <div style={{
        fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6,
        background: 'var(--surface-2, rgba(255,255,255,0.03))',
        border: '1px solid var(--border)', borderRadius: 8,
        padding: '14px 18px', marginBottom: hasHoldings ? 0 : 0,
      }}>
        <strong style={{ color: 'var(--text)', fontWeight: 700 }}>Optimal Strategy Profile:</strong> {meta.bestFor}
      </div>

      {/* ── Holdings breakdown ── */}
      {hasHoldings && <EtfHoldingsBreakdown holdings={etfHoldings} />}
    </div>
  )
}

// ─── Stock assessment card ─────────────────────────────────

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
      borderLeft: `4px solid ${verdictColor}`, borderRadius: 'var(--r)',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Quantitative Assessment
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--faint)' }}>
            {ticker} · Rule-Based Engine
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 24,
            color: verdictColor, background: verdictColor + '18', border: `1px solid ${verdictColor}44`,
          }}>{verdict}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--faint)' }}>{score}/100</span>
        </div>
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--text)', margin: 0, opacity: 0.95 }}>
        {paragraph}
      </p>
    </div>
  )
}