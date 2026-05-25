import { useState, useRef } from 'react'

export function Sidebar({ session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder, onSignOut }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  const newRef = useRef(null)

  const commitEdit = (id) => { if (editName.trim()) onRenameFolder(id, editName.trim()); setEditingId(null) }
  const commitNew = () => { if (newName.trim()) onCreateFolder(newName.trim()); setNewMode(false); setNewName('') }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">◈</span>
        <span className="brand-name">STOCK CHECKER</span>
      </div>

      <div className="sidebar-tabs">
        <button className={activeTab === 'market' ? 'active' : ''} onClick={() => {setActiveTab('market');}}>Market View</button>
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => {setActiveTab('portfolio');}}>Portfolio</button>
      </div>

      {activeTab === 'market' && (
        <>
          <p className="sidebar-label">Folders</p>
          <nav className="sidebar-nav">
            {fetchingFolders ? <p className="sidebar-loading">Loading...</p> : (
              <>
                {folders.map(f => (
                  <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
                    {editingId === f.id ? (
                      <input className="vault-edit-input" autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => commitEdit(f.id)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(f.id); if (e.key === 'Escape') setEditingId(null) }} />
                    ) : (
                      <>
                        <button className="vault-btn" onClick={() => onSelectFolder(f)}>
                          <span className="vault-dot" /> <span className="vault-label">{f.name}</span> <span className="vault-count">{f.tickers?.length ?? 0}</span>
                        </button>
                        <div className="vault-actions">
                          <button title="Rename" onClick={() => { setEditingId(f.id); setEditName(f.name) }}>✎</button>
                          <button title="Delete" onClick={() => onDeleteFolder(f.id)}>✕</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {newMode ? (
                  <div className="vault-row">
                    <input ref={newRef} className="vault-edit-input" autoFocus placeholder="Folder name..." value={newName} onChange={e => setNewName(e.target.value)} onBlur={commitNew} onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setNewMode(false); setNewName('') } }} />
                  </div>
                ) : <button className="new-vault-btn" onClick={() => setNewMode(true)}>+ New Folder</button>}
              </>
            )}
          </nav>
        </>
      )}
      <div className="sidebar-footer">
        <span className="user-email">{session?.user?.email}</span>
        <button className="signout-btn" onClick={onSignOut}>Sign Out</button>
      </div>
    </aside>
  )
}