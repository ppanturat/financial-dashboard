import { useState, useRef, useEffect } from 'react'

// ── SVG logout/power icon ─────────────────────────────────────────────────────
function LogoutIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'intelligence', label: 'News Feed',   icon: '📰' },
  { id: 'market',       label: 'Market View', icon: '📈' },
  { id: 'portfolio',    label: 'Portfolio',   icon: '💼' },
  { id: 'social',       label: 'Network',     icon: '👥' },
  { id: 'profile',      label: 'Profile',     icon: '👤' },
]

const SHOW_FOLDERS = new Set(['market', 'portfolio'])
const NO_NAV_CONTENT = new Set(['intelligence', 'social', 'profile'])

// ── NavItem — handles tooltip + folder popover in collapsed mode ───────────────
function NavItem({ tab, active, collapsed, onClick, folders, activeFolderId, onSelectFolder }) {
  const showFolderPopover = collapsed && SHOW_FOLDERS.has(tab.id) && folders?.length > 0

  return (
    <div className="sidebar-nav-item">
      <button
        className={`sidebar-nav-btn ${active ? 'active' : ''}`}
        onClick={() => onClick(tab.id)}
        title={collapsed ? tab.label : undefined}
        aria-label={tab.label}
      >
        <span className="sidebar-nav-icon">{tab.icon}</span>
        <span className="sidebar-nav-label">{tab.label}</span>
      </button>

      {/* Tooltip — collapsed, no folder popover */}
      {collapsed && !showFolderPopover && (
        <div className="sidebar-nav-tooltip">{tab.label}</div>
      )}

      {/* Folder popover — collapsed, market/portfolio with folders */}
      {showFolderPopover && (
        <div className="sidebar-folder-popover">
          <div className="folder-popover-title">{tab.id === 'market' ? 'Market Folders' : 'Portfolio Folders'}</div>
          {folders.map(f => (
            <button
              key={f.id}
              className={`folder-popover-item ${f.id === activeFolderId ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onSelectFolder(f) }}
            >
              <span className="folder-popover-dot" />
              {f.name}
            </button>
          ))}
          <div style={{ padding: '6px 10px 2px', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            Click ▶ to expand sidebar for more options
          </div>
        </div>
      )}

      {/* Tooltip for folder tabs with popover — show tab name */}
      {collapsed && showFolderPopover && (
        <div className="sidebar-nav-tooltip" style={{ top: '50%' }}>{tab.label}</div>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
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
    try { await onImportFolder(importTargetFolder.name, importTickers); setImportMode(false); setImportStep(1); setImportTargetFolder(null); setImportTickers([]) }
    catch (err) { alert(err.message) }
    finally { setIsImporting(false) }
  }

  const showFolderSection = SHOW_FOLDERS.has(activeTab) && !collapsed
  const showNavContent    = !NO_NAV_CONTENT.has(activeTab) && !collapsed

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Brand row ── */}
      <div className="sidebar-brand">
        <span className="brand-mark">◈</span>
        <span className="brand-name">STOCK CHECKER</span>
        {/* Collapse button — expanded only */}
        <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title="Collapse sidebar" aria-label="Collapse sidebar">
          ◀
        </button>
      </div>

      {/* Expand bubble — collapsed only, positioned absolute */}
      <button className="sidebar-expand-btn" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar">
        ▶
      </button>

      {/* ── Nav tabs ── */}
      <div className="sidebar-nav-list">
        {NAV.map(tab => (
          <NavItem
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            collapsed={collapsed}
            onClick={setActiveTab}
            folders={SHOW_FOLDERS.has(tab.id) ? folders : []}
            activeFolderId={activeFolderId}
            onSelectFolder={onSelectFolder}
          />
        ))}
      </div>

      {/* ── Folder label ── */}
      {showFolderSection && (
        <p className="sidebar-label">
          {activeTab === 'market' ? 'Market Folders' : 'Portfolio Folders'}
        </p>
      )}

      {/* ── Folder list / import / social ── */}
      <nav className="sidebar-nav">
        {NO_NAV_CONTENT.has(activeTab) ? null
        : fetchingFolders ? (
          <p className="sidebar-loading">Loading...</p>
        ) : (
          <>
            {folders.map(f => (
              <div key={f.id} className={`vault-row ${f.id === activeFolderId ? 'active' : ''}`}>
                {editingId === f.id ? (
                  <input className="vault-edit-input" autoFocus value={editName}
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
                <input ref={newRef} className="vault-edit-input" autoFocus placeholder="Folder Name..."
                  value={newName} onChange={e => setNewName(e.target.value)}
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

      {/* ── Footer — pushed to bottom ── */}
      <div className="sidebar-footer">
        {/* Email */}
        <span className="user-email">{session?.user?.email}</span>

        {/* Bug / GitHub links */}
        <div className="sidebar-footer-links">
          <a href="https://github.com/ppanturat/financial-dashboard/issues/new" target="_blank" rel="noreferrer">
            Report Bug
          </a>
          <span className="sep">•</span>
          <a href="https://github.com/ppanturat/financial-dashboard" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>

        {/* Sign-out — proper logout arrow icon */}
        <button className="signout-btn" onClick={onSignOut} aria-label="Sign out">
          <LogoutIcon size={15} />
          <span className="signout-label">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
