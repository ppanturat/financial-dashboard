import { useState, useRef, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFolders } from './hooks/useFolders'
import { usePortfolio } from './hooks/usePortfolio'
import { useStockData } from './hooks/useStockData'
import { useSearch } from './hooks/useSearch'
import { useModal } from './hooks/useModal'
import { useSocial } from './hooks/useSocial'

import { AuthPage } from './pages/AuthPage'
import { MarketView } from './pages/MarketView'
import { PortfolioView } from './pages/PortfolioView'
import { SocialView } from './pages/SocialView'

import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ConfirmModal } from './components/ConfirmModal'

import './App.css'

export default function App() {
  const { session, loading: authLoading, signIn, signUp, signOut } = useAuth()
  
  // market state
  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder, addTicker, removeTicker } = useFolders(session)
  
  // portfolio state
  const { 
    portfolioFolders, activePortfolioId, setActivePortfolioId, loadingFolders: portfolioLoading, togglePortfolioPrivacy,
    holdings, livePrices, loadingHoldings, 
    createPortfolioFolder, importMarketFolder, renamePortfolioFolder, deletePortfolioFolder, 
    saveHolding, removeHolding 
  } = usePortfolio(session)

  const [activeTab, setActiveTab]             = useState('market')
  const [activeFolderId, setActiveFolderId]   = useState(null)
  const [activeTicker, setActiveTicker]       = useState('')
  const [sidebarOpen, setSidebarOpen]         = useState(false)

  const { modal, confirm, close: closeModal, execute: executeModal } = useModal()
  const search = useSearch()
  const social = useSocial(session)
  const searchRef = useRef(null)

  // auto-select first market folder + ticker
  useEffect(() => {
    if (!foldersLoading && folders.length > 0 && !activeFolderId) {
      setActiveFolderId(folders[0].id)
      setActiveTicker(folders[0].tickers[0] ?? '')
    }
  }, [folders, foldersLoading])

  useEffect(() => {
    const fn = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) search.close() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  if (authLoading) return null
  if (!session) return <AuthPage onSignIn={signIn} onSignUp={signUp} />

  const activeFolder = activeTab === 'market' 
    ? folders.find(f => f.id === activeFolderId)
    : portfolioFolders.find(f => f.id === activePortfolioId)

  // dynamic folder actions passed to sidebar
  const currentFolders = activeTab === 'market' ? folders : portfolioFolders
  const currentActiveId = activeTab === 'market' ? activeFolderId : activePortfolioId
  const currentLoading = activeTab === 'market' ? foldersLoading : portfolioLoading

  const handleSelectFolder = (folder) => {
    if (activeTab === 'market') {
      setActiveFolderId(folder.id)
      setActiveTicker(folder.tickers[0] ?? '')
    } else {
      setActivePortfolioId(folder.id)
    }
    setSidebarOpen(false)
  }

  const handleCreateFolder = (name) => activeTab === 'market' ? createFolder(name) : createPortfolioFolder(name)
  const handleRenameFolder = (id, name) => confirm('Rename Folder', `Rename to "${name}"?`, () => activeTab === 'market' ? renameFolder(id, name) : renamePortfolioFolder(id, name))
  const handleDeleteFolder = (id) => confirm('Delete Folder', 'Permanently delete this folder?', () => {
    if (activeTab === 'market') {
      deleteFolder(id)
      if (activeFolderId === id) setActiveFolderId(null)
    } else {
      deletePortfolioFolder(id)
      if (activePortfolioId === id) setActivePortfolioId(null)
    }
  })

  // market view ticker addition
  const handleAddTicker = async (symbol) => {
    if (activeTab === 'portfolio') setActiveTab('market')
    let fid = activeFolderId
    if (!fid && folders.length === 0) {
      const f = await createFolder('My Folder')
      fid = f?.id
      if (fid) setActiveFolderId(fid)
    }
    const ticker = await addTicker(fid, symbol, session.user.id)
    setActiveTicker(ticker)
  }

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      
      <ConfirmModal modal={modal} onClose={closeModal} onExecute={executeModal} />

      <Sidebar
        isOpen={sidebarOpen}
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
          folderName={activeFolder?.name}
          tickers={activeTab === 'market' ? (activeFolder?.tickers ?? []) : []}
          activeTicker={activeTicker}
          onSelectTicker={setActiveTicker}
          onRemoveTicker={(symbol) => confirm('Remove Asset', `Remove ${symbol}?`, () => removeTicker(activeFolderId, symbol))}
          onHamburger={() => setSidebarOpen(o => !o)}
          search={{
            query: search.query, results: search.results, open: search.open,
            onQueryChange: (q) => { search.setQuery(q); search.setOpen(true) },
            onFocus: () => search.setOpen(true), onKey: search.handleKey,
            onSelect: handleAddTicker, onClear: search.clear, searchRef,
          }}
        />

        <div className="content">
          {activeTab === 'market' ? (
            <MarketView 
              activeTicker={activeTicker} 
              foldersLoading={foldersLoading} 
            />
          ) : activeTab === 'portfolio' ? (
            <PortfolioView 
              activePortfolioId={activePortfolioId}
              holdings={holdings}
              livePrices={livePrices}
              loadingHoldings={loadingHoldings}
              marketFolders={folders}
              saveHolding={saveHolding}
              removeHolding={removeHolding}
              openConfirmModal={confirm} 
            />
          ) : (
            <SocialView social={social} portfolioFolders={portfolioFolders} session={session} togglePortfolioPrivacy={togglePortfolioPrivacy} />
          )}
        </div>
      </main>
    </div>
  )
}