import { SearchBar } from './SearchBar'

export function Header({ folderName, tickers, activeTicker, onSelectTicker, onRemoveTicker, onHamburger, search }) {
  return (
    <header className="header">
      <button className="hamburger" onClick={onHamburger}>☰</button>

      <div className="header-left">
        <span className="header-vault-name">{folderName ?? 'no folder selected'}</span>
        <div className="ticker-tabs">
          {tickers.map(t => (
            <div key={t} className={`ticker-chip ${activeTicker === t ? 'active' : ''}`}>
              <button className="chip-ticker" onClick={() => onSelectTicker(t)}>{t}</button>
              <button className="chip-remove" onClick={() => onRemoveTicker(t)} title="remove">✕</button>
            </div>
          ))}
        </div>
      </div>

      <SearchBar {...search} />
    </header>
  )
}
