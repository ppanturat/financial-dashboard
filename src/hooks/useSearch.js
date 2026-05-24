import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const id = setTimeout(async () => {
      try {
        const data = await api.search(query.toUpperCase().trim())
        setResults(data.results ?? [])
        setSelectedIndex(-1)
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(id)
  }, [query])

  const clear = () => { setQuery(''); setResults([]); setSelectedIndex(-1) }
  const close = () => { setOpen(false); setSelectedIndex(-1) }

  const handleKey = (e, onSelect) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      const chosen = selectedIndex >= 0 ? results[selectedIndex]?.symbol : query.trim()
      if (chosen) { onSelect(chosen); clear(); close() }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return { query, setQuery, results, open, setOpen, selectedIndex, setSelectedIndex, clear, close, handleKey }
}
