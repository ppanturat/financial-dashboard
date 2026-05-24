export function AiScanCard({ ticker, timeframe, aiScan, isEtf, loading }) {
  if (!aiScan && !isEtf && !loading) return null

  return (
    <div className="ai-card">
      <div className="ai-head">
        <span className="ai-badge">AI Assessment</span>
        <span className="ai-sub">{ticker} · Institutional Scan</span>
      </div>
      <div className="ai-body">
        {loading ? (
          <p>Executing quantitative sweep...</p>
        ) : isEtf ? (
          <p>ETFs represent a basket of assets. Fundamental bear/bull metrics bypass single-stock analysis.</p>
        ) : (
          <>
            <p><strong>🚩 Terminal Red Flag Sweep:</strong> {
              Array.isArray(aiScan?.terminal_red_flags)
                ? aiScan.terminal_red_flags.join(' ')
                : aiScan?.terminal_red_flags || 'Clear'
            }</p>
            <p><strong>📈 Bull Case:</strong> {aiScan?.bull_case}</p>
            <p><strong>📉 Bear Case:</strong> {aiScan?.bear_case}</p>
            <p><strong>⚖️ Verdict:</strong> {aiScan?.neutral_verdict}</p>
          </>
        )}
      </div>
    </div>
  )
}
