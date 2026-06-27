import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './hooks/useAuth'
import { useFolders } from './hooks/useFolders'
import { usePortfolio } from './hooks/usePortfolio'
import { useSearch } from './hooks/useSearch'
import { useModal } from './hooks/useModal'
import { useSocial } from './hooks/useSocial'

import { AuthPage } from './pages/AuthPage'
import { MarketView } from './pages/MarketView'
import { PortfolioView } from './pages/PortfolioView'
import { NetworkFeed } from './pages/NetworkFeed'
import { GlobalIntelligence } from './pages/GlobalIntelligence'
import { ProfilePage } from './pages/ProfilePage'

import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ConfirmModal } from './components/ConfirmModal'

import './App.css'

export default function App() {
  const { session, loading: authLoading, signIn, signUp, signOut } = useAuth()

  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder, addTicker, removeTicker } = useFolders(session)
  const {
    portfolioFolders, activePortfolioId, setActivePortfolioId, loadingFolders: portfolioLoading,
    togglePortfolioPrivacy: _togglePrivacy,
    holdings, livePrices, loadingHoldings,
    createPortfolioFolder, importMarketFolder, renamePortfolioFolder, deletePortfolioFolder,
    saveHolding, removeHolding,
  } = usePortfolio(session)

  const togglePortfolioPrivacy = _togglePrivacy ?? ((folderId, isPublic) => {
    supabase.from('portfolio_folders').update({ is_public: isPublic }).eq('id', folderId)
  })

  // Tabs: intelligence (News Feed), market, portfolio, social (Network/feed), profile
  const [activeTab, setActiveTab]         = useState('market')
  const [activeFolderId, setActiveFolderId] = useState(null)
  const [activeTicker, setActiveTicker]   = useState('')
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sc_sidebar_collapsed') === 'true' } catch { return false }
  })

  const handleToggleCollapse = () => {
    setSidebarCollapsed(c => {
      const next = !c
      try { localStorage.setItem('sc_sidebar_collapsed', String(next)) } catch {}
      return next
    })
  }

  const { modal, confirm, close: closeModal, execute: executeModal } = useModal()
  const search    = useSearch()
  const social    = useSocial(session)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!foldersLoading && folders.length > 0 && !activeFolderId) {
      setActiveFolderId(folders[0].id)
      setActiveTicker(folders[0].tickers[0] ?? '')
    }
  }, [folders, foldersLoading])

  useEffect(() => {
    const fn = e => { if (searchRef.current && !searchRef.current.contains(e.target)) search.close() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg, #f5f3ee)' }}>
      <span style={{ opacity: 0.4, fontSize: 16 }}>Loading...</span>
    </div>
  )
  if (!session) return <AuthPage onSignIn={signIn} onSignUp={signUp} />

  const activeFolder    = activeTab === 'market'
    ? folders.find(f => f.id === activeFolderId)
    : portfolioFolders.find(f => f.id === activePortfolioId)

  const currentFolders  = activeTab === 'market' ? folders : portfolioFolders
  const currentActiveId = activeTab === 'market' ? activeFolderId : activePortfolioId
  const currentLoading  = activeTab === 'market' ? foldersLoading : portfolioLoading

  const handleSelectFolder = folder => {
    if (activeTab === 'market') { setActiveFolderId(folder.id); setActiveTicker(folder.tickers[0] ?? '') }
    else { setActivePortfolioId(folder.id) }
    setSidebarOpen(false)
  }

  const handleCreateFolder = name => activeTab === 'market' ? createFolder(name) : createPortfolioFolder(name)
  const handleRenameFolder = (id, name) => confirm('Rename Folder', `Rename to "${name}"?`, () =>
    activeTab === 'market' ? renameFolder(id, name) : renamePortfolioFolder(id, name))
  const handleDeleteFolder = id => confirm('Delete Folder', 'Permanently delete this folder?', () => {
    if (activeTab === 'market') { deleteFolder(id); if (activeFolderId === id) setActiveFolderId(null) }
    else { deletePortfolioFolder(id); if (activePortfolioId === id) setActivePortfolioId(null) }
  })

  const handleAddTicker = async symbol => {
    if (activeTab === 'portfolio') setActiveTab('market')
    let fid = activeFolderId
    if (!fid && folders.length === 0) {
      const f = await createFolder('My Folder'); fid = f?.id
      if (fid) setActiveFolderId(fid)
    } else if (!fid && folders.length > 0) {
      fid = folders[0].id; setActiveFolderId(fid)
    }
    if (!fid) return
    const ticker = await addTicker(fid, symbol, session.user.id)
    setActiveTicker(ticker)
  }

  const cleanHeaderTabs = new Set(['social', 'intelligence', 'profile'])

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <ConfirmModal modal={modal} onClose={closeModal} onExecute={executeModal} />

      <Sidebar
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        folders={currentFolders}
        activeFolderId={currentActiveId}
        fetchingFolders={currentLoading}
        marketFolders={folders}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={handleCreateFolder}
        onImportFolder={importMarketFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onSignOut={signOut}
        followedUsers={social.followedUsers}
        pendingRequests={social.requests}
      />

      <main className="main">
        <Header
          activeTab={activeTab}
          folderName={cleanHeaderTabs.has(activeTab) ? null : activeFolder?.name}
          tickers={activeTab === 'market' ? (activeFolder?.tickers ?? []) : []}
          activeTicker={activeTicker}
          onSelectTicker={setActiveTicker}
          onRemoveTicker={symbol => confirm('Remove Asset', `Remove ${symbol}?`, () => removeTicker(activeFolderId, symbol))}
          onHamburger={() => setSidebarOpen(o => !o)}
          search={{
            query: search.query, results: search.results, open: search.open,
            selectedIndex: search.selectedIndex,
            onQueryChange: q => { search.setQuery(q); search.setOpen(true) },
            onFocus: () => search.setOpen(true), onKey: search.handleKey,
            onSelect: handleAddTicker, onClear: search.clear, searchRef,
          }}
        />

        <div className="content">
          {activeTab === 'intelligence' ? (
            <GlobalIntelligence />
          ) : activeTab === 'market' ? (
            <MarketView activeTicker={activeTicker} foldersLoading={foldersLoading} />
          ) : activeTab === 'portfolio' ? (
            <PortfolioView
              activePortfolioId={activePortfolioId}
              holdings={holdings} livePrices={livePrices} loadingHoldings={loadingHoldings}
              marketFolders={folders} saveHolding={saveHolding} removeHolding={removeHolding}
              openConfirmModal={confirm}
            />
          ) : activeTab === 'social' ? (
            <NetworkFeed social={social} onGoToProfile={() => setActiveTab('profile')} />
          ) : activeTab === 'profile' ? (
            <ProfilePage
              social={social}
              portfolioFolders={portfolioFolders}
              session={session}
              togglePortfolioPrivacy={togglePortfolioPrivacy}
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}
