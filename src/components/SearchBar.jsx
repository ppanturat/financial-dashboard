import { useRef, useEffect } from 'react'

export function SearchBar({ query, results, open, selectedIndex, onQueryChange, onFocus, onKey, onSelect, onClear, searchRef }) {
  return (
    <div className="search-wrap" ref={searchRef}>
      <div className="search-box">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="search ticker..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={e => onKey(e, onSelect)}
        />
        {query && (
          <button className="search-clear" onClick={onClear}>✕</button>
        )}
      </div>

      {open && query && (
        <ul className="search-drop">
          {results.length === 0 ? (
            <li
              className="drop-empty"
              onClick={() => { onSelect(query.trim()); onClear() }}
            >
              press enter to add "{query.toUpperCase()}"
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.symbol}
                className={`drop-item ${i === selectedIndex ? 'highlighted' : ''}`}
                onClick={() => { onSelect(r.symbol); onClear() }}
              >
                <span className="drop-symbol">{r.symbol}</span>
                <span className="drop-name">{r.shortname ?? r.longname ?? ''}</span>
                <span className="drop-type">{r.quoteType?.toLowerCase()}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
