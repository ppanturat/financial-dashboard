import { getSegmentStyle } from '../lib/stockSegments'

// ─── Stock quantitative assessment engine ───────────────────────────────────

function runFundamentalSweep(metrics = {}) {
  const sweep = []
  let bullScore = 0, bearScore = 0
  let flagCount = 0, bullCount = 0, bearCount = 0, neutralCount = 0

  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  // 1. Balance Sheet Liquidity (War Chest Ratio)
  if (wcr != null) {
    if (wcr >= 2) { 
      bullScore += 2; bullCount++;
      sweep.push({ title: 'Liquidity & Solvency', type: 'Bull', text: `Passes the balance sheet sweep with distinction, showcasing an elite cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x. Maintaining a massive net-cash position insulates the firm entirely from corporate credit market freezes and maximizes capital velocity.` }) 
    }
    else if (wcr >= 1) { 
      bullScore += 1; neutralCount++;
      sweep.push({ title: 'Liquidity & Solvency', type: 'Neutral', text: `The capital structure resides on solid footing, with liquid cash reserves fully offsetting aggregate debt obligations (${wcr.toFixed(2)}x ratio). This creates a highly stable, neutral foundation that buffers core corporate operations.` }) 
    }
    else if (wcr >= 0.5) { 
      bearScore += 1; bearCount++;
      sweep.push({ title: 'Liquidity & Solvency', type: 'Bear', text: `The capital stack reveals notable operational leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of debt liabilities. This narrow buffer poses no immediate distress but significantly restricts strategic optionality in a tight macroeconomic environment.` }) 
    }
    else { 
      bearScore += 2; flagCount++;
      sweep.push({ title: 'Liquidity & Solvency', type: 'Flag', text: `Cash reserves offset a meager ${(wcr * 100).toFixed(0)}% of total debt obligations. This aggressive structural leverage shifts the probability check heavily to the downside, exposing the equity to acute debt rollover risks or highly dilutive emergency offerings.` }) 
    }
  }

  // 2. Free Cash Flow Architecture
  if (fcf != null) {
    const b = fcf / 1e9
    if (fcf > 5e9) { 
      bullScore += 2; bullCount++;
      sweep.push({ title: 'Capital Generation', type: 'Bull', text: `Free cash flow functions as an elite structural compounding engine, printing an exceptional $${b.toFixed(1)}B on an annualized basis. This establishes an impregnable economic moat, rendering the business entirely self-funding.` }) 
    }
    else if (fcf > 0) { 
      bullScore += 1; neutralCount++;
      sweep.push({ title: 'Capital Generation', type: 'Neutral', text: `Core business operations are net-positive and self-sustaining, delivering a healthy $${b.toFixed(2)}B in free cash flow. This confirms that current customer acquisition models yield surplus capital after operational maintenance.` }) 
    }
    else if (fcf > -1e9) { 
      bearScore += 1; bearCount++;
      sweep.push({ title: 'Capital Generation', type: 'Bear', text: `Free cash flow registers an operational deficit of $${Math.abs(b).toFixed(2)}B. While aggressive cash burn can be acceptable for infrastructure plays scaling backlogs, this structure demands near-flawless execution to avoid becoming a capital trap.` }) 
    }
    else { 
      bearScore += 2; flagCount++;
      sweep.push({ title: 'Capital Generation', type: 'Flag', text: `The enterprise is enduring a severe, systemic capital drain, burning through a massive $${Math.abs(b).toFixed(1)}B in FCF annually. Without a definitive path to operating leverage, this magnitude of cash destruction forces perpetual dependence on external equity.` }) 
    }
  }

  // 3. Unit Economics & Margins
  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) { 
      bullScore += 2; bullCount++;
      sweep.push({ title: 'Unit Economics', type: 'Bull', text: `A stellar gross margin of ${pct}% confirms dominant pricing power. This profile creates a massive financial cushion capable of absorbing sudden upstream cost spikes or intense inflationary pressures without degrading bottom-line profitability.` }) 
    }
    else if (gm > 0.3) { 
      bullScore += 1; neutralCount++;
      sweep.push({ title: 'Unit Economics', type: 'Neutral', text: `The gross margin of ${pct}% demonstrates a stable and healthy spread between gross revenues and primary cost of goods sold, indicating robust baseline efficiency.` }) 
    }
    else if (gm > 0.1) { 
      bearScore += 1; bearCount++;
      sweep.push({ title: 'Unit Economics', type: 'Bear', text: `Operating on compressed gross margins of ${pct}% leaves the company with zero margin for error. A lack of structural pricing power makes the business acutely vulnerable to minor escalations in raw input costs.` }) 
    }
    else { 
      bearScore += 2; flagCount++;
      sweep.push({ title: 'Unit Economics', type: 'Flag', text: `The severely depressed gross margin of ${pct}% exposes structurally broken unit economics. The company cannot generate enough gross spread to support its fixed overhead and debt service over a sustainable horizon.` }) 
    }
  }

  // 4. Valuation Multiples (Forward P/E)
  if (pe != null && pe > 0) {
    if (pe < 15) { 
      bullScore += 2; bullCount++;
      sweep.push({ title: 'Valuation Profile', type: 'Bull', text: `At a forward P/E of ${pe.toFixed(1)}x, the current market pricing factors in a deep structural margin of safety, offering highly asymmetric upside if earnings stabilize or stage a modest recovery.` }) 
    }
    else if (pe < 30) { 
      bullScore += 1; neutralCount++;
      sweep.push({ title: 'Valuation Profile', type: 'Neutral', text: `The forward P/E of ${pe.toFixed(1)}x reflects a thoroughly reasonable and grounded valuation. The market is assigning a standard equity growth premium without embedding hyper-extended operational targets.` }) 
    }
    else if (pe < 50) { 
      bearScore += 1; bearCount++;
      sweep.push({ title: 'Valuation Profile', type: 'Bear', text: `Trading at an elevated forward P/E of ${pe.toFixed(1)}x, the equity embeds steep growth expectations. Any minor earnings deceleration at these valuation heights will trigger rapid multiple compression.` }) 
    }
    else { 
      bearScore += 2; flagCount++;
      sweep.push({ title: 'Valuation Profile', type: 'Flag', text: `A hyper-extended forward P/E of ${pe.toFixed(1)}x prices in absolute operational perfection. The stock completely lacks a fundamental valuation floor, rendering it profoundly vulnerable to macro shocks or momentum unwinds.` }) 
    }
  }

  // 5. Growth Velocity (Revenue YoY)
  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) { 
      bullScore += 2; bullCount++;
      sweep.push({ title: 'Growth Velocity', type: 'Bull', text: `Top-line revenue expansion of ${pct}% YoY places the firm in hypergrowth territory. Demand is accelerating linearly, proving that the business is scaling market share rapidly.` }) 
    }
    else if (rev > 0.08) { 
      bullScore += 1; neutralCount++;
      sweep.push({ title: 'Growth Velocity', type: 'Neutral', text: `A reliable year-over-year revenue expansion of ${pct}% points to stable product-market fit and structured, programmatic execution across core regional segments.` }) 
    }
    else if (rev >= 0) { 
      bearScore += 1; bearCount++;
      sweep.push({ title: 'Growth Velocity', type: 'Bear', text: `Revenue growth has decelerated to a modest ${pct}% YoY. This top-line stagnation signals that the addressable market may be approaching near-term saturation or encountering fierce competitive headwinds.` }) 
    }
    else { 
      bearScore += 2; flagCount++;
      sweep.push({ title: 'Growth Velocity', type: 'Flag', text: `Revenue contracted by ${Math.abs(pct)}% YoY. Active demand destruction or structural market share erosion represents a severe fundamental decay that must be decisively reversed.` }) 
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

  // Dynamic Bear vs. Bull Probability Synthesis
  let probabilityText = ''
  if (flagCount > 0) {
    probabilityText = `Terminal Red Flag detected. The Bear case heavily outweighs Bull probabilities due to acute structural constraints. Strict capital protection is advised.`
  } else if (bullCount > bearCount * 2) {
    probabilityText = `The Bull case probability is highly dominant. The fundamental architecture presents robust, self-sustaining upside with heavily insulated downside risk.`
  } else if (bullCount > bearCount) {
    probabilityText = `The Bull case probability remains favorable. Operational strengths outnumber identified risks, supporting a constructive outlook.`
  } else if (bearCount > bullCount) {
    probabilityText = `The Bear case probability is currently elevated. Material downside risks and operational constraints demand strict neutrality and defensive sizing.`
  } else {
    probabilityText = `Bear and Bull probabilities are evenly matched. The asset presents a strictly neutral risk/reward profile requiring patient observation.`
  }

  const closers = {
    'Strong Buy':    'The quantitative rules confirm an elite fundamental asset exhibiting high capital velocity, robust structural protection, and zero systemic flags.',
    'Bullish':       'The core quantitative metrics support a constructive growth outlook, though position sizes should account for standard baseline market risks.',
    'Neutral':       'Genuine core strengths are actively offset by explicit valuation or cash burn constraints, justifying a highly patient, non-directional accumulation approach.',
    'Caution':       'Risk indicators are multiplying across structural lines. Capital preservation dictates waiting for a deeper valuation discount or an explicit operational catalyst.',
    'Risk Elevated': 'Systemic financial stressors are compounding simultaneously. The mathematical risk of sudden capital impairment heavily outweighs technical upside under current constraints.',
  }

  return { sweep, probabilityText, verdict, score, verdictColor, closer: closers[verdict] }
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

  const expense = profile?.expense ?? null
  let expenseRating = null, expenseColor = null, expenseNote = null
  if (expense != null) {
    const expensePctStr = (expense * 100).toFixed(2)
    if (expense <= 0.0005) { 
      expenseRating = 'Ultra-Low'; expenseColor = '#16a34a'; 
      expenseNote = `${expensePctStr}% management fee. This marks an industry-leading cost structure that maximizes capital compounding velocity over a 10-to-30 year timeline. By losing virtually nothing to administrative frictional leakage, your capital retains total transactional efficiency and captures the complete un-diluted index risk premium.` 
    }
    else if (expense <= 0.0015) { 
      expenseRating = 'Low'; expenseColor = '#22c55e'; 
      expenseNote = `${expensePctStr}% management fee. Highly competitive cost-to-exposure structure. Long-term fee friction remains entirely negligible, allowing underlying asset appreciation to drive portfolio compounding without notable performance drag.` 
    }
    else if (expense <= 0.0040) { 
      expenseRating = 'Moderate'; expenseColor = '#ca8a04'; 
      expenseNote = `${expensePctStr}% management fee. Acceptable threshold for specialized thematic or sector-targeted funds. However, over multi-decade horizons, this structural leakage requires consistent sector outperformance to compensate for the fee headwind against ultra-low-cost broad market wrappers.` 
    }
    else if (expense <= 0.0075) { 
      expenseRating = 'High'; expenseColor = '#ea580c'; 
      expenseNote = `${expensePctStr}% management fee. Highly elevated expense drag. You are surrendering approximately ~$${(expense * 10000).toFixed(0)} for every $10,000 invested annually to fund operations. This creates a persistent structural leak that severely undermines long-term compounding efficiency unless the manager generates major structural alpha.` 
    }
    else { 
      expenseRating = 'Very High'; expenseColor = '#dc2626'; 
      expenseNote = `${expensePctStr}% management fee. Punishing fee architecture that represents a serious structural flag. This intense friction directly cannibalizes real historical equity returns, forcing the underlying assets to severely beat benchmark alternatives simply to break even after fund overhead.` 
    }
  }

  let concentrationRating, concentrationColor, concentrationNote
  if (top1Weight > 0.15) {
    concentrationRating = 'Very High'; concentrationColor = '#dc2626'
    concentrationNote = `Extreme structural concentration: a single name commands ${(top1Weight * 100).toFixed(1)}% of the entire fund. This builds a systemic vulnerability, binding your portfolio returns directly to single-firm operational flaws, earnings misses, or regulatory/antitrust volatility. A sudden 20% drawdown in this leading component unilaterally moves the entire fund by ~${(top1Weight * 20).toFixed(1)}%, breaking broad economic diversification.`
  } else if (top1Weight > 0.10) {
    concentrationRating = 'High'; concentrationColor = '#ea580c'
    concentrationNote = `Significant single-stock exposure with the top asset anchoring ${(top1Weight * 100).toFixed(1)}% of capital. With the top 10 assets dominating ${(top10Weight * 100).toFixed(0)}% of the total index, this vehicle acts as a concentrated macro proxy for tech-titan momentum rather than providing true structural market insulation.`
  } else if (top10Weight > 0.55) {
    concentrationRating = 'Moderate'; concentrationColor = '#ca8a04'
    concentrationNote = `Top 10 components control ${(top10Weight * 100).toFixed(0)}% of aggregated assets. Performance is actively dictated by a select cohort of institutional heavyweights, striking a functional balance between concentrated growth themes and baseline structural asset protection.`
  } else {
    concentrationRating = 'Well-Spread'; concentrationColor = '#16a34a'
    concentrationNote = `Genuinely diversified architecture. The top 10 components constitute only ${(top10Weight * 100).toFixed(0)}% of total capital allocations. The individual blast radius of corporate operational failures or sector shocks is thoroughly dampened, offering true broad-market macro insulation.`
  }

  let breadthNote
  if (trueHoldingCount === 0)       breadthNote = null
  else if (trueHoldingCount < 30)   breadthNote = `Narrow Diversification — Highly concentrated baseline of just ${trueHoldingCount} structural positions.`
  else if (trueHoldingCount < 100)  breadthNote = `Focused Breadth — ${trueHoldingCount} unique positions, creating targeted exposure without over-diluting conviction.`
  else if (trueHoldingCount < 500)  breadthNote = `Balanced Breadth — Robust allocation across ${trueHoldingCount} corporate equities to distribute underlying idiosyncratic risks.`
  else                              breadthNote = `Broad Systemic Breadth — Institutional-scale diversification tracking ${trueHoldingCount}+ components for complete macroeconomic representation.`

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

function EtfFullWidthMetric({ label, value, valueColor, description, borderColor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: 'var(--surface-2, rgba(255,255,255,0.02))',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${borderColor || 'var(--border)'}`,
      borderRadius: 8, padding: '14px 18px', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: valueColor || 'var(--text)', fontFamily: "var(--font-body), monospace" }}>
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

function AssessmentBadge({ type }) {
  const badgeMap = {
    'Bull': { bg: '#16a34a14', border: '#16a34a33', color: '#16a34a', icon: '↗' },
    'Neutral': { bg: '#ca8a0414', border: '#ca8a0433', color: '#ca8a04', icon: '—' },
    'Bear': { bg: '#ea580c14', border: '#ea580c33', color: '#ea580c', icon: '↘' },
    'Flag': { bg: '#dc262614', border: '#dc262633', color: '#dc2626', icon: '⚠' },
  }
  
  const style = badgeMap[type]
  if (!style) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 80, height: 22, borderRadius: 12, 
      background: style.bg, border: `1px solid ${style.border}`,
      color: style.color, fontSize: 10, fontWeight: 700, 
      textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0
    }}>
      <span style={{ marginRight: 4, fontSize: 11 }}>{style.icon}</span>
      {type}
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
            <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 52, flexShrink: 0 }}>{h.ticker}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--surface-2, rgba(255,255,255,0.06))', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${(h.weight / maxPct) * 100}%`, background: BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1], transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 12, color: 'var(--faint)', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>{(h.weight * 100).toFixed(1)}%</span>
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
      borderTop: '3px solid #111',
      borderRadius: 'var(--r)', padding: '24px', boxSizing: 'border-box'
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#111', padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Fund Analysis
          </span>
          <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 13, color: 'var(--faint)' }}>
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
            label="Expense Ratio Efficiency" 
            value={expenseRating} 
            valueColor={expenseColor} 
            borderColor={expenseColor}
            description={expenseNote} 
          />
        )}
        <EtfFullWidthMetric 
          label="Index Concentration Structural Risk" 
          value={concentrationRating} 
          valueColor={concentrationColor} 
          borderColor={concentrationColor}
          description={concentrationNote} 
        />
        <EtfFullWidthMetric 
          label="Volatility & Asset Breadth" 
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
            Systemic Risk Signals
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
        <strong style={{ color: 'var(--text)', fontWeight: 700 }}>Optimal Portfolio Strategy Fit:</strong> {meta.bestFor}
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

  const result = runFundamentalSweep(metrics)
  if (!result) return null

  const { sweep, probabilityText, verdict, score, verdictColor, closer } = result

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: '3px solid #111',
      borderRadius: 'var(--r)',
      padding: '24px', boxSizing: 'border-box'
    }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Quantitative Assessment
          </span>
          <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 13, color: 'var(--faint)' }}>
            {ticker} · Rule-Based Engine
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 24,
            color: verdictColor, background: verdictColor + '18', border: `1px solid ${verdictColor}44`,
          }}>{verdict}</span>
          <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 13, color: 'var(--faint)' }}>{score}/100</span>
        </div>
      </div>

      {/* ── Fundamental Sweep Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        {sweep.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AssessmentBadge type={item.type} />
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', opacity: 0.95 }}>
              <strong style={{ color: 'var(--text)' }}>{item.title}:</strong> {item.text}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bear vs. Bull Probability Check ── */}
      <div style={{ 
        background: 'var(--surface-2, rgba(255,255,255,0.02))', 
        border: '1px solid var(--border)', 
        borderTop: '3px solid var(--muted)',
        borderRadius: 8, padding: '16px', marginBottom: 20,
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Bear vs. Bull Probability Check
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', opacity: 0.9 }}>
          {probabilityText}
        </div>
      </div>

      {/* ── Final Verdict ── */}
      <div style={{ 
        paddingTop: 20, 
        borderTop: '1px solid var(--border)',
        fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)'
      }}>
        <strong style={{ color: verdictColor }}>Final Verdict:</strong> {closer}
      </div>

    </div>
  )
}