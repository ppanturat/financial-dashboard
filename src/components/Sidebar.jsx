import { useState, useRef, useEffect } from 'react'

const NAV_TABS = [
  { id: 'intelligence', label: 'News Feed',    icon: '📰' },
  { id: 'market',       label: 'Market View',  icon: '📈' },
  { id: 'portfolio',    label: 'Portfolio',    icon: '💼' },
  { id: 'social',       label: 'Network',      icon: '👥' },
]

export function Sidebar({
  session, activeTab, setActiveTab, folders, activeFolderId, fetchingFolders, marketFolders,
  isOpen, onSelectFolder, onCreateFolder, onImportFolder, onRenameFolder, onDeleteFolder, onSignOut,
  followedUsers, pendingRequests,
  collapsed, onToggleCollapse,
}) {
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')
  const [newMode, setNewMode]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [importMode, setImportMode] = useState(false)
  const [importStep, setImportStep] = useState(1)
  const [importTargetFolder, setImportTargetFolder] = useState(null)
  const [importTickers, setImportTickers]           = useState([])
  const [isImporting, setIsImporting]               = useState(false)
  const newRef = useRef(null)

  useEffect(() => {
    setImportMode(false); setImportStep(1)
    setImportTargetFolder(null); setImportTickers([])
    setNewMode(false); setNewName('')
  }, [activeTab])

  const startEdit   = (f) => { setEditingId(f.id); setEditName(f.name) }
  const commitEdit  = (id) => { if (editName.trim()) onRenameFolder(id, editName.trim()); setEditingId(null) }
  const commitNew   = () => { if (newName.trim()) onCreateFolder(newName.trim()); setNewMode(false); setNewName('') }
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

  // Tabs that show folder lists in the sidebar
  const showFolders = activeTab === 'market' || activeTab === 'portfolio'

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
      style={{ width: collapsed ? 'var(--sidebar-w-collapsed, 64px)' : 'var(--sidebar-w, 240px)', transition: 'width 0.25s ease' }}
    >
      {/* ── Brand + collapse toggle ── */}
      <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span className="brand-mark">◈</span>
          {!collapsed && <span className="brand-name">STOCK CHECKER</span>}
        </div>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '2px 4px',
            borderRadius: 4, flexShrink: 0, lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.85)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* ── Nav tabs ── */}
      <div className="sidebar-tabs" style={{ padding: collapsed ? '8px 6px' : undefined }}>
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            title={collapsed ? tab.label : undefined}
            style={collapsed ? {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 0', fontSize: 16, width: '100%',
            } : undefined}
          >
            {collapsed ? tab.icon : tab.label}
          </button>
        ))}
      </div>

      {/* ── Folder label — only for market/portfolio, never intelligence/social ── */}
      {!collapsed && showFolders && (
        <p className="sidebar-label">
          {activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}
        </p>
      )}

      {/* ── Nav content ── */}
      {!collapsed && (
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
          ) : activeTab === 'intelligence' ? (
            // News Feed — no folder list, just a clean empty nav
            <p className="sidebar-loading" style={{ opacity: 0 }} />
          ) : fetchingFolders ? (
            <p className="sidebar-loading">Loading...</p>
          ) : (
            <>
              {folders.map(f => (
                <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
                  {editingId === f.id ? (
                    <input
                      className="vault-edit-input" autoFocus value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => commitEdit(f.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(f.id); if (e.key === 'Escape') setEditingId(null) }}
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
                    ref={newRef} className="vault-edit-input" autoFocus
                    placeholder="Folder Name..." value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onBlur={commitNew}
                    onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setNewMode(false); setNewName('') } }}
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
                            <input type="checkbox" checked={importTickers.includes(t)} onChange={() => toggleImportTicker(t)} />
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
                    <button className="new-vault-btn import-btn" onClick={() => { setImportMode(true); setImportStep(1) }}>↓ Import</button>
                  )}
                </div>
              )}
            </>
          )}
        </nav>
      )}

      {/* ── Footer: user + sign out + bug report / github ── */}
      <div className="sidebar-footer" style={collapsed ? { padding: '10px 6px', alignItems: 'center' } : undefined}>
        {!collapsed && (
          <>
            <span className="user-email">{session?.user?.email}</span>
            <button className="signout-btn" onClick={onSignOut}>Sign Out</button>

            {/* Bug report + GitHub */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              <a
                href="https://github.com/ppanturat/financial-dashboard/issues/new"
                target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
              >
                Report Bug
              </a>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>•</span>
              <a
                href="https://github.com/ppanturat/financial-dashboard"
                target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
              >
                GitHub
              </a>
            </div>
          </>
        )}

        {collapsed && (
          <button className="signout-btn" onClick={onSignOut} title="Sign Out"
            style={{ fontSize: 14, padding: '6px', width: '100%' }}>
            ⏏
          </button>
        )}
      </div>
    </aside>
  )
}
