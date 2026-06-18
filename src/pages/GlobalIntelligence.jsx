import { FearGreedBanner } from '../components/FearGreedBanner'
// Assuming you have a StockNewsFeed component built from the previous architecture
// import { StockNewsFeed } from '../components/StockNewsFeed' 

export function GlobalIntelligence() {
  return (
    <div className="global-intelligence-page fade-in">
      <header className="page-header">
        <h1>Global Intelligence</h1>
        <p>Market-wide sentiment, macroeconomic trends, and breaking global news.</p>
      </header>

      <div className="intelligence-grid">
        {/* Left/Top Column: The Gauge */}
        <div className="intelligence-col main-indicator">
          <FearGreedBanner />
          
          {/* Add future market-wide indicators here (e.g., Economic Calendar, VIX) */}
          <div className="placeholder-card mt-4">
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Market Summary</h3>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>S&P 500 and broader market metrics will appear here.</p>
          </div>
        </div>

        {/* Right/Bottom Column: The News Feed */}
        <div className="intelligence-col news-feed-section">
          {/* If you have the StockNewsFeed component ready, drop it here: */}
          {/* <StockNewsFeed isMacro={true} /> */}
          
          <div className="placeholder-card" style={{ height: '100%', minHeight: '400px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Macro News Feed</h3>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Aggregated market news will flow here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}