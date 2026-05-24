export const METRIC_DEFS = [
  {
    key: 'war_chest_ratio',
    label: 'War Chest Ratio',
    type: 'raw',
    colorType: 'warChest',
    meaning: "Cash divided by total debt. Measures a company's ability to cover its obligations.",
    scale: '< 0.5 = Danger (Red) · 0.5–1.0 = Caution (Yellow) · > 1.0 = Healthy (Green)',
  },
  {
    key: 'fcf',
    label: 'Free Cash Flow',
    type: 'curr',
    colorType: 'fcf',
    meaning: 'Cash remaining after operating expenses and capital expenditures.',
    scale: 'Negative = Burning Cash (Red) · Positive = Generating Cash (Green)',
  },
  {
    key: 'gross_margin',
    label: 'Gross Margin',
    type: 'pct',
    colorType: 'margin',
    meaning: 'Percentage of revenue retained after subtracting the cost of goods sold.',
    scale: '< 20% = Tight (Red) · 20–50% = OK (White) · > 50% = Excellent (Green)',
  },
  {
    key: 'forward_pe',
    label: 'Forward P/E',
    type: 'raw',
    colorType: 'pe',
    meaning: 'Stock price divided by projected next-year earnings per share.',
    scale: '< 15 = Potentially Cheap (Green) · 15–40 = Fair (White) · > 40 = Expensive (Red)',
  },
  {
    key: 'revenue_yoy',
    label: 'Revenue YoY',
    type: 'pct',
    colorType: 'margin',
    meaning: 'Year-over-year change in total revenue. Shows growth trajectory.',
    scale: 'Negative = Shrinking (Red) · Positive = Growing (Green)',
  },
]

export const TIMEFRAMES = ['1W', '1M', '6M', '1Y']
