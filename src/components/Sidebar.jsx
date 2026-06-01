import { useState, useRef, useEffect } from 'react'

export function Sidebar({ 
  session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, marketFolders, 
  isOpen, onSelectFolder, onCreateFolder, onImportFolder, onRenameFolder, onDeleteFolder, onSignOut,
  followedUsers, pendingRequests
}) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  
  // import state
  const [importMode, setImportMode] = useState(false)
  const [importStep, setImportStep] = useState(1) 
  const [importTargetFolder, setImportTargetFolder] = useState(null)
  const [importTickers, setImportTickers] = useState([])

  // reset import/new mode when switching tabs
  useEffect(() => {
    setImportMode(false)
    setImportStep(1)
    setImportTargetFolder(null)
    setImportTickers([])
    setNewMode(false)
    setNewName('')
  }, [activeTab])

  const [isImporting, setIsImporting] = useState(false)
  const newRef = useRef(null)

  const startEdit = (f) => { setEditingId(f.id); setEditName(f.name) }
  const commitEdit = (id) => {
    if (editName.trim()) onRenameFolder(id, editName.trim())
    setEditingId(null)
  }
  const commitNew = () => {
    if (newName.trim()) onCreateFolder(newName.trim())
    setNewMode(false)
    setNewName('')
  }

  // start the ticker selection step
  const handleStartImport = (mf) => {
    setImportTargetFolder(mf)
    setImportTickers(mf.tickers || []) 
    setImportStep(2)
  }

  // toggle ticker inclusion
  const toggleImportTicker = (t) => {
    setImportTickers(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  // finalize import safely with visual feedback
  const handleConfirmImport = async () => {
    if (!importTargetFolder) return
    setIsImporting(true)
    
    try {
      await onImportFolder(importTargetFolder.name, importTickers)
      setImportMode(false)
      setImportStep(1)
      setImportTargetFolder(null)
      setImportTickers([])
    } catch (err) {
      alert(err.message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">◈</span>
        <span className="brand-name">FINANCIAL DASHBOARD</span>
      </div>

      <div className="sidebar-tabs">
        <button className={activeTab === 'market' ? 'active' : ''} onClick={() => setActiveTab('market')}>Market View</button>
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')}>Portfolio</button>
        <button className={activeTab === 'social' ? 'active' : ''} onClick={() => setActiveTab('social')}>Network</button>
      </div>

      {activeTab !== 'social' && (
        <p className="sidebar-label">{activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}</p>
      )}

      <nav className="sidebar-nav">
        {activeTab === 'social' ? (
          <>
            {pendingRequests?.length > 0 && (
              <div style={{
                margin: '0 0 8px', padding: '8px 10px', borderRadius: 7,
                background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                  {pendingRequests.length} follow request{pendingRequests.length > 1 ? 's' : ''}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, background: 'rgba(234,179,8,0.7)',
                  color: '#111', padding: '2px 6px', borderRadius: 99,
                  fontVariantNumeric: 'tabular-nums',
                }}>{pendingRequests.length}</span>
              </div>
            )}
            {followedUsers?.length === 0 ? (
              <p className="sidebar-loading">No one followed yet.</p>
            ) : (
              <>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px 4px' }}>
                  Following · {followedUsers.length}
                </p>
                {followedUsers.map(u => (
                  <div key={u.id} className="vault-row">
                    <div className="vault-btn" style={{ cursor: 'default' }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.name} style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: `hsl(${(u.name||u.username||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%360}, 55%, 62%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 9, fontWeight: 700,
                        }}>
                          {(u.name||u.username||'?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="vault-label">{u.name || u.username || 'Investor'}</span>
                      {u.username && (
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                          @{u.username}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        ) : fetchingFolders ? (
          <p className="sidebar-loading">Loading...</p>
        ) : (
          <>
            {folders.map(f => (
              <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
                {editingId === f.id ? (
                  <input
                    className="vault-edit-input"
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitEdit(f.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(f.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <>
                    <button className="vault-btn" onClick={() => onSelectFolder(f)}>
                      <span className="vault-dot" />
                      <span className="vault-label">{f.name}</span>
                    </button>
                    <div className="vault-actions">
                      <button title="Rename" onClick={() => startEdit(f)}>✎</button>
                      <button title="Delete" onClick={() => onDeleteFolder(f.id)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {newMode ? (
              <div className="vault-row">
                <input
                  ref={newRef}
                  className="vault-edit-input"
                  autoFocus
                  placeholder="Folder Name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={commitNew}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitNew()
                    if (e.key === 'Escape') { setNewMode(false); setNewName('') }
                  }}
                />
              </div>
            ) : importMode ? (
              <div className="import-picker-menu">
                {importStep === 1 ? (
                  <>
                    <span className="import-label">Select Market Folder:</span>
                    <div className="import-list">
                      {marketFolders?.map(mf => (
                        <button key={mf.id} className="import-item-btn" onClick={() => handleStartImport(mf)}>
                          ↳ {mf.name} <span className="import-count">({mf.tickers?.length || 0})</span>
                        </button>
                      ))}
                      {marketFolders?.length === 0 && <span className="import-empty">No market folders found.</span>}
                    </div>
                    <button className="btn-text btn-cancel" onClick={() => setImportMode(false)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="import-label">Select Tickers from {importTargetFolder?.name}:</span>
                    <div className="import-list ticker-select-list">
                      {importTargetFolder?.tickers?.map(t => (
                        <label key={t} className="import-ticker-label">
                          <input
                            type="checkbox"
                            checked={importTickers.includes(t)}
                            onChange={() => toggleImportTicker(t)}
                          />
                          {t}
                        </label>
                      ))}
                      {(!importTargetFolder?.tickers || importTargetFolder.tickers.length === 0) && <span className="import-empty">Empty folder.</span>}
                    </div>
                    <div className="import-actions">
                      <button className="btn-text btn-cancel" onClick={() => setImportStep(1)} disabled={isImporting}>Back</button>
                      <button className="btn-primary btn-small" onClick={handleConfirmImport} disabled={isImporting}>
                        {isImporting ? 'Importing...' : 'Confirm'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="sidebar-btn-row">
                <button className="new-vault-btn" onClick={() => setNewMode(true)}>+ New Folder</button>
                {activeTab === 'portfolio' && (
                  <button className="new-vault-btn import-btn" onClick={() => { setImportMode(true); setImportStep(1); }}>↓ Import</button>
                )}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="user-email">{session?.user?.email}</span>
        <button className="signout-btn" onClick={onSignOut}>Sign Out</button>
      </div>
    </aside>
  )
}