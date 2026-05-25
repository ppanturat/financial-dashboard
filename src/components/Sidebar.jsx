import { useState, useRef } from 'react'

export function Sidebar({ 
  session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, marketFolders, 
  isOpen, onSelectFolder, onCreateFolder, onImportFolder, onRenameFolder, onDeleteFolder, onSignOut 
}) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [importMode, setImportMode] = useState(false)
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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">◈</span>
        <span className="brand-name">FINANCIAL DASHBOARD</span>
      </div>

      <div className="sidebar-tabs">
        <button className={activeTab === 'market' ? 'active' : ''} onClick={() => setActiveTab('market')}>Market View</button>
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')}>Portfolio</button>
      </div>

      <p className="sidebar-label">{activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}</p>

      <nav className="sidebar-nav">
        {fetchingFolders ? (
          <p className="sidebar-loading">loading...</p>
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
                  placeholder="folder name..."
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
                <span className="import-label">select market folder:</span>
                <div className="import-list">
                  {marketFolders?.map(mf => (
                    <button key={mf.id} className="import-item-btn" onClick={() => { onImportFolder(mf); setImportMode(false); }}>
                      ↳ {mf.name} <span className="import-count">({mf.tickers?.length || 0})</span>
                    </button>
                  ))}
                  {marketFolders?.length === 0 && <span className="import-empty">no market folders found.</span>}
                </div>
                <button className="btn-text btn-cancel" onClick={() => setImportMode(false)}>cancel</button>
              </div>
            ) : (
              <div className="sidebar-btn-row">
                <button className="new-vault-btn" onClick={() => setNewMode(true)}>+ new folder</button>
                {activeTab === 'portfolio' && (
                  <button className="new-vault-btn import-btn" onClick={() => setImportMode(true)}>↓ import</button>
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