import { useState, useEffect } from 'react'

export function FearGreedBanner() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMacro = async () => {
      try {
        // Adjust the base URL fallback logic here just like in api.js
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

  // Destructure your macro API response
  const { composite_score, label, severity } = data;
  const score = Math.max(0, Math.min(100, composite_score)); // Clamp 0-100

  // Calculate needle rotation: 0 score = -90deg, 100 score = +90deg
  const rotation = (score / 100) * 180 - 90;

  // Determine active color based on severity
  let activeColor = 'var(--text-main, #111)';
  if (severity === 'bear') activeColor = 'var(--red, #dc2626)';
  if (severity === 'bull') activeColor = 'var(--green, #16a34a)';
  if (severity === 'neutral') activeColor = '#eab308'; // yellow

  return (
    <div className="fear-greed-container">
      <div className="fg-header">
        <h2>Market Sentiment</h2>
        <span className="fg-subtitle">S&P 500 Composite Index</span>
      </div>

      <div className="fg-body">
        {/* SVG Gauge - Naturally scales to container width */}
        <div className="fg-gauge-wrapper">
          <svg viewBox="0 0 200 120" className="fg-svg">
            {/* Background Track */}
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke="var(--border-color, #eaeaea)" 
              strokeWidth="14" 
              strokeLinecap="round" 
            />
            {/* Active Colored Arc (Optional visual flair) */}
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke={activeColor} 
              strokeWidth="14" 
              strokeLinecap="round"
              strokeDasharray="251.2" /* Circumference of half-circle = pi * r = 3.14 * 80 */
              strokeDashoffset={251.2 - (251.2 * (score / 100))}
              style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
            />
            
            {/* Gauge Labels */}
            <text x="20" y="118" fontSize="8" fill="var(--text-muted, #888)" textAnchor="middle">Fear</text>
            <text x="180" y="118" fontSize="8" fill="var(--text-muted, #888)" textAnchor="middle">Greed</text>

            {/* The Needle */}
            <g transform={`rotate(${rotation}, 100, 100)`} style={{ transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              {/* Pointer Triangle */}
              <polygon points="97,100 103,100 100,35" fill="var(--text-main, #111)" />
              {/* Center Pivot */}
              <circle cx="100" cy="100" r="5" fill="var(--text-main, #111)" />
              <circle cx="100" cy="100" r="2" fill="var(--bg, #fff)" />
            </g>
          </svg>
        </div>

        <div className="fg-metrics">
          <div className="fg-score" style={{ color: activeColor }}>{score.toFixed(0)}</div>
          <div className="fg-label">{label}</div>
        </div>
      </div>
    </div>
  )
}