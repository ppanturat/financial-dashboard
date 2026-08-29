/**
 * pure deterministic, rule-based assessment engine — no AI/LLM APIs, all text
 * is pre-written and triggered by mathematical thresholds on raw metrics.
 *
 * exports:
 *   runAdoptionCheck(metrics)        -> module A result or null
 *   runTerminalRedFlagSweep(metrics) -> module B result or null
 *   runFundamentalSweep(metrics)     -> full 5-point sweep
 *   evaluateBuySignal(ticker)        -> module C (technical trigger), async boolean
 *   calculateAltmanZScore(inputs)      -> Altman Z bankruptcy-risk model
 *   calculatePiotroskiFScore(inputs)   -> Piotroski F fundamental-strength model
 *   calculateBeneishMScore(inputs)     -> Beneish M earnings-manipulation model
 *
 * NOTE on the three quant models below: they are deliberately kept OUT of
 * runFundamentalSweep()'s 0-100 weighted score. That score blends continuous
 * metrics (margins, P/E, growth) using a linear weighted average — Z/F/M are
 * categorical/binary composite models with their own internal weighting and
 * threshold semantics (a Z-Score "Grey Zone" isn't a percentage point on the
 * same scale as a P/E ratio). Folding them in would silently distort both.
 * They're surfaced instead as standalone cards (see QuantModelsCards.jsx).
 */

import { api } from './api'

// helpers

/** formats an absolute dollar value, e.g. $4.2B, $320M */
function fmtDollars(val) {
  if (val == null) return '?'
  const abs = Math.abs(val)
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toFixed(0)}`
}

/** formats a fraction as a percentage string, e.g. 0.23 -> "23.0%" */
function fmtPct(val, decimals = 1) {
  if (val == null) return '?%'
  return `${(val * 100).toFixed(decimals)}%`
}

// module A: adoption reality check

/**
 * rule: if revenue YoY growth < 15% and R&D spend > gross profit, return a
 * warning text block.
 *
 * @param {object} metrics - raw metrics from the /api/data endpoint
 * @returns {{ triggered: boolean, severity: string, title: string, text: string } | null}
 */
export function runAdoptionCheck(metrics = {}) {
  const rev = metrics.revenue_yoy        // fraction, e.g. 0.12 = 12%
  const rd  = metrics.research_development // absolute $
  const gp  = metrics.gross_profit        // absolute $

  // need revenue YoY to run any check
  if (rev == null) return null

  const lowGrowth = rev < 0.15
  const rdExceedsGP = rd != null && gp != null && Math.abs(rd) > Math.abs(gp)

  if (lowGrowth && rdExceedsGP) {
    const rdStr = fmtDollars(Math.abs(rd))
    const gpStr = fmtDollars(Math.abs(gp))
    const revStr = fmtPct(rev)

    return {
      triggered: true,
      severity: 'warning',
      title: 'High-Risk Science Project',
      text: `Massive R&D expenditure (${rdStr}) with minimal market adoption signals a high-risk science project profile. `
        + `Gross profit of ${gpStr} is being outpaced by the R&D burn, confirming that the technology has not yet been commercially validated at scale. `
        + `Revenue growth of ${revStr} YoY falls well short of the 15% threshold expected of companies justifying this level of experimental spend. `
        + `Until the company demonstrates repeatable customer acquisition at margins that exceed R&D drag, the equity functions more as a venture bet than a durable compounder.`,
    }
  }

  // partial trigger: low growth without extreme R&D
  if (lowGrowth && rev >= 0) {
    return {
      triggered: false,
      severity: 'caution',
      title: 'Adoption Velocity Check',
      text: `Revenue growth of ${fmtPct(rev)} YoY sits below the 15% adoption velocity threshold. `
        + `While R&D spending relative to gross profit does not yet trigger a terminal science-project flag, `
        + `the deceleration in top-line momentum demands monitoring for further market saturation signals.`,
    }
  }

  if (rev < 0) {
    return {
      triggered: true,
      severity: 'danger',
      title: 'Negative Adoption Signal',
      text: `Revenue contracted ${fmtPct(Math.abs(rev))} YoY — an active demand destruction signal. `
        + `This reversal is the most severe form of adoption failure, indicating the company is losing, not gaining, commercial ground.`,
    }
  }

  // growth is healthy (>= 15%), no flag
  return {
    triggered: false,
    severity: 'pass',
    title: 'Adoption Reality Check',
    text: `Revenue growth of ${fmtPct(rev)} YoY clears the 15% commercial adoption threshold. `
      + `The business is demonstrating sufficient market penetration velocity to justify its current operating structure.`,
  }
}

// module B: terminal red flag sweep

/**
 * rule: cash runway = total cash / |negative FCF|; runway < 1.5 years is a
 * critical red flag (dilution risk).
 *
 * @param {object} metrics
 * @returns {{ triggered: boolean, severity: string, title: string, text: string, runway: number|null } | null}
 */
export function runTerminalRedFlagSweep(metrics = {}) {
  const fcf   = metrics.fcf          // absolute $, negative = burning cash
  const cash  = metrics.total_cash   // absolute $
  const debt  = metrics.total_debt   // absolute $

  if (fcf == null || cash == null) return null

  // only applies when FCF is negative (burning cash)
  if (fcf >= 0) {
    return {
      triggered: false,
      severity: 'pass',
      title: 'Terminal Red Flag Sweep',
      text: `Free cash flow is positive (${fmtDollars(fcf)}). No imminent liquidity crisis detected. `
        + `The company is self-funding operations and does not require external capital raises to sustain current activities.`,
      runway: null,
    }
  }

  const absoluteFcfBurn = Math.abs(fcf)
  const runway = cash / absoluteFcfBurn  // in years

  if (runway < 1.5) {
    const debtStr  = debt != null ? fmtDollars(debt) : 'unknown'
    const cashStr  = fmtDollars(cash)
    const burnStr  = fmtDollars(absoluteFcfBurn)
    const runwayMo = Math.round(runway * 12)

    return {
      triggered: true,
      severity: 'danger',
      title: 'Terminal Red Flag: Cash Runway < 18 Months',
      text: `With ${cashStr} in cash and an annualised FCF burn of ${burnStr}, the company has approximately `
        + `${runwayMo} months of operational runway before requiring external capital. `
        + `This places the equity on imminent shareholder dilution watch. Management will be compelled to issue new equity, `
        + `execute convertible debt raises, or pursue emergency credit facilities — all of which structurally impair existing shareholders. `
        + `With ${debtStr} in existing debt obligations, the capital structure leaves virtually zero margin for operational missteps. `
        + `Treat any position sizing here as high-conviction speculative exposure only.`,
      runway,
    }
  }

  // between 1.5 and 3 years, caution zone
  if (runway < 3) {
    return {
      triggered: false,
      severity: 'caution',
      title: 'Cash Runway: Caution Zone',
      text: `Cash runway of ${runway.toFixed(1)} years is above the critical 1.5-year threshold but warrants active monitoring. `
        + `At the current FCF burn of ${fmtDollars(absoluteFcfBurn)} per year, the company will need to demonstrate a path to profitability `
        + `or execute a capital raise within the next ${Math.round(runway * 12)} months to avoid a Terminal Red Flag status.`,
      runway,
    }
  }

  // comfortable runway
  return {
    triggered: false,
    severity: 'pass',
    title: 'Terminal Red Flag Sweep',
    text: `Cash runway of ${runway.toFixed(1)} years comfortably exceeds the 1.5-year critical threshold. `
      + `Despite a current FCF deficit of ${fmtDollars(absoluteFcfBurn)} annually, the company retains sufficient liquidity `
      + `to fund operations without forced dilutive capital raises in the near term.`,
    runway,
  }
}

// full fundamental sweep

/** runs all 5 core sweep checks (liquidity, FCF, margins, valuation, growth); null if no metrics available */
export function runFundamentalSweep(metrics = {}) {
  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  const sweep = []
  let flagCount = 0, bullCount = 0, bearCount = 0, neutralCount = 0

  // 1. balance sheet liquidity
  if (wcr != null) {
    if (wcr >= 2) {
      bullCount++
      sweep.push({ title: 'Liquidity & Solvency', type: 'Bull', text: `Passes the balance sheet sweep with distinction, showcasing an elite cash-to-debt ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x. Maintaining a massive net-cash position insulates the firm entirely from corporate credit market freezes and maximizes capital velocity.` })
    } else if (wcr >= 1) {
      neutralCount++
      sweep.push({ title: 'Liquidity & Solvency', type: 'Neutral', text: `The capital structure resides on solid footing, with liquid cash reserves fully offsetting aggregate debt obligations (${wcr.toFixed(2)}x ratio). This creates a highly stable, neutral foundation that buffers core corporate operations.` })
    } else if (wcr >= 0.5) {
      bearCount++
      sweep.push({ title: 'Liquidity & Solvency', type: 'Bear', text: `The capital stack reveals notable operational leverage, with cash covering only ${(wcr * 100).toFixed(0)}% of debt liabilities. This narrow buffer poses no immediate distress but significantly restricts strategic optionality in a tight macroeconomic environment.` })
    } else {
      flagCount++
      sweep.push({ title: 'Liquidity & Solvency', type: 'Flag', text: `Cash reserves offset a meager ${(wcr * 100).toFixed(0)}% of total debt obligations. This aggressive structural leverage shifts the probability check heavily to the downside, exposing the equity to acute debt rollover risks or highly dilutive emergency offerings.` })
    }
  }

  // 2. free cash flow
  if (fcf != null) {
    if (fcf > 5e9) {
      bullCount++
      sweep.push({ title: 'Capital Generation', type: 'Bull', text: `Free cash flow functions as an elite structural compounding engine, printing an exceptional ${fmtDollars(fcf)} on an annualized basis. This establishes an impregnable economic moat, rendering the business entirely self-funding.` })
    } else if (fcf > 0) {
      neutralCount++
      sweep.push({ title: 'Capital Generation', type: 'Neutral', text: `Core business operations are net-positive and self-sustaining, delivering a healthy ${fmtDollars(fcf)} in free cash flow. This confirms that current customer acquisition models yield surplus capital after operational maintenance.` })
    } else if (fcf > -1e9) {
      bearCount++
      sweep.push({ title: 'Capital Generation', type: 'Bear', text: `Free cash flow registers an operational deficit of ${fmtDollars(Math.abs(fcf))}. While aggressive cash burn can be acceptable for infrastructure plays scaling backlogs, this structure demands near-flawless execution to avoid becoming a capital trap.` })
    } else {
      flagCount++
      sweep.push({ title: 'Capital Generation', type: 'Flag', text: `The enterprise is enduring a severe, systemic capital drain, burning through a massive ${fmtDollars(Math.abs(fcf))} in FCF annually. Without a definitive path to operating leverage, this magnitude of cash destruction forces perpetual dependence on external equity.` })
    }
  }

  // 3. unit economics
  if (gm != null) {
    const pct = (gm * 100).toFixed(1)
    if (gm > 0.6) {
      bullCount++
      sweep.push({ title: 'Unit Economics', type: 'Bull', text: `A stellar gross margin of ${pct}% confirms dominant pricing power. This profile creates a massive financial cushion capable of absorbing sudden upstream cost spikes or intense inflationary pressures without degrading bottom-line profitability.` })
    } else if (gm > 0.3) {
      neutralCount++
      sweep.push({ title: 'Unit Economics', type: 'Neutral', text: `The gross margin of ${pct}% demonstrates a stable and healthy spread between gross revenues and primary cost of goods sold, indicating robust baseline efficiency.` })
    } else if (gm > 0.1) {
      bearCount++
      sweep.push({ title: 'Unit Economics', type: 'Bear', text: `Operating on compressed gross margins of ${pct}% leaves the company with zero margin for error. A lack of structural pricing power makes the business acutely vulnerable to minor escalations in raw input costs.` })
    } else {
      flagCount++
      sweep.push({ title: 'Unit Economics', type: 'Flag', text: `The severely depressed gross margin of ${pct}% exposes structurally broken unit economics. The company cannot generate enough gross spread to support its fixed overhead and debt service over a sustainable horizon.` })
    }
  }

  // 4. valuation
  if (pe != null && pe > 0) {
    if (pe < 15) {
      bullCount++
      sweep.push({ title: 'Valuation Profile', type: 'Bull', text: `At a forward P/E of ${pe.toFixed(1)}x, the current market pricing factors in a deep structural margin of safety, offering highly asymmetric upside if earnings stabilize or stage a modest recovery.` })
    } else if (pe < 30) {
      neutralCount++
      sweep.push({ title: 'Valuation Profile', type: 'Neutral', text: `The forward P/E of ${pe.toFixed(1)}x reflects a thoroughly reasonable and grounded valuation. The market is assigning a standard equity growth premium without embedding hyper-extended operational targets.` })
    } else if (pe < 50) {
      bearCount++
      sweep.push({ title: 'Valuation Profile', type: 'Bear', text: `Trading at an elevated forward P/E of ${pe.toFixed(1)}x, the equity embeds steep growth expectations. Any minor earnings deceleration at these valuation heights will trigger rapid multiple compression.` })
    } else {
      flagCount++
      sweep.push({ title: 'Valuation Profile', type: 'Flag', text: `A hyper-extended forward P/E of ${pe.toFixed(1)}x prices in absolute operational perfection. The stock completely lacks a fundamental valuation floor, rendering it profoundly vulnerable to macro shocks or momentum unwinds.` })
    }
  }

  // 5. growth velocity
  if (rev != null) {
    const pct = (rev * 100).toFixed(1)
    if (rev > 0.25) {
      bullCount++
      sweep.push({ title: 'Growth Velocity', type: 'Bull', text: `Top-line revenue expansion of ${pct}% YoY places the firm in hypergrowth territory. Demand is accelerating linearly, proving that the business is scaling market share rapidly.` })
    } else if (rev > 0.08) {
      neutralCount++
      sweep.push({ title: 'Growth Velocity', type: 'Neutral', text: `A reliable year-over-year revenue expansion of ${pct}% points to stable product-market fit and structured, programmatic execution across core regional segments.` })
    } else if (rev >= 0) {
      bearCount++
      sweep.push({ title: 'Growth Velocity', type: 'Bear', text: `Revenue growth has decelerated to a modest ${pct}% YoY. This top-line stagnation signals that the addressable market may be approaching near-term saturation or encountering fierce competitive headwinds.` })
    } else {
      flagCount++
      sweep.push({ title: 'Growth Velocity', type: 'Flag', text: `Revenue contracted by ${Math.abs(pct)}% YoY. Active demand destruction or structural market share erosion represents a severe fundamental decay that must be decisively reversed.` })
    }
  }

  // score calculation
  const fcfWeight = fcf != null ? (fcf > 5e9 ? 2 : fcf > 0 ? 1 : fcf > -1e9 ? -1 : -2) : 0
  const gmWeight  = gm  != null ? (gm > 0.6 ? 2 : gm > 0.3 ? 1 : gm > 0.1 ? -1 : -2) : 0
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

  let probabilityText
  if (flagCount > 0) {
    probabilityText = 'Terminal Red Flag detected. The Bear case heavily outweighs Bull probabilities due to acute structural constraints. Strict capital protection is advised.'
  } else if (bullCount > bearCount * 2) {
    probabilityText = 'The Bull case probability is highly dominant. The fundamental architecture presents robust, self-sustaining upside with heavily insulated downside risk.'
  } else if (bullCount > bearCount) {
    probabilityText = 'The Bull case probability remains favorable. Operational strengths outnumber identified risks, supporting a constructive outlook.'
  } else if (bearCount > bullCount) {
    probabilityText = 'The Bear case probability is currently elevated. Material downside risks and operational constraints demand strict neutrality and defensive sizing.'
  } else {
    probabilityText = 'Bear and Bull probabilities are evenly matched. The asset presents a strictly neutral risk/reward profile requiring patient observation.'
  }

  const closers = {
    'Strong Buy':    'The quantitative rules confirm an elite fundamental asset exhibiting high capital velocity, robust structural protection, and zero systemic flags.',
    'Bullish':       'The core quantitative metrics support a constructive growth outlook, though position sizes should account for standard baseline market risks.',
    'Neutral':       'Genuine core strengths are actively offset by explicit valuation or cash burn constraints, justifying a highly patient, non-directional accumulation approach.',
    'Caution':       'Risk indicators are multiplying across structural lines. Capital preservation dictates waiting for a deeper valuation discount or an explicit operational catalyst.',
    'Risk Elevated': 'Systemic financial stressors are compounding simultaneously. The mathematical risk of sudden capital impairment heavily outweighs technical upside under current constraints.',
  }

  return {
    sweep,
    probabilityText,
    verdict,
    score,
    verdictColor,
    closer: closers[verdict],
    bullCount,
    bearCount,
    flagCount,
    neutralCount,
  }
}


// module C: technical trigger (RSI / SMA / volume breakout) — needs daily
// price/volume history, so it fetches its own data via GET /api/technicals/{ticker}

/** simple moving average over the trailing `period` values */
function calculateSMA(values, period) {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

/** wilder's RSI as a full series (not just latest) so callers can check for a threshold crossing; rsiSeries[k] corresponds to closes[period + k] */
function calculateRSISeries(closes, period = 14) {
  if (closes.length < period + 1) return []

  let gainSum = 0, lossSum = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gainSum += diff
    else lossSum -= diff
  }
  let avgGain = gainSum / period
  let avgLoss = lossSum / period

  const toRSI = (gain, loss) => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss))
  const series = [toRSI(avgGain, avgLoss)]

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    // wilder smoothing, same method the backend's fear & greed RSI uses
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    series.push(toRSI(avgGain, avgLoss))
  }
  return series
}

// fetches technicals and returns each criterion + the final signal
export async function evaluateTechnicalSignal(ticker) {
  const empty = { rsiCrossedUp: false, aboveSMA50: false, volumeSpike: false, signal: false, rsi: null, sma50: null, currentPrice: null, avgVolume20: null, todayVolume: null }
  try {
    const data    = await api.technicals(ticker)
    const closes  = data?.closes  ?? []
    const volumes = data?.volumes ?? []

    // need 50 days for SMA-50, 21 days (20 + today) for volume avg
    if (closes.length < 50 || volumes.length < 21) return empty

    const rsiSeries = calculateRSISeries(closes, 14)
    if (rsiSeries.length < 4) return empty
    const lastFourRSI = rsiSeries.slice(-4) // 3 day-over-day transitions
    let rsiCrossedUp = false
    for (let i = 1; i < lastFourRSI.length; i++) {
      if (lastFourRSI[i - 1] < 30 && lastFourRSI[i] >= 30) { rsiCrossedUp = true; break }
    }

    const sma50        = calculateSMA(closes, 50)
    const currentPrice = closes[closes.length - 1]
    const aboveSMA50    = sma50 != null && currentPrice > sma50

    const priorVolumes = volumes.slice(-21, -1) // 20 days before today
    const avgVolume20  = priorVolumes.length === 20 ? priorVolumes.reduce((sum, v) => sum + v, 0) / 20 : null
    const todayVolume  = volumes[volumes.length - 1]
    const volumeSpike   = avgVolume20 != null && todayVolume >= avgVolume20 * 1.10

    return {
      rsiCrossedUp, aboveSMA50, volumeSpike,
      signal: rsiCrossedUp && aboveSMA50 && volumeSpike,
      rsi: rsiSeries[rsiSeries.length - 1], sma50, currentPrice, avgVolume20, todayVolume,
    }
  } catch (err) {
    console.error(`[TechnicalTriggerModule] evaluateTechnicalSignal failed for ${ticker}:`, err)
    return empty
  }
}

/**
 * returns true only if all 3 hold: 14-day rsi crossed 30 from below within
 * the last 3 days, price above 50-day sma, and volume >= 110% of the
 * trailing 20-day average.
 */
export async function evaluateBuySignal(ticker) {
  const result = await evaluateTechnicalSignal(ticker)
  return result.signal
}


// ─────────────────────────────────────────────────────────────────────────────
// module D: quant/academic composite models — Altman Z, Piotroski F, Beneish M
//
// Unlike modules A-C above, these are established third-party academic models
// with fixed published coefficients (Altman 1968, Piotroski 2000, Beneish
// 1999). Each function takes the raw *_inputs object returned by the backend
// (see api/index.py's _build_quant_model_inputs) and returns null if that
// object is null/incomplete — no partial calculations are ever surfaced.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Altman Z-Score — bankruptcy/distress risk, single period.
 * Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
 *   A = Working Capital / Total Assets
 *   B = Retained Earnings / Total Assets
 *   C = EBIT / Total Assets
 *   D = Market Cap / Total Liabilities
 *   E = Revenue / Total Assets
 * Zones: Z > 2.99 Safe · 1.81-2.99 Grey · Z < 1.81 Distress
 *
 * @param {object|null} inputs - altman_inputs from the backend
 */
export function calculateAltmanZScore(inputs) {
  if (!inputs) return null
  const {
    total_assets, total_liabilities, retained_earnings,
    working_capital, ebit, market_cap, total_revenue,
  } = inputs

  const required = [total_assets, total_liabilities, retained_earnings, working_capital, ebit, market_cap, total_revenue]
  if (required.some(v => v == null) || total_assets === 0 || total_liabilities === 0) return null

  const A = working_capital / total_assets
  const B = retained_earnings / total_assets
  const C = ebit / total_assets
  const D = market_cap / total_liabilities
  const E = total_revenue / total_assets

  const z = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E

  let zone, label, color, text
  if (z > 2.99) {
    zone = 'safe'; label = 'Safe Zone'; color = '#16a34a'
    text = `A Z-Score of ${z.toFixed(2)} sits comfortably in the Safe Zone (above 2.99), indicating a low statistical probability of bankruptcy within the next two years based on Altman's original discriminant model.`
  } else if (z >= 1.81) {
    zone = 'grey'; label = 'Grey Zone'; color = '#ca8a04'
    text = `A Z-Score of ${z.toFixed(2)} falls in the Grey Zone (1.81–2.99) — neither clearly safe nor clearly distressed. The model recommends closer scrutiny of liquidity and leverage trends rather than a binary read.`
  } else {
    zone = 'distress'; label = 'Distress Zone'; color = '#dc2626'
    text = `A Z-Score of ${z.toFixed(2)} falls in the Distress Zone (below 1.81), the band Altman's model associates with meaningfully elevated bankruptcy risk over a two-year horizon.`
  }

  return {
    score: Math.round(z * 100) / 100,
    zone, label, color, text,
    components: {
      workingCapitalToAssets: A,
      retainedEarningsToAssets: B,
      ebitToAssets: C,
      marketCapToLiabilities: D,
      salesToAssets: E,
    },
  }
}

/**
 * Piotroski F-Score — 9-point fundamental-strength checklist, current vs
 * prior period. 1 point per passed test, summed 0-9.
 *
 * @param {object|null} inputs - piotroski_inputs from the backend
 */
export function calculatePiotroskiFScore(inputs) {
  if (!inputs) return null
  const {
    net_income, net_income_prior,
    total_assets, total_assets_prior,
    operating_cash_flow,
    long_term_debt, long_term_debt_prior,
    current_assets, current_assets_prior,
    current_liabilities, current_liabilities_prior,
    shares_outstanding, shares_outstanding_prior,
    gross_margin, gross_margin_prior,
    asset_turnover, asset_turnover_prior,
  } = inputs

  const required = [
    net_income, net_income_prior, total_assets, total_assets_prior, operating_cash_flow,
    long_term_debt, long_term_debt_prior, current_assets, current_assets_prior,
    current_liabilities, current_liabilities_prior, shares_outstanding, shares_outstanding_prior,
    gross_margin, gross_margin_prior, asset_turnover, asset_turnover_prior,
  ]
  if (required.some(v => v == null) || total_assets === 0 || total_assets_prior === 0) return null
  if (current_liabilities === 0 || current_liabilities_prior === 0) return null

  const roa = net_income / total_assets
  const roaPrior = net_income_prior / total_assets_prior
  const ltdRatio = long_term_debt / total_assets
  const ltdRatioPrior = long_term_debt_prior / total_assets_prior
  const currentRatio = current_assets / current_liabilities
  const currentRatioPrior = current_assets_prior / current_liabilities_prior

  const tests = [
    { key: 'positive_roa',       label: 'Positive Return on Assets',                       pass: roa > 0 },
    { key: 'positive_ocf',       label: 'Positive Operating Cash Flow',                     pass: operating_cash_flow > 0 },
    { key: 'roa_improving',      label: 'ROA Improving Year-over-Year',                     pass: roa > roaPrior },
    { key: 'quality_earnings',   label: 'Operating Cash Flow Exceeds Net Income',           pass: operating_cash_flow > net_income },
    { key: 'leverage_down',      label: 'Long-Term Debt Ratio Decreasing',                  pass: ltdRatio < ltdRatioPrior },
    { key: 'liquidity_up',       label: 'Current Ratio Improving',                          pass: currentRatio > currentRatioPrior },
    { key: 'no_dilution',        label: 'No New Share Issuance',                            pass: shares_outstanding <= shares_outstanding_prior },
    { key: 'margin_improving',   label: 'Gross Margin Improving',                           pass: gross_margin > gross_margin_prior },
    { key: 'turnover_improving', label: 'Asset Turnover Improving',                         pass: asset_turnover > asset_turnover_prior },
  ]

  const score = tests.filter(t => t.pass).length

  let tier, color, text
  if (score >= 8) {
    tier = 'Strong'; color = '#16a34a'
    text = `An F-Score of ${score}/9 places the company in Piotroski's strongest fundamental tier — the majority of profitability, leverage, liquidity, and efficiency signals improved year-over-year.`
  } else if (score >= 6) {
    tier = 'Above Average'; color = '#22c55e'
    text = `An F-Score of ${score}/9 is above average — most fundamental signals moved in a favorable direction over the past year.`
  } else if (score >= 4) {
    tier = 'Average'; color = '#ca8a04'
    text = `An F-Score of ${score}/9 is middling — roughly half of the underlying fundamental tests passed, with no dominant trend either direction.`
  } else if (score >= 3) {
    tier = 'Below Average'; color = '#ea580c'
    text = `An F-Score of ${score}/9 is below average — most of the year-over-year fundamental checks failed, a pattern historically associated with underperformance.`
  } else {
    tier = 'Weak'; color = '#dc2626'
    text = `An F-Score of ${score}/9 sits in Piotroski's weakest tier — nearly every profitability, leverage, liquidity, and efficiency signal deteriorated year-over-year.`
  }

  return { score, tier, color, text, tests }
}

/**
 * Beneish M-Score — 8-variable earnings-manipulation probability model,
 * current vs prior period.
 * M = -4.84 + 0.92·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI
 *     + 0.115·DEPI - 0.172·SGAI + 4.679·TATA - 0.327·LVGI
 * M > -1.78: statistically flagged as likely manipulator.
 * M <= -1.78: unlikely.
 *
 * @param {object|null} inputs - beneish_inputs from the backend
 */
export function calculateBeneishMScore(inputs) {
  if (!inputs) return null
  const {
    net_receivables, net_receivables_prior,
    sales, sales_prior,
    cogs, cogs_prior,
    current_assets, current_assets_prior,
    ppe, ppe_prior,
    securities, securities_prior,
    depreciation, depreciation_prior,
    sga_expense, sga_expense_prior,
    total_assets, total_assets_prior,
    total_debt, total_debt_prior,
    net_income, cash_flow_from_ops,
  } = inputs

  const required = [
    net_receivables, net_receivables_prior, sales, sales_prior, cogs, cogs_prior,
    current_assets, current_assets_prior, ppe, ppe_prior, depreciation, depreciation_prior,
    sga_expense, sga_expense_prior, total_assets, total_assets_prior, total_debt, total_debt_prior,
    net_income, cash_flow_from_ops,
  ]
  if (required.some(v => v == null)) return null
  if (sales === 0 || sales_prior === 0 || total_assets === 0 || total_assets_prior === 0) return null

  const sec0 = securities ?? 0
  const sec1 = securities_prior ?? 0

  // DSRI — Days Sales in Receivables Index: rising receivables relative to
  // sales can indicate revenue manipulation via channel stuffing.
  const dsri = (net_receivables / sales) / (net_receivables_prior / sales_prior)

  // GMI — Gross Margin Index: deteriorating margins (GMI > 1) create pressure
  // to manipulate.
  const gm0 = (sales - cogs) / sales
  const gm1 = (sales_prior - cogs_prior) / sales_prior
  if (gm0 === 0) return null
  const gmi = gm1 / gm0

  // AQI — Asset Quality Index: rising non-current, non-PP&E "soft" assets
  // relative to total assets.
  const aq0 = 1 - (current_assets + ppe + sec0) / total_assets
  const aq1 = 1 - (current_assets_prior + ppe_prior + sec1) / total_assets_prior
  if (aq1 === 0) return null
  const aqi = aq0 / aq1

  // SGI — Sales Growth Index: high growth firms face more pressure to
  // maintain the appearance of continued growth.
  const sgi = sales / sales_prior

  // DEPI — Depreciation Index: a slowing depreciation rate can indicate
  // useful lives being stretched to inflate earnings.
  const depRate0 = depreciation / (depreciation + ppe)
  const depRate1 = depreciation_prior / (depreciation_prior + ppe_prior)
  if (depRate0 === 0) return null
  const depi = depRate1 / depRate0

  // SGAI — SG&A Expense Index: disproportionate SG&A growth relative to
  // sales is associated with deteriorating prospects and manipulation risk.
  const sgai = (sga_expense / sales) / (sga_expense_prior / sales_prior)

  // TATA — Total Accruals to Total Assets: the core accrual-quality measure —
  // large positive accruals (earnings well above operating cash flow) are the
  // single strongest predictor in the model.
  const tata = (net_income - cash_flow_from_ops) / total_assets

  // LVGI — Leverage Index: rising leverage creates covenant pressure that can
  // motivate manipulation.
  const lvg0 = total_debt / total_assets
  const lvg1 = total_debt_prior / total_assets_prior
  if (lvg1 === 0) return null
  const lvgi = lvg0 / lvg1

  const m = -4.84 + 0.92 * dsri + 0.528 * gmi + 0.404 * aqi + 0.892 * sgi
    + 0.115 * depi - 0.172 * sgai + 4.679 * tata - 0.327 * lvgi

  const flagged = m > -1.78

  const text = flagged
    ? `An M-Score of ${m.toFixed(2)} is above the -1.78 threshold Beneish's model uses to flag a statistically elevated probability of earnings manipulation. This is a screening signal based on accrual and growth patterns, not proof of wrongdoing — verify against the underlying accrual (TATA) and receivables (DSRI) components before drawing conclusions.`
    : `An M-Score of ${m.toFixed(2)} is below the -1.78 threshold, indicating no elevated statistical signal of earnings manipulation under Beneish's model.`

  return {
    score: Math.round(m * 100) / 100,
    flagged,
    label: flagged ? 'Manipulation Risk Flagged' : 'No Manipulation Signal',
    color: flagged ? '#dc2626' : '#16a34a',
    text,
    components: { dsri, gmi, aqi, sgi, depi, sgai, tata, lvgi },
  }
}
