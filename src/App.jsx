import { useState, useRef, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFolders } from './hooks/useFolders'
import { useSearch } from './hooks/useSearch'
import { useModal } from './hooks/useModal'

import { AuthPage } from './pages/AuthPage'
import { MarketView } from './pages/MarketView'
import { PortfolioView } from './pages/PortfolioView'

import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ConfirmModal } from './components/ConfirmModal'

import './App.css'

export default function App() {
  const { session, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder, addTicker, removeTicker } = useFolders(session)

  const [activeTab, setActiveTab]             = useState('market') // 'market' | 'portfolio'
  const [activeFolderId, setActiveFolderId]   = useState(null)
  const [activeTicker, setActiveTicker]       = useState('')
  const [sidebarOpen, setSidebarOpen]         = useState(false)

  const { modal, confirm, close: closeModal, execute: executeModal } = useModal()
  const search = useSearch()
  const searchRef = useRef(null)

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

  const activeFolder = folders.find(f => f.id === activeFolderId)

  const handleAddTicker = async (symbol) => {
    if (activeTab === 'portfolio') {
      // Switch to market view if they search something while in portfolio
      setActiveTab('market')
    }
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
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        folders={folders}
        activeFolderId={activeFolderId}
        fetchingFolders={foldersLoading}
        onSelectFolder={(f) => { setActiveFolderId(f.id); setActiveTicker(f.tickers[0] ?? ''); setSidebarOpen(false) }}
        onCreateFolder={createFolder}
        onRenameFolder={(id, name) => confirm('Rename Folder', `Rename to "${name}"?`, () => renameFolder(id, name))}
        onDeleteFolder={(id) => confirm('Delete Folder', 'Delete this folder and its tickers?', () => deleteFolder(id))}
        onSignOut={signOut}
      />

      <main className="main">
        <Header
          activeTab={activeTab}
          folderName={activeFolder?.name}
          tickers={activeFolder?.tickers ?? []}
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
          ) : (
            <PortfolioView 
              session={session} 
              openConfirmModal={confirm} 
            />
          )}
        </div>
      </main>
    </div>
  )
}