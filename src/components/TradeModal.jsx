/**
 * buy/sell modal for existing holdings in PortfolioView.
 * buy adds shares and recalculates weighted avg cost; sell subtracts shares
 * and keeps avg cost unchanged.
 */
import { useState, useEffect } from 'react'

function fmt(v) {
  return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TradeModal({ isOpen, holding, livePrice, onClose, onSave }) {
  const [side, setSide]       = useState('buy')   // 'buy' | 'sell'
  const [shares, setShares]   = useState('')
  const [price, setPrice]     = useState('')
  const [error, setError]     = useState('')

  // resets the trade form each time the modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSide('buy')
      setShares('')
      setPrice(livePrice ? livePrice.toFixed(2) : (holding?.buy_price || ''))
      setError('')
    }
  }, [isOpen, holding, livePrice])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !holding) return null

  const existingShares = parseFloat(holding.amount) || 0
  const existingAvg    = parseFloat(holding.buy_price) || 0
  const tradeShares    = parseFloat(shares) || 0
  const tradePrice     = parseFloat(price)  || 0
  const totalTrade     = tradeShares * tradePrice

  // preview calculations
  let newShares = existingShares, newAvg = existingAvg
  if (side === 'buy' && tradeShares > 0 && tradePrice > 0) {
    newShares = existingShares + tradeShares
    newAvg = (existingShares * existingAvg + tradeShares * tradePrice) / newShares
  } else if (side === 'sell' && tradeShares > 0) {
    newShares = existingShares - tradeShares
    newAvg = existingAvg // cost basis unchanged on sells
  }

  const handleExecute = () => {
    setError('')
    if (!tradeShares || tradeShares <= 0) { setError('Enter a valid share amount.'); return }
    if (side === 'buy' && (!tradePrice || tradePrice <= 0)) { setError('Enter a valid price.'); return }
    if (side === 'sell' && tradeShares > existingShares) { setError(`Cannot sell more than ${existingShares.toFixed(4)} shares.`); return }

    // calls saveHolding(id, ticker, newAmount, newAvgCost)
    const finalShares = Math.max(0, newShares)
    const finalAvg    = side === 'sell' ? existingAvg : newAvg
    onSave(holding.id, holding.ticker, finalShares, finalAvg)
    onClose()
  }

  const isBuy  = side === 'buy'
  const accent = isBuy ? '#16a34a' : '#dc2626'
  const inputStyle = {
    width: '100%', padding: '10px 13px',
    background: 'var(--surface-2)', border: '1px solid var(--border-md)',
    borderRadius: 10, fontSize: 14, color: 'var(--text)',
    fontFamily: "var(--font-body),sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(245,244,241,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 20, padding: '22px 22px 18px', width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "var(--font-body),monospace", fontSize: 18, fontWeight: 800 }}>{holding.ticker}</span>
            {livePrice && <span style={{ fontSize: 12, color: 'var(--faint)', fontFamily: "var(--font-body),monospace" }}>{fmt(livePrice)}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Buy / Sell toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 12, padding: 4, marginBottom: 18 }}>
          {['buy','sell'].map(s => (
            <button key={s} onClick={() => { setSide(s); setError('') }} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body),sans-serif",
              transition: 'all .15s',
              background: side === s ? (s === 'buy' ? '#16a34a' : '#dc2626') : 'transparent',
              color: side === s ? '#fff' : 'var(--muted)',
            }}>{s === 'buy' ? '↑ Buy' : '↓ Sell'}</button>
          ))}
        </div>

        {/* Current position */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 13px', marginBottom: 16, display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Held</div>
            <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700 }}>{existingShares.toFixed(4)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg Cost</div>
            <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700 }}>{fmt(existingAvg)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Position Value</div>
            <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700 }}>{fmt(existingShares * (livePrice || existingAvg))}</div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Shares</label>
            <input type="number" min="0" step="any" value={shares}
              onChange={e => { setShares(e.target.value); setError('') }}
              placeholder={isBuy ? "0.00" : `Max ${existingShares.toFixed(4)}`}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
            />
          </div>
          {isBuy && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>Price per Share ($)</label>
              <input type="number" min="0" step="any" value={price}
                onChange={e => { setPrice(e.target.value); setError('') }}
                placeholder="0.00"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
              />
            </div>
          )}
        </div>

        {/* Preview */}
        {tradeShares > 0 && (
          <div style={{ background: 'var(--surface-2)', border: `1px solid ${accent}22`, borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Preview</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {isBuy && totalTrade > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>Total Cost</div>
                  <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700, color: accent }}>{fmt(totalTrade)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, color: 'var(--faint)' }}>New Shares</div>
                <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700, color: newShares < 0 ? '#dc2626' : 'var(--text)' }}>{newShares.toFixed(4)}</div>
              </div>
              {isBuy && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>New Avg Cost</div>
                  <div style={{ fontFamily: "var(--font-body),monospace", fontSize: 13, fontWeight: 700 }}>{fmt(newAvg)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>{error}</div>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body),sans-serif", cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleExecute} style={{ flex: 2, padding: '11px', borderRadius: 10, background: accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body),sans-serif", cursor: 'pointer' }}>
            {isBuy ? `↑ Buy ${tradeShares > 0 ? tradeShares.toFixed(4) : ''} ${holding.ticker}` : `↓ Sell ${tradeShares > 0 ? tradeShares.toFixed(4) : ''} ${holding.ticker}`}
          </button>
        </div>
      </div>
    </div>
  )
}
