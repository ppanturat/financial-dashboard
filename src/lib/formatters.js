export const fmt = (num, type) => {
  if (num == null) return 'n/a'
  if (type === 'pct') return `${(num * 100).toFixed(1)}%`
  if (type === 'raw') return num >= 999 ? '∞' : num.toFixed(2)
  if (type === 'curr') {
    const abs = Math.abs(num)
    const sign = num < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}b`
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}m`
    return `${sign}$${abs.toLocaleString()}`
  }
  return String(num)
}

export const getMetricColor = (val, type) => {
  if (val == null) return ''
  if (type === 'warChest') return val < 0.5 ? 'red' : val < 1.0 ? 'yellow' : 'green'
  if (type === 'fcf' || type === 'margin') return val > 0 ? 'green' : 'red'
  if (type === 'pe') return val > 40 ? 'red' : val < 15 ? 'green' : ''
  return ''
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
  let s = raw.trim()
  s = s.split('...')[0].split('…')[0].split('Read more')[0].trim()
  if (/[^.!?]$/.test(s)) {
    const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf('!'), s.lastIndexOf('?'))
    s = last !== -1 ? s.substring(0, last + 1).trim() : s + '.'
  }
  return s
}
