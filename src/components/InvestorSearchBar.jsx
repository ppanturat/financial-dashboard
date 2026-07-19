import { useState, useRef, useEffect } from 'react'

export function InvestorSearchBar({ social }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const results = query.trim() ? social.filteredProfiles(query) : []
  const clear = () => { setQuery(''); setOpen(false) }

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="search-box">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search investors..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && <button className="search-clear" onClick={clear}>✕</button>}
      </div>

      {open && query && (
        <ul className="search-drop">
          {results.length === 0 ? (
            <li className="drop-empty">No investors found for "{query}"</li>
          ) : (
            results.map(p => {
              const status = social.getSentRequestStatus(p.id)
              return (
                <li key={p.id} className="drop-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="drop-symbol">{p.name || p.username || 'investor'}</span>
                    {p.username && <span className="drop-name">@{p.username}</span>}
                  </div>
                  {status === 'accepted' ? (
                    <button onClick={() => social.unfollow(p.id)} style={{ padding: '4px 10px', borderRadius: 7, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", flexShrink: 0 }}>unfollow</button>
                  ) : status === 'pending' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border-md)', flexShrink: 0 }}>pending</span>
                  ) : (
                    <button onClick={() => social.sendFollowRequest(p.id)} style={{ padding: '4px 12px', borderRadius: 7, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", flexShrink: 0 }}>+ follow</button>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
