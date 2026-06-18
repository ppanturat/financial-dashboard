import { useState, useEffect } from 'react'

export function FearGreedBanner() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMacro = async () => {
      try {
        const BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');
        const res = await fetch(`${BASE}/macro`)
        if (!res.ok) throw new Error('Failed to fetch macro data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("FearGreed fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMacro()
  }, [])

  if (loading) {
    return (
      <div className="fear-greed-container skeleton-box">
        <div className="skeleton-pulse" style={{ height: '160px', borderRadius: '12px' }}></div>
      </div>
    )
  }

  if (!data) return null;

  // FIX: Destructure fear_greed_score to match the Python backend
  const { fear_greed_score, label, severity } = data;
  
  // FIX: Safely parse it. If it's missing or null, default to 50 (Neutral)
  const rawScore = Number(fear_greed_score) || 50; 
  const score = Math.max(0, Math.min(100, rawScore)); 

  // Calculate needle rotation: 0 score = -90deg, 100 score = +90deg
  const rotation = (score / 100) * 180 - 90;

  let activeColor = 'var(--text-main, #111)';
  if (severity === 'bear' || severity === 'danger' || severity === 'caution') activeColor = 'var(--red, #dc2626)';
  if (severity === 'bull' || severity === 'opportunity') activeColor = 'var(--green, #16a34a)';
  if (severity === 'neutral' || severity === 'warning') activeColor = '#eab308'; // yellow

  return (
    <div className="fear-greed-container">
      <div className="fg-header">
        <h2>Market Sentiment</h2>
        <span className="fg-subtitle">S&P 500 Composite Index</span>
      </div>

      <div className="fg-body">
        <div className="fg-gauge-wrapper">
          <svg viewBox="0 0 200 120" className="fg-svg">
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke="var(--border-color, #eaeaea)" 
              strokeWidth="14" 
              strokeLinecap="round" 
            />
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke={activeColor} 
              strokeWidth="14" 
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (score / 100))}
              style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
            />
            
            <text x="20" y="118" fontSize="8" fill="var(--text-muted, #888)" textAnchor="middle">Fear</text>
            <text x="180" y="118" fontSize="8" fill="var(--text-muted, #888)" textAnchor="middle">Greed</text>

            <g transform={`rotate(${rotation}, 100, 100)`} style={{ transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <polygon points="97,100 103,100 100,35" fill="var(--text-main, #111)" />
              <circle cx="100" cy="100" r="5" fill="var(--text-main, #111)" />
              <circle cx="100" cy="100" r="2" fill="var(--bg, #fff)" />
            </g>
          </svg>
        </div>

        <div className="fg-metrics">
          <div className="fg-score" style={{ color: activeColor }}>{score.toFixed(0)}</div>
          <div className="fg-label">{label || "Neutral"}</div>
        </div>
      </div>
    </div>
  )
}