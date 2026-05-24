export function AiScanCard({ ticker, timeframe, aiScan, isEtf, loading }) {
  if (!aiScan && !isEtf && !loading) return null

  return (
    <div className="ai-card">
      <div className="ai-head">
        <span className="ai-badge">ai assessment</span>
        <span className="ai-sub">{ticker} · institutional scan</span>
      </div>
      <div className="ai-body">
        {loading ? (
          <p>executing quantitative sweep...</p>
        ) : isEtf ? (
          <p>etfs represent a basket of assets. fundamental bear/bull metrics bypass single-stock analysis.</p>
        ) : (
          <>
            <p><strong>🚩 terminal red flag sweep:</strong> {
              Array.isArray(aiScan?.terminal_red_flags)
                ? aiScan.terminal_red_flags.join(' ')
                : aiScan?.terminal_red_flags || 'clear'
            }</p>
            <p><strong>📈 bull case:</strong> {aiScan?.bull_case}</p>
            <p><strong>📉 bear case:</strong> {aiScan?.bear_case}</p>
            <p><strong>⚖️ verdict:</strong> {aiScan?.neutral_verdict}</p>
          </>
        )}
      </div>
    </div>
  )
}
