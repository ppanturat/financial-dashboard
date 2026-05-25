import { useState, useEffect } from 'react'

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000/api" : "/api"

export function HoldingModal({ isOpen, holding, marketFolders, onClose, onSave }) {
  const [ticker, setTicker] = useState('')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  
  // search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // reset form on open
  useEffect(() => {
    if (isOpen) {
      setTicker(holding?.ticker || '')
      setAmount(holding?.amount || '')
      setBuyPrice(holding?.buy_price || '')
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen, holding])

  // real-time search effect
  useEffect(() => {
    if (!searchQuery.trim()) { 
      setSearchResults([])
      setIsSearching(false)
      return 
    }
    
    setIsSearching(true)
    const q = searchQuery.toUpperCase().trim()
    const fetchSearch = async () => {
      try {
        const res = await fetch(`${BASE_URL}/search/${encodeURIComponent(q)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch (err) { 
        setSearchResults([]) 
      }
      setIsSearching(false)
    }
    
    const id = setTimeout(fetchSearch, 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  if (!isOpen) return null

  const handleSave = () => {
    if (!ticker || !amount || !buyPrice) return alert("Please fill in all fields.")
    onSave(holding?.id, ticker, parseFloat(amount), parseFloat(buyPrice))
    onClose()
  }

  const handleSelectTicker = (sym) => {
    setTicker(sym)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal large-modal">
        <h3>{holding ? 'Edit Holding' : 'Add to Portfolio'}</h3>
        
        <div className="modal-split">
          {/* left side: discovery */}
          <div className="modal-left">
            <div className="form-group">
              <label>Search Market</label>
              <input 
                className="vault-edit-input" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search Ticker (e.g. MSFT)..." 
                disabled={!!holding}
              />
              
              {searchQuery && (
                <ul className="modal-search-results">
                  {isSearching ? <li className="drop-empty">Searching...</li> : 
                   searchResults.length === 0 ? <li className="drop-empty">No matches found.</li> :
                   searchResults.map(r => (
                    <li key={r.symbol} onClick={() => handleSelectTicker(r.symbol)}>
                      <strong>{r.symbol}</strong> <span>{r.shortname}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!searchQuery && !holding && marketFolders && marketFolders.length > 0 && (
              <div className="market-folders-picker">
                <label>From Market Folders</label>
                <div className="market-folders-list">
                  {marketFolders.map(f => (
                    <div key={f.id} className="picker-folder">
                      <span className="picker-folder-name">{f.name}</span>
                      <div className="picker-tags">
                        {f.tickers?.map(t => (
                          <button key={t} onClick={() => handleSelectTicker(t)} className={ticker === t ? 'active' : ''}>
                            {t}
                          </button>
                        ))}
                        {(!f.tickers || f.tickers.length === 0) && <span className="drop-empty">Empty folder.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* right side: input form */}
          <div className="modal-right">
            <div className="form-group">
              <label>Ticker Symbol</label>
              <input 
                className="vault-edit-input" 
                value={ticker} 
                onChange={e => setTicker(e.target.value.toUpperCase())} 
                disabled={!!holding} 
                placeholder="Select or type ticker" 
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
          </div>
        </div>

        <div className="custom-modal-actions mt-4">
          <button className="btn-text" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Holding</button>
        </div>
      </div>
    </div>
  )
}