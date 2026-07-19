/**
 * pure deterministic, rule-based assessment engine — no AI/LLM APIs, all text
 * is pre-written and triggered by mathematical thresholds on raw metrics.
 *
 * exports:
 *   runAdoptionCheck(metrics)        -> module A result or null
 *   runTerminalRedFlagSweep(metrics) -> module B result or null
 *   runBearBullMatrix(metrics)       -> module C result { bear, bull }
 *   runFundamentalSweep(metrics)     -> full 5-point sweep
 *   runFullAssessment(metrics)       -> all modules combined
 *   evaluateBuySignal(ticker)        -> module D (technical trigger), async boolean
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

// module C: bear vs. bull probability matrix

/**
 * rule: bear case auto-triggers on high debt, margin compression, slowing
 * growth; bull case triggers on FCF expansion, high war chest ratio, gross
 * margin strength. bear case always renders first (neutrality).
 *
 * @param {object} metrics
 * @returns {{ bear: string, bull: string, netBias: 'bear'|'neutral'|'bull' }}
 */
export function runBearBullMatrix(metrics = {}) {
  const fcf   = metrics.fcf
  const wcr   = metrics.war_chest_ratio
  const gm    = metrics.gross_margin
  const rev   = metrics.revenue_yoy
  const de    = metrics.debt_to_equity
  const om    = metrics.operating_margin
  const pe    = metrics.forward_pe

  // bear signals
  const bearSignals = []
  let bearScore = 0

  if (de != null && de > 150) {
    bearSignals.push(`aggressive debt-to-equity ratio of ${de.toFixed(0)}%`)
    bearScore += 2
  } else if (de != null && de > 80) {
    bearSignals.push(`elevated leverage (D/E: ${de.toFixed(0)}%)`)
    bearScore += 1
  }

  if (om != null && gm != null && (gm - om) > 0.30) {
    bearSignals.push(`severe SG&A and operational overhead drag (gross-to-operating spread: ${fmtPct(gm - om)})`)
    bearScore += 1
  }

  if (rev != null && rev < 0.05) {
    bearSignals.push(rev < 0 ? `active revenue contraction of ${fmtPct(Math.abs(rev))}` : `near-stagnant revenue growth of ${fmtPct(rev)}`)
    bearScore += rev < 0 ? 2 : 1
  }

  if (fcf != null && fcf < -2e9) {
    bearSignals.push(`severe FCF burn of ${fmtDollars(Math.abs(fcf))} annually`)
    bearScore += 2
  } else if (fcf != null && fcf < 0) {
    bearSignals.push(`negative free cash flow (${fmtDollars(fcf)})`)
    bearScore += 1
  }

  if (pe != null && pe > 60) {
    bearSignals.push(`hyper-extended forward P/E of ${pe.toFixed(1)}x embedding near-perfect execution`)
    bearScore += 2
  } else if (pe != null && pe > 40) {
    bearSignals.push(`elevated forward P/E of ${pe.toFixed(1)}x with limited margin of safety`)
    bearScore += 1
  }

  // bull signals
  const bullSignals = []
  let bullScore = 0

  if (fcf != null && fcf > 5e9) {
    bullSignals.push(`elite free cash flow engine generating ${fmtDollars(fcf)} annually`)
    bullScore += 2
  } else if (fcf != null && fcf > 0) {
    bullSignals.push(`positive and self-sustaining free cash flow of ${fmtDollars(fcf)}`)
    bullScore += 1
  }

  if (wcr != null && wcr >= 2) {
    bullSignals.push(`fortress-grade war chest ratio of ${wcr === 999 ? '∞' : wcr.toFixed(2)}x (cash massively exceeds debt)`)
    bullScore += 2
  } else if (wcr != null && wcr >= 1) {
    bullSignals.push(`healthy war chest ratio of ${wcr.toFixed(2)}x (cash covers full debt load)`)
    bullScore += 1
  }

  if (gm != null && gm > 0.60) {
    bullSignals.push(`exceptional gross margin of ${fmtPct(gm)} confirming dominant pricing power`)
    bullScore += 2
  } else if (gm != null && gm > 0.35) {
    bullSignals.push(`solid gross margin of ${fmtPct(gm)} providing structural cost buffer`)
    bullScore += 1
  }

  if (rev != null && rev > 0.20) {
    bullSignals.push(`hypergrowth revenue expansion of ${fmtPct(rev)} YoY`)
    bullScore += 2
  } else if (rev != null && rev > 0.08) {
    bullSignals.push(`healthy revenue growth of ${fmtPct(rev)} YoY`)
    bullScore += 1
  }

  // compose bear paragraph
  let bear
  if (bearSignals.length === 0) {
    bear = 'The bear case for this equity is currently structurally weak. '
      + 'No dominant risk signals — high debt, margin compression, or growth deceleration — are present in the data. '
      + 'Bears would need an external macro shock or a forward guidance miss to build a compelling negative thesis.'
  } else {
    const signalList = bearSignals.length === 1
      ? bearSignals[0]
      : bearSignals.slice(0, -1).join(', ') + ', and ' + bearSignals[bearSignals.length - 1]
    bear = `The bear thesis centres on ${signalList}. `
    if (bearScore >= 4) {
      bear += 'These compounding risk factors create a structurally fragile investment profile. '
        + 'Any simultaneous deterioration in macro conditions, credit markets, or sector sentiment could rapidly accelerate downside. '
        + 'The mathematical risk of multiple compression or liquidity stress is elevated, and capital preservation should take priority over upside capture.'
    } else if (bearScore >= 2) {
      bear += 'While not yet at a terminal stress level, these structural headwinds demand active monitoring. '
        + 'Bears would target any guidance cut or balance sheet deterioration as confirmation of an accelerating negative feedback loop.'
    } else {
      bear += 'This represents a moderate-conviction bear thesis — real but not dominant. '
        + 'The identified risks constrain upside potential without yet constituting a structural collapse scenario.'
    }
  }

  // compose bull paragraph
  let bull
  if (bullSignals.length === 0) {
    bull = 'The bull case is currently lacking quantitative confirmation. '
      + 'No strong FCF expansion, war chest accumulation, or gross margin leadership is visible in the data. '
      + 'Bulls would need to rely primarily on future execution optionality or forward guidance upgrades to construct a positive thesis.'
  } else {
    const signalList = bullSignals.length === 1
      ? bullSignals[0]
      : bullSignals.slice(0, -1).join(', ') + ', and ' + bullSignals[bullSignals.length - 1]
    bull = `The bull thesis is anchored by ${signalList}. `
    if (bullScore >= 4) {
      bull += 'These elite fundamental characteristics form a self-reinforcing flywheel: strong cash generation finances continued growth, '
        + 'while pricing power insulates margins through macro cycles. '
        + 'If execution continues at this level, the compounding effect of these structural advantages creates a powerful long-term return profile.'
    } else if (bullScore >= 2) {
      bull += 'These strengths create a constructive fundamental baseline. '
        + 'Bulls would look for continued operational execution and margin expansion as catalysts for sustained multiple expansion.'
    } else {
      bull += 'This is a moderate-conviction bull thesis — a genuine positive signal exists, '
        + 'but it requires corroborating evidence from operational execution before forming a high-conviction long position.'
    }
  }

  // net bias
  let netBias
  if (bullScore > bearScore + 1)      netBias = 'bull'
  else if (bearScore > bullScore + 1) netBias = 'bear'
  else                                netBias = 'neutral'

  return { bear, bull, netBias, bullScore, bearScore }
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

// master runner

/**
 * runs all modules and returns a unified assessment object.
 * @param {object} metrics - raw metrics from /api/data
 */
export function runFullAssessment(metrics = {}) {
  const sweep    = runFundamentalSweep(metrics)
  const adoption = runAdoptionCheck(metrics)
  const redFlag  = runTerminalRedFlagSweep(metrics)
  const bearBull = runBearBullMatrix(metrics)

  return {
    sweep,           // Module: fundamental 5-point sweep
    adoption,        // Module A
    redFlag,         // Module B
    bearBull,        // Module C
  }
}

// module D: technical trigger (RSI / SMA / volume breakout) — needs daily
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
