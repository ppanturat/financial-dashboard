export const fmt = (num, type) => {
  if (num == null) return 'N/A'
  if (type === 'pct') return `${(num * 100).toFixed(1)}%`
  if (type === 'raw') return num >= 999 ? '∞' : num.toFixed(2)
  if (type === 'runway') {
    // num is either the string 'SELF_FUNDING' or a runway length in years
    // (see deriveCashRunway below, which computes it the same way
    // runTerminalRedFlagSweep does internally: total_cash / |fcf|)
    if (num === 'SELF_FUNDING') return 'Self-funding'
    const months = num * 12
    return months < 24 ? `${months.toFixed(1)} months` : `${num.toFixed(1)} years`
  }
  if (type === 'curr') {
    const abs = Math.abs(num)
    const sign = num < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
    return `${sign}$${abs.toLocaleString()}`
  }
  return String(num)
}

export const getMetricColor = (val, type) => {
  if (val == null) return ''
  if (type === 'warChest') return val < 0.5 ? 'red' : val < 1.0 ? 'yellow' : 'green'
  if (type === 'fcf' || type === 'margin') return val > 0 ? 'green' : 'red'
  if (type === 'pe') return val > 40 ? 'red' : val < 15 ? 'green' : ''
  if (type === 'runway') {
    // same 1.5yr / 3yr thresholds runTerminalRedFlagSweep uses for
    // danger/caution/pass, expressed here in years to match the raw value
    if (val === 'SELF_FUNDING') return 'green'
    return val < 1.5 ? 'red' : val < 3 ? 'yellow' : 'green'
  }
  return ''
}

/**
 * Derives the Cash Runway metric (in years, or the sentinel 'SELF_FUNDING')
 * from the raw metrics payload, the same way runTerminalRedFlagSweep does
 * internally in assessmentEngine.js — surfaced here as its own visible tile
 * rather than only appearing inside that card's prose. Returns null when
 * there isn't enough data to compute it.
 */
export function deriveCashRunway(metrics) {
  if (!metrics) return null
  const { total_cash, fcf } = metrics
  if (total_cash == null || fcf == null) return null
  if (fcf >= 0) return 'SELF_FUNDING'
  return total_cash / Math.abs(fcf) // years
}

export const formatXAxis = (tickItem, timeframe) => {
  if (!tickItem) return ''
  const d = new Date(tickItem)
  return timeframe === '1Y'
    ? d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    : `${d.getMonth() + 1}/${d.getDate()}`
}

export const formatTooltipLabel = (label) => {
  if (!label) return ''
  return new Date(label).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export const cleanDescription = (raw = '') => {
  // strip everything from the first ellipsis or truncation marker onward
  let s = raw
    .split('...')[0]
    .split('\u2026')[0]
    .split('Read more')[0]
    .split('&#8230;')[0]
    .trim()

  // cut at the last clean sentence boundary — never leave a dangling fragment
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf('!'), s.lastIndexOf('?'))
  return last !== -1 ? s.substring(0, last + 1).trim() : s
}

// live USD->THB rate, used by the USD/THB currency toggle on portfolio-shaped views
export async function fetchThbRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    return data.rates?.THB ?? 34.5
  } catch { return 34.5 }
}

// formats a dollar amount in either USD or THB
export function fmtCurrency(val, currency, thbRate) {
  const num = parseFloat(val) || 0
  if (currency === 'THB') {
    return '฿' + (num * thbRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
