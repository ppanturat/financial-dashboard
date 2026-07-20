import { useState, useEffect, useRef } from 'react'
import { evaluateTechnicalSignal } from '../lib/assessmentEngine'

const INFO = {
  rsi: {
    what: 'RSI (Relative Strength Index) measures how fast and how much a price has moved over 14 days, on a 0-100 scale.',
    good: 'Below 30 = oversold. A cross back above 30 within the last 3 days signals momentum turning up from an oversold dip.',
    bad: 'Staying below 30, or never crossing back up, means selling pressure is still in control.',
  },
  sma: {
    what: 'SMA-50 (50-day simple moving average) is the average closing price over the last 50 trading days — a common trend baseline.',
    good: 'Price above the SMA-50 suggests the medium-term trend is up.',
    bad: 'Price below the SMA-50 suggests the medium-term trend is still down.',
  },
  volume: {
    what: "Today's trading volume compared to the 20-day average volume.",
    good: 'Volume ≥ 110% of average means the move is backed by unusually strong participation, not a quiet drift.',
    bad: 'Volume at or below average means there\'s less conviction behind the price move.',
  },
}

function InfoTip({ id, open, onToggle }) {
  const info = INFO[id]
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={e => { e.stopPropagation(); onToggle(id) }}
        aria-label="What is this?"
        style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          background: open ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.12)',
          fontSize: 10, fontWeight: 700, fontFamily: 'serif',
          color: open ? 'var(--text)' : 'var(--faint)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >i</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
          background: '#111', color: '#fff', borderRadius: 10, padding: '12px 14px',
          width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{info.what}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#86efac', marginBottom: 4 }}><strong>Good:</strong> {info.good}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#fca5a5' }}><strong>Bad:</strong> {info.bad}</div>
        </div>
      )}
    </span>
  )
}

function CriterionRow({ id, pass, label, detail, tooltipOpen, onToggleTip }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
        background: pass ? '#15803d' : '#9ca3af',
      }}>{pass ? '✓' : '✕'}</span>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {label}
          <InfoTip id={id} open={tooltipOpen === id} onToggle={onToggleTip} />
        </div>
        {detail && <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>{detail}</div>}
      </div>
    </div>
  )
}

export function TechnicalSignalCard({ ticker, isEtf }) {
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tooltipOpen, setTooltipOpen] = useState(null)
  const cardRef = useRef(null)

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

  useEffect(() => {
    if (!tooltipOpen) return
    const fn = e => { if (cardRef.current && !cardRef.current.contains(e.target)) setTooltipOpen(null) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [tooltipOpen])

  if (isEtf || loading || !result) return null

  const fmtVol = v => v == null ? '—' : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v
  const toggleTip = id => setTooltipOpen(p => p === id ? null : id)

  return (
    <div ref={cardRef} style={{
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
          id="rsi"
          pass={result.rsiCrossedUp}
          label="14-day RSI crossed above 30 in the last 3 days"
          detail={result.rsi != null ? `Current RSI: ${result.rsi.toFixed(1)}` : null}
          tooltipOpen={tooltipOpen}
          onToggleTip={toggleTip}
        />
        <CriterionRow
          id="sma"
          pass={result.aboveSMA50}
          label="Price above the 50-day SMA"
          detail={result.sma50 != null ? `Price ${result.currentPrice?.toFixed(2)} vs SMA ${result.sma50.toFixed(2)}` : null}
          tooltipOpen={tooltipOpen}
          onToggleTip={toggleTip}
        />
        <CriterionRow
          id="volume"
          pass={result.volumeSpike}
          label="Volume ≥ 110% of the 20-day average"
          detail={result.avgVolume20 != null ? `Today ${fmtVol(result.todayVolume)} vs avg ${fmtVol(result.avgVolume20)}` : null}
          tooltipOpen={tooltipOpen}
          onToggleTip={toggleTip}
        />
      </div>
    </div>
  )
}
