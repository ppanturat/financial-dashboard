import { useState, useEffect } from 'react'

export function HoldingModal({ isOpen, holding, onClose, onSave }) {
  const [ticker, setTicker] = useState('')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTicker(holding?.ticker || '')
      setAmount(holding?.amount || '')
      setBuyPrice(holding?.buy_price || '')
    }
  }, [isOpen, holding])

  if (!isOpen) return null

  const handleSave = () => {
    if (!ticker || !amount || !buyPrice) return alert("Fill in all fields")
    onSave(holding?.id, ticker, parseFloat(amount), parseFloat(buyPrice))
    onClose()
  }

  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal">
        <h3>{holding ? 'Edit Holding' : 'Add to Portfolio'}</h3>
        
        <div className="form-group">
          <label>Ticker Symbol</label>
          <input 
            className="vault-edit-input" 
            value={ticker} 
            onChange={e => setTicker(e.target.value.toUpperCase())} 
            disabled={!!holding} 
            placeholder="e.g. AAPL" 
          />
        </div>
        
        <div className="form-group">
          <label>Amount of Shares</label>
          <input 
            type="number" 
            className="vault-edit-input" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder="0.0" 
          />
        </div>

        <div className="form-group">
          <label>Average Buy Price ($)</label>
          <input 
            type="number" 
            className="vault-edit-input" 
            value={buyPrice} 
            onChange={e => setBuyPrice(e.target.value)} 
            placeholder="0.00" 
          />
        </div>

        <div className="custom-modal-actions mt-4">
          <button className="btn-text" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Holding</button>
        </div>
      </div>
    </div>
  )
}