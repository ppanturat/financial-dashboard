export const METRIC_DEFS = [
  {
    key: 'war_chest_ratio',
    label: 'war chest ratio',
    type: 'raw',
    colorType: 'warChest',
    meaning: 'cash divided by total debt. measures a company\'s ability to cover obligations.',
    scale: '< 0.5 = danger (red) · 0.5–1.0 = caution (yellow) · > 1.0 = healthy (green)',
  },
  {
    key: 'fcf',
    label: 'free cash flow',
    type: 'curr',
    colorType: 'fcf',
    meaning: 'cash remaining after operating expenses and capital expenditures.',
    scale: 'negative = burning cash (red) · positive = generating cash (green)',
  },
  {
    key: 'gross_margin',
    label: 'gross margin',
    type: 'pct',
    colorType: 'margin',
    meaning: 'percentage of revenue retained after subtracting the cost of goods sold.',
    scale: '< 20% = tight (red) · 20–50% = ok (white) · > 50% = excellent (green)',
  },
  {
    key: 'forward_pe',
    label: 'forward p/e',
    type: 'raw',
    colorType: 'pe',
    meaning: 'stock price divided by projected next-year earnings per share.',
    scale: '< 15 = potentially cheap (green) · 15–40 = fair (white) · > 40 = expensive (red)',
  },
  {
    key: 'revenue_yoy',
    label: 'revenue yoy',
    type: 'pct',
    colorType: 'margin',
    meaning: 'year-over-year change in total revenue. shows growth trajectory.',
    scale: 'negative = shrinking (red) · positive = growing (green)',
  },
]

export const TIMEFRAMES = ['1W', '1M', '6M', '1Y']
