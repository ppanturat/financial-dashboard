import { useState, useEffect } from 'react'
import { evaluateTechnicalSignal } from '../lib/assessmentEngine'

function CriterionRow({ pass, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
        background: pass ? '#15803d' : '#9ca3af',
      }}>{pass ? '✓' : '✕'}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>{detail}</div>}
      </div>
    </div>
  )
}

export function TechnicalSignalCard({ ticker, isEtf }) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!ticker || isEtf) { setLoading(false); return }
    setLoading(true)
    let cancelled = false
    evaluateTechnicalSignal(ticker).then(r => {
      if (!cancelled) { setResult(r); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [ticker, isEtf])

  if (isEtf || loading || !result) return null

  const fmtVol = v => v == null ? '—' : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${result.signal ? '#15803d' : '#9ca3af'}`,
      borderRadius: 'var(--r)', padding: '20px 24px', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--accent)', padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Technical Trigger
          </span>
          <span style={{ fontFamily: "var(--font-body), monospace", fontSize: 13, color: 'var(--faint)' }}>
            {ticker} · RSI / SMA / Volume
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 24,
          color: result.signal ? '#15803d' : 'var(--muted)',
          background: result.signal ? '#15803d18' : 'var(--surface-2)',
          border: `1px solid ${result.signal ? '#15803d44' : 'var(--border-md)'}`,
        }}>{result.signal ? 'Buy Signal Active' : 'No Signal'}</span>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <CriterionRow
          pass={result.rsiCrossedUp}
          label="14-day RSI crossed above 30 in the last 3 days"
          detail={result.rsi != null ? `Current RSI: ${result.rsi.toFixed(1)}` : null}
        />
        <CriterionRow
          pass={result.aboveSMA50}
          label="Price above the 50-day SMA"
          detail={result.sma50 != null ? `Price ${result.currentPrice?.toFixed(2)} vs SMA ${result.sma50.toFixed(2)}` : null}
        />
        <CriterionRow
          pass={result.volumeSpike}
          label="Volume ≥ 110% of the 20-day average"
          detail={result.avgVolume20 != null ? `Today ${fmtVol(result.todayVolume)} vs avg ${fmtVol(result.avgVolume20)}` : null}
        />
      </div>
    </div>
  )
}
