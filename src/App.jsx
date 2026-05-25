import { useState, useRef, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFolders } from './hooks/useFolders'
import { useStockData } from './hooks/useStockData'
import { useSearch } from './hooks/useSearch'
import { useModal } from './hooks/useModal'

import { AuthPage } from './pages/AuthPage'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { PriceRow } from './components/PriceRow'
import { StockChart } from './components/StockChart'
import { MetricsGrid } from './components/MetricsGrid'
import { MetricsSummaryCard } from './components/MetricsSummaryCard'
import { AiScanCard } from './components/AiScanCard'
import { ConfirmModal } from './components/ConfirmModal'
import { EmptyState } from './components/EmptyState'

import './App.css'

export default function App() {
  const { session, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder, addTicker, removeTicker } =
    useFolders(session)

  const [activeFolderId, setActiveFolderId] = useState(null)
  const [activeTicker, setActiveTicker]     = useState('')
  const [timeframe, setTimeframe]           = useState('1M')
  const [sidebarOpen, setSidebarOpen]       = useState(false)

  const { modal, confirm, close: closeModal, execute: executeModal } = useModal()
  const search    = useSearch()
  const searchRef = useRef(null)

  // auto-select first folder + ticker once folders load
  useEffect(() => {
    if (!foldersLoading && folders.length > 0 && !activeFolderId) {
      setActiveFolderId(folders[0].id)
      setActiveTicker(folders[0].tickers[0] ?? '')
    }
  }, [folders, foldersLoading])

  // clear state on sign-out
  useEffect(() => {
    if (!session) { setActiveFolderId(null); setActiveTicker('') }
  }, [session])

  // close search dropdown on outside click
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) search.close()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const stock        = useStockData(activeTicker, timeframe)
  const activeFolder = folders.find(f => f.id === activeFolderId)
  const isEtf        = stock.quoteType === 'ETF'

  if (authLoading) return null
  if (!session)    return <AuthPage onSignIn={signIn} onSignUp={signUp} />

  // ── handlers ──
  const handleSelectFolder = (folder) => {
    setActiveFolderId(folder.id)
    setActiveTicker(folder.tickers[0] ?? '')
    setSidebarOpen(false)
  }

  const handleDeleteFolder = (id) => {
    confirm('Delete Folder', 'Permanently delete this folder and all its tickers?', async () => {
      await deleteFolder(id)
      const remaining = folders.filter(f => f.id !== id)
      if (activeFolderId === id) {
        setActiveFolderId(remaining[0]?.id ?? null)
        setActiveTicker(remaining[0]?.tickers[0] ?? '')
      }
    })
  }

  const handleAddTicker = async (symbol) => {
    if (!session) return
    let fid = activeFolderId
    if (!fid && folders.length === 0) {
      const f = await createFolder('My Portfolio')
      if (!f) return
      fid = f.id
      setActiveFolderId(f.id)
    }
    const ticker = await addTicker(fid, symbol, session.user.id)
    setActiveTicker(ticker)
  }

  const handleRemoveTicker = (symbol) => {
    confirm('Remove Asset', `Remove ${symbol} from this folder?`, async () => {
      await removeTicker(activeFolderId, symbol)
      if (activeTicker === symbol) {
        const folder = folders.find(f => f.id === activeFolderId)
        const next   = folder?.tickers.filter(t => t !== symbol) ?? []
        setActiveTicker(next[0] ?? '')
      }
    })
  }

  const handleRenameFolder = (id, name) => {
    confirm('Rename Folder', `Rename to "${name}"?`, () => renameFolder(id, name))
  }

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <ConfirmModal modal={modal} onClose={closeModal} onExecute={executeModal} />

      <Sidebar
        isOpen={sidebarOpen}
        session={session}
        folders={folders}
        activeFolderId={activeFolderId}
        fetchingFolders={foldersLoading}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={createFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onSignOut={signOut}
      />

      <main className="main">
        <Header
          folderName={activeFolder?.name}
          tickers={activeFolder?.tickers ?? []}
          activeTicker={activeTicker}
          onSelectTicker={setActiveTicker}
          onRemoveTicker={handleRemoveTicker}
          onHamburger={() => setSidebarOpen(o => !o)}
          search={{
            query: search.query,
            results: search.results,
            open: search.open,
            selectedIndex: search.selectedIndex,
            onQueryChange: (q) => { search.setQuery(q); search.setOpen(true) },
            onFocus: () => search.setOpen(true),
            onKey: search.handleKey,
            onSelect: handleAddTicker,
            onClear: search.clear,
            searchRef,
          }}
        />

        <div className="content">
          {!activeTicker ? (
            <EmptyState loading={foldersLoading} />
          ) : (
            <>
              <PriceRow
                ticker={activeTicker}
                isEtf={isEtf}
                currentPrice={stock.currentPrice}
                priceChange={stock.priceChange}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />

              <StockChart
                chartData={stock.chartData}
                graphColor={stock.graphColor}
                timeframe={timeframe}
                loading={stock.loadingData}
              />

              {stock.description && (
                <div className="desc-card">
                  <h3 className="desc-title">Company Profile</h3>
                  <p className="desc-text">{stock.description}</p>
                </div>
              )}

              <MetricsGrid
                metrics={stock.metrics}
                isEtf={isEtf}
                loading={stock.loadingData}
              />

              {/* rule-based summary — always available, no quota dependency */}
              <MetricsSummaryCard
                metrics={stock.metrics}
                ticker={activeTicker}
                isEtf={isEtf}
                loading={stock.loadingData}
              />

              {/* ai assessment — shown when available, gracefully absent when quota is hit */}
              <AiScanCard
                ticker={activeTicker}
                timeframe={timeframe}
                aiScan={stock.aiScan}
                isEtf={isEtf}
                loading={stock.loadingAi}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
