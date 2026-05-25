import { generateMetricsSummary } from '../lib/metricsSummary'

// score ring — svg circle that fills based on 0–100 score
function ScoreRing({ score, color }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const colorMap = { green: '#16a34a', yellow: '#ca8a04', red: '#dc2626', neutral: '#9ca3af' }
  const stroke = colorMap[color] ?? '#9ca3af'
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="score-ring">
      {/* track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="5" />
      {/* fill — starts at 12 o'clock */}
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={stroke} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="15" fontWeight="600" fontFamily="DM Mono, monospace" fill={stroke}>
        {score}
      </text>
    </svg>
  )
}

// one row per metric dimension
function DimensionRow({ label, result }) {
  if (!result) return (
    <div className="dim-row">
      <div className="dim-left">
        <span className="dim-label">{label}</span>
        <span className={`dim-badge neutral`}>No Data</span>
      </div>
      <p className="dim-note dim-muted">Metric unavailable for this ticker.</p>
    </div>
  )
  return (
    <div className="dim-row">
      <div className="dim-left">
        <span className="dim-label">{label}</span>
        <span className={`dim-badge ${result.color || 'neutral'}`}>{result.label}</span>
      </div>
      <p className="dim-note">{result.note}</p>
    </div>
  )
}

export function MetricsSummaryCard({ metrics, ticker, isEtf, loading }) {
  if (isEtf || loading || !metrics) return null

  const summary = generateMetricsSummary(metrics)
  if (!summary) return null

  return (
    <div className="summary-card">
      <div className="summary-head">
        <div className="summary-title-block">
          <span className="summary-badge">Metrics Summary</span>
          <span className="summary-sub">{ticker} · Rule-Based Assessment</span>
        </div>
        <div className="summary-score-block">
          <ScoreRing score={summary.score} color={summary.verdict.color} />
          <div className="summary-verdict-block">
            <span className={`verdict-label ${summary.verdict.color}`}>{summary.verdict.label}</span>
            <span className="verdict-score">Score: {summary.score}/100</span>
          </div>
        </div>
      </div>

      <p className={`summary-verdict-text ${summary.verdict.color}`}>{summary.verdict.text}</p>

      <div className="summary-dims">
        {summary.items.map(item => (
          <DimensionRow key={item.key} label={item.label} result={item.result} />
        ))}
      </div>
    </div>
  )
}
