import { useState } from 'react'
import { SearchBar } from './SearchBar'
import { InvestorSearchBar } from './InvestorSearchBar'

const CLEAN_TABS = new Set(['social', 'intelligence'])

export function Header({ activeTab, folderName, tickers, activeTicker, onSelectTicker, onRemoveTicker, onHamburger, search, social, hideSearch }) {
  const [dropOpen, setDropOpen] = useState(false)
  const isClean = CLEAN_TABS.has(activeTab) || hideSearch

  const handleDropSelect = t => { onSelectTicker(t); setDropOpen(false) }

  return (
    <header className="header">
      <button className="hamburger" onClick={onHamburger}>☰</button>

      <div className="header-left">
        {!isClean && activeTab === 'market' ? (
          <>
            <span className="header-vault-name">{folderName ?? 'No Folder Selected'}</span>

            {/* Desktop chips */}
            <div className="ticker-tabs desktop-ticker-tabs">
              {tickers?.map(t => (
                <div key={t} className={`ticker-chip ${activeTicker === t ? 'active' : ''}`}>
                  <button className="chip-ticker" onClick={() => onSelectTicker(t)}>{t}</button>
                  <button className="chip-remove" onClick={() => onRemoveTicker(t)} title="Remove">✕</button>
                </div>
              ))}
            </div>

            {/* Mobile dropdown */}
            {tickers?.length > 0 && (
              <div className="ticker-dropdown-wrap mobile-ticker-dropdown">
                <button className="ticker-dropdown-btn" onClick={() => setDropOpen(o => !o)}>
                  <span className="ticker-dropdown-active">{activeTicker || 'Select'}</span>
                  <span className="ticker-dropdown-arrow">{dropOpen ? '▲' : '▼'}</span>
                </button>
                {dropOpen && (
                  <div className="ticker-dropdown-menu">
                    {tickers.map(t => (
                      <div key={t} className={`ticker-dropdown-item ${activeTicker === t ? 'active' : ''}`}>
                        <button className="ticker-drop-select" onClick={() => handleDropSelect(t)}>{t}</button>
                        <button className="ticker-drop-remove" onClick={() => { onRemoveTicker(t); setDropOpen(false) }} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : !isClean ? (
          <span className="header-vault-name">{folderName ?? 'No Portfolio Selected'}</span>
        ) : null}
      </div>

      {activeTab === 'social' ? <InvestorSearchBar social={social} /> : !isClean && <SearchBar {...search} />}
    </header>
  )
}
