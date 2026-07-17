/**
 * assessmentEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure deterministic, rule-based assessment engine.
 * No AI/LLM APIs. All text is pre-written and triggered by mathematical
 * thresholds applied to raw financial metrics.
 *
 * Exports:
 *   runAdoptionCheck(metrics)        → Module A result or null
 *   runTerminalRedFlagSweep(metrics) → Module B result or null
 *   runBearBullMatrix(metrics)       → Module C result { bear, bull }
 *   runFundamentalSweep(metrics)     → Full sweep (existing engine, refactored here)
 *   runFullAssessment(metrics)       → All modules combined
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format an absolute dollar value into a readable string (e.g. $4.2B, $320M). */
function fmtDollars(val) {
  if (val == null) return '?'
  const abs = Math.abs(val)
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toFixed(0)}`
}

/** Format a fraction as a percentage string (e.g. 0.23 → "23.0%"). */
function fmtPct(val, decimals = 1) {
  if (val == null) return '?%'
  return `${(val * 100).toFixed(decimals)}%`
}

// ─── Module A: Adoption Reality Check ────────────────────────────────────────

/**
 * Rule:
 *   If Revenue YoY Growth < 15% AND R&D Spend > Gross Profit
 *   → return a warning text block.
 *
 * @param {object} metrics – raw metrics from the /api/data endpoint
 * @returns {{ triggered: boolean, severity: string, title: string, text: string } | null}
 */
export function runAdoptionCheck(metrics = {}) {
  const rev = metrics.revenue_yoy        // fraction, e.g. 0.12 = 12%
  const rd  = metrics.research_development // absolute $
  const gp  = metrics.gross_profit        // absolute $

  // Need at least revenue YoY to run any check
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

  // Partial trigger: low growth without extreme R&D
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

  // Growth is healthy (≥ 15%) — no flag
  return {
    triggered: false,
    severity: 'pass',
    title: 'Adoption Reality Check',
    text: `Revenue growth of ${fmtPct(rev)} YoY clears the 15% commercial adoption threshold. `
      + `The business is demonstrating sufficient market penetration velocity to justify its current operating structure.`,
  }
}

// ─── Module B: Terminal Red Flag Sweep ───────────────────────────────────────

/**
 * Rule:
 *   Cash Runway = Total Cash / |Negative FCF|
 *   If Runway < 1.5 years → critical red flag (dilution risk).
 *
 * @param {object} metrics
 * @returns {{ triggered: boolean, severity: string, title: string, text: string, runway: number|null } | null}
 */
export function runTerminalRedFlagSweep(metrics = {}) {
  const fcf   = metrics.fcf          // absolute $, negative = burning cash
  const cash  = metrics.total_cash   // absolute $
  const debt  = metrics.total_debt   // absolute $

  if (fcf == null || cash == null) return null

  // Only applies when FCF is negative (burning cash)
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

  // Between 1.5 and 3 years — caution zone
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

  // Comfortable runway
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

// ─── Module C: Bear vs. Bull Probability Matrix ───────────────────────────────

/**
 * Rule:
 *   Bear Case auto-triggers on: high debt, margin compression, slowing growth.
 *   Bull Case triggers on: FCF expansion, high War Chest ratio, gross margin strength.
 *   Bear Case is always rendered first (neutrality).
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

  // ── Bear signals ──────────────────────────────────────────────────────────
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

  // ── Bull signals ──────────────────────────────────────────────────────────
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

  // ── Compose Bear paragraph ────────────────────────────────────────────────
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

  // ── Compose Bull paragraph ────────────────────────────────────────────────
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

  // ── Net bias ──────────────────────────────────────────────────────────────
  let netBias
  if (bullScore > bearScore + 1)      netBias = 'bull'
  else if (bearScore > bullScore + 1) netBias = 'bear'
  else                                netBias = 'neutral'

  return { bear, bull, netBias, bullScore, bearScore }
}

// ─── Full Fundamental Sweep (refactored from RuleBasedAssessmentCard) ────────

/**
 * Runs all five core sweep checks (Liquidity, FCF, Margins, Valuation, Growth).
 * Returns null if no metrics are available.
 */
export function runFundamentalSweep(metrics = {}) {
  const wcr = metrics?.war_chest_ratio
  const fcf = metrics?.fcf
  const gm  = metrics?.gross_margin
  const pe  = metrics?.forward_pe
  const rev = metrics?.revenue_yoy

  if (wcr == null && fcf == null && gm == null && pe == null && rev == null) return null

  const sweep = []
  let flagCount = 0, bullCount = 0, bearCount = 0, neutralCount = 0

  // 1. Balance Sheet Liquidity
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

  // 2. Free Cash Flow
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

  // 3. Unit Economics
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

  // 4. Valuation
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

  // 5. Growth Velocity
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

  // ── Score calculation ──────────────────────────────────────────────────────
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

// ─── Master runner ────────────────────────────────────────────────────────────

/**
 * Runs all modules and returns a unified assessment object.
 *
 * @param {object} metrics – raw metrics from /api/data
 * @returns {object}
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
