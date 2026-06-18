import { useState, useRef, useEffect } from 'react'

export function Sidebar({ 
  session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, marketFolders, 
  isOpen, collapsed, setCollapsed, onSelectFolder, onCreateFolder, onImportFolder, onRenameFolder, onDeleteFolder, onSignOut,
  followedUsers, pendingRequests
}) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  
  const [importMode, setImportMode] = useState(false)
  const [importStep, setImportStep] = useState(1) 
  const [importTargetFolder, setImportTargetFolder] = useState(null)
  const [importTickers, setImportTickers] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const newRef = useRef(null)

  useEffect(() => {
    setImportMode(false); setImportStep(1); setImportTargetFolder(null); setImportTickers([]); setNewMode(false); setNewName('')
  }, [activeTab])

  const startEdit = (f) => { setEditingId(f.id); setEditName(f.name) }
  const commitEdit = (id) => { if (editName.trim()) onRenameFolder(id, editName.trim()); setEditingId(null) }
  const commitNew = () => { if (newName.trim()) onCreateFolder(newName.trim()); setNewMode(false); setNewName('') }
  const handleStartImport = (mf) => { setImportTargetFolder(mf); setImportTickers(mf.tickers || []); setImportStep(2) }
  const toggleImportTicker = (t) => setImportTickers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  
  const handleConfirmImport = async () => {
    if (!importTargetFolder) return
    setIsImporting(true)
    try {
      await onImportFolder(importTargetFolder.name, importTickers)
      setImportMode(false); setImportStep(1); setImportTargetFolder(null); setImportTickers([])
    } catch (err) { alert(err.message) } 
    finally { setIsImporting(false) }
  }

  // Determine if we should show the folder management lists
  const showFolders = activeTab === 'market' || activeTab === 'portfolio';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">◈</span>
        {!collapsed && <span className="brand-name">STOCK CHECKER</span>}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <div className="sidebar-tabs">
        <button className={activeTab === 'intelligence' ? 'active' : ''} onClick={() => setActiveTab('intelligence')} title="News Feed">
          {collapsed ? '📰' : 'News Feed'}
        </button>
        <button className={activeTab === 'market' ? 'active' : ''} onClick={() => setActiveTab('market')} title="Market View">
          {collapsed ? '📈' : 'Market View'}
        </button>
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')} title="Portfolio">
          {collapsed ? '💼' : 'Portfolio'}
        </button>
        <button className={activeTab === 'social' ? 'active' : ''} onClick={() => setActiveTab('social')} title="Network">
          {collapsed ? '👥' : 'Network'}
        </button>
      </div>

      {showFolders && !collapsed && (
        <p className="sidebar-label">{activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}</p>
      )}

      <nav className="sidebar-nav">
        {/* Hide complex nav contents if collapsed */}
        {!collapsed && (
          <>
            {activeTab === 'social' ? (
               // ... Social Tab Logic (Left unchanged from your current code for brevity, just paste your existing social feed map here)
               <p className="sidebar-loading">Network tools...</p>
            ) : !showFolders ? null : fetchingFolders ? (
              <p className="sidebar-loading">Loading...</p>
            ) : (
              <>
                {folders.map(f => (
                  <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
                    {editingId === f.id ? (
                      <input className="vault-edit-input" autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => commitEdit(f.id)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(f.id); if (e.key === 'Escape') setEditingId(null) }} />
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
                    <input ref={newRef} className="vault-edit-input" autoFocus placeholder="Folder Name..." value={newName} onChange={e => setNewName(e.target.value)} onBlur={commitNew} onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setNewMode(false); setNewName('') } }} />
                  </div>
                ) : importMode ? (
                  <div className="import-picker-menu">
                    {/* ... Existing import HTML ... */}
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
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <span className="user-email">{session?.user?.email}</span>}
        <button className="signout-btn" onClick={onSignOut} title="Sign Out">
          {collapsed ? '⏻' : 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}