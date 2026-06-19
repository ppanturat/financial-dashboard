import { useState, useRef, useEffect } from 'react'

const NAV = [
  { id: 'intelligence', label: 'News Feed',    icon: '📰' },
  { id: 'market',       label: 'Market View',  icon: '📈' },
  { id: 'portfolio',    label: 'Portfolio',    icon: '💼' },
  { id: 'social',       label: 'Network',      icon: '👥' },
  { id: 'profile',      label: 'Profile',      icon: '👤' },
]

export function Sidebar({
  session, activeTab, setActiveTab,
  folders, activeFolderId, fetchingFolders, marketFolders,
  isOpen, onSelectFolder, onCreateFolder, onImportFolder,
  onRenameFolder, onDeleteFolder, onSignOut,
  followedUsers, pendingRequests,
  collapsed, onToggleCollapse,
}) {
  const [editingId, setEditingId]               = useState(null)
  const [editName, setEditName]                 = useState('')
  const [newMode, setNewMode]                   = useState(false)
  const [newName, setNewName]                   = useState('')
  const [importMode, setImportMode]             = useState(false)
  const [importStep, setImportStep]             = useState(1)
  const [importTargetFolder, setImportTargetFolder] = useState(null)
  const [importTickers, setImportTickers]       = useState([])
  const [isImporting, setIsImporting]           = useState(false)
  const newRef = useRef(null)

  useEffect(() => {
    setImportMode(false); setImportStep(1)
    setImportTargetFolder(null); setImportTickers([])
    setNewMode(false); setNewName('')
  }, [activeTab])

  const startEdit  = f  => { setEditingId(f.id); setEditName(f.name) }
  const commitEdit = id => { if (editName.trim()) onRenameFolder(id, editName.trim()); setEditingId(null) }
  const commitNew  = () => { if (newName.trim()) onCreateFolder(newName.trim()); setNewMode(false); setNewName('') }

  const handleStartImport = mf => { setImportTargetFolder(mf); setImportTickers(mf.tickers || []); setImportStep(2) }
  const toggleImportTicker = t => setImportTickers(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])
  const handleConfirmImport = async () => {
    if (!importTargetFolder) return
    setIsImporting(true)
    try {
      await onImportFolder(importTargetFolder.name, importTickers)
      setImportMode(false); setImportStep(1); setImportTargetFolder(null); setImportTickers([])
    } catch (err) { alert(err.message) }
    finally { setIsImporting(false) }
  }

  // Tabs where we show folder lists
  const showFolders = activeTab === 'market' || activeTab === 'portfolio'

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
      style={{ width: collapsed ? 64 : 'var(--sidebar-w)', transition: 'width 0.22s ease', flexShrink: 0 }}
    >
      {/* ── Brand ── */}
      <div
        className="sidebar-brand"
        style={{
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '18px 0' : '18px 18px 16px',
          gap: 8,
        }}
      >
        {/* Logo mark — always centered when collapsed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span className="brand-mark" style={{ flexShrink: 0, lineHeight: 1 }}>◈</span>
          {!collapsed && <span className="brand-name">STOCK CHECKER</span>}
        </div>
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: 12, padding: '2px 4px',
            borderRadius: 4, flexShrink: 0, lineHeight: 1, display: collapsed ? 'none' : 'block',
          }}
          onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
        >◀</button>
        {/* Expand button — visible only when collapsed */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            style={{
              position: 'absolute', top: 16, right: -12, zIndex: 10,
              background: 'var(--sidebar-bg,#141312)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%', width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.55)', fontSize: 10, cursor: 'pointer',
            }}
          >▶</button>
        )}
      </div>

      {/* ── Nav tabs ── */}
      <div style={{ padding: collapsed ? '6px 8px' : '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={collapsed ? tab.label : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 9,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'none',
              border: 'none', borderRadius: 7, cursor: 'pointer',
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
              fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600,
              padding: collapsed ? '9px 0' : '8px 10px',
              width: '100%', textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontSize: collapsed ? 18 : 14, flexShrink: 0 }}>{tab.icon}</span>
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </div>

      {/* ── Folder label — only for market/portfolio ── */}
      {!collapsed && showFolders && (
        <p className="sidebar-label">
          {activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}
        </p>
      )}

      {/* ── Nav content (hidden when collapsed) ── */}
      {!collapsed && (
        <nav className="sidebar-nav">
          {activeTab === 'social' || activeTab === 'intelligence' || activeTab === 'profile' ? (
            /* No folder list for these tabs */
            <div />
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

      {/* ── Footer ── */}
      <div
        className="sidebar-footer"
        style={collapsed ? { padding: '12px 8px', alignItems: 'center' } : {}}
      >
        {!collapsed ? (
          <>
            <span className="user-email">{session?.user?.email}</span>
            <button className="signout-btn" onClick={onSignOut}>Sign Out</button>
            {/* Bug report / GitHub links */}
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center',
              paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              <a href="https://github.com/ppanturat/financial-dashboard/issues/new" target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.28)'}
              >Report Bug</a>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>•</span>
              <a href="https://github.com/ppanturat/financial-dashboard" target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.28)'}
              >GitHub</a>
            </div>
          </>
        ) : (
          <button
            onClick={onSignOut} title="Sign Out"
            style={{
              background: 'none', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 7, color: '#b91c1c', cursor: 'pointer',
              fontSize: 16, padding: '6px', width: '100%', textAlign: 'center',
            }}
          >⏏</button>
        )}
      </div>
    </aside>
  )
}
