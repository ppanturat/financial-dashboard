import { SearchBar } from './SearchBar'

export function Header({ activeTab, folderName, tickers, activeTicker, onSelectTicker, onRemoveTicker, onHamburger, search }) {
  return (
    <header className="header">
      <button className="hamburger" onClick={onHamburger}>☰</button>

      <div className="header-left">
        {activeTab === 'market' ? (
          <>
            <span className="header-vault-name">{folderName ?? 'No Folder Selected'}</span>
            <div className="ticker-tabs">
              {tickers?.map(t => (
                <div key={t} className={`ticker-chip ${activeTicker === t ? 'active' : ''}`}>
                  <button className="chip-ticker" onClick={() => onSelectTicker(t)}>{t}</button>
                  <button className="chip-remove" onClick={() => onRemoveTicker(t)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <span className="header-vault-name">Portfolio Dashboard</span>
        )}
      </div>

      <SearchBar {...search} />
    </header>
  )
}