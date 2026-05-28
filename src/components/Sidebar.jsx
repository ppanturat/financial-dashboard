import { useState, useRef, useEffect } from 'react'

export function Sidebar({ 
  session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, marketFolders, 
  isOpen, onSelectFolder, onCreateFolder, onImportFolder, onRenameFolder, onDeleteFolder, onSignOut 
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

      <p className="sidebar-label">{activeTab === 'market' ? 'Market Folders' : activeTab === 'portfolio' ? 'Portfolio Folders' : 'Your Network'}</p>

      <nav className="sidebar-nav">
        {fetchingFolders ? (
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