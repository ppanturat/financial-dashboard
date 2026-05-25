import { useState, useEffect, useRef } from 'react'

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000/api" : "/api"

export function HoldingModal({ isOpen, holding, marketFolders, onClose, onSave }) {
  const [ticker, setTicker] = useState('')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTicker(holding?.ticker || '')
      setAmount(holding?.amount || '')
      setBuyPrice(holding?.buy_price || '')
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen, holding])

  // close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return }
    setIsSearching(true)
    const q = searchQuery.toUpperCase().trim()
    const fetchSearch = async () => {
      try {
        const res = await fetch(`${BASE_URL}/search/${encodeURIComponent(q)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch { setSearchResults([]) }
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

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="hmodal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="hmodal-box">
        {/* header */}
        <div className="hmodal-header">
          <h3 className="hmodal-title">{holding ? 'Edit Holding' : 'Add Holding'}</h3>
          <button className="hmodal-close" onClick={onClose}>✕</button>
        </div>

        <div className="hmodal-body">
          {/* ticker search / picker — only shown when adding new */}
          {!holding && (
            <div className="hmodal-section">
              <div className="form-group">
                <label className="hmodal-label">Search Ticker</label>
                <input
                  className="hmodal-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search (e.g. MSFT, AAPL)…"
                  autoFocus
                />
                {searchQuery && (
                  <ul className="hmodal-search-list">
                    {isSearching
                      ? <li className="hmodal-search-empty">Searching…</li>
                      : searchResults.length === 0
                        ? <li className="hmodal-search-empty">No matches found.</li>
                        : searchResults.map(r => (
                          <li key={r.symbol} className="hmodal-search-item" onClick={() => handleSelectTicker(r.symbol)}>
                            <span className="hmodal-search-sym">{r.symbol}</span>
                            <span className="hmodal-search-name">{r.shortname}</span>
                          </li>
                        ))
                    }
                  </ul>
                )}
              </div>

              {/* market folder quick-pick */}
              {!searchQuery && marketFolders?.length > 0 && (
                <div className="hmodal-folder-section">
                  <span className="hmodal-section-label">Or pick from your watchlists</span>
                  <div className="hmodal-folder-list">
                    {marketFolders.map(f => (
                      <div key={f.id} className="hmodal-folder-row">
                        <span className="hmodal-folder-name">{f.name}</span>
                        <div className="hmodal-ticker-chips">
                          {f.tickers?.map(t => (
                            <button
                              key={t}
                              className={`hmodal-ticker-chip ${ticker === t ? 'selected' : ''}`}
                              onClick={() => handleSelectTicker(t)}
                            >{t}</button>
                          ))}
                          {(!f.tickers || f.tickers.length === 0) && (
                            <span className="hmodal-empty-note">Empty folder</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* form fields */}
          <div className="hmodal-section hmodal-fields">
            <div className="form-group">
              <label className="hmodal-label">Ticker Symbol</label>
              <input
                className={`hmodal-input hmodal-ticker-display ${ticker ? 'has-value' : ''}`}
                value={ticker}
                onChange={e => !holding && setTicker(e.target.value.toUpperCase())}
                placeholder="Select a ticker above"
                readOnly={!!holding}
              />
            </div>

            <div className="hmodal-row">
              <div className="form-group">
                <label className="hmodal-label">Shares</label>
                <input
                  type="number"
                  className="hmodal-input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label className="hmodal-label">Avg Buy Price ($)</label>
                <input
                  type="number"
                  className="hmodal-input"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hmodal-footer">
          <button className="hmodal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="hmodal-btn-save"
            onClick={handleSave}
            disabled={!ticker || !amount || !buyPrice}
          >Save Holding</button>
        </div>
      </div>
    </div>
  )
}
