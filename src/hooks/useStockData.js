import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cleanDescription } from '../lib/formatters'

export function useStockData(ticker, timeframe) {
  const [chartData, setChartData] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [quoteType, setQuoteType] = useState('EQUITY')
  const [metrics, setMetrics] = useState(null)
  const [description, setDescription] = useState('')
  const [aiScan, setAiScan] = useState(null)
  const [etfHoldings, setEtfHoldings] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingAi, setLoadingAi] = useState(false)

  const prevTickerRef = useRef(null)

  useEffect(() => {
    if (!ticker) return
    const isNewTicker = prevTickerRef.current !== ticker
    prevTickerRef.current = ticker

    const ctrl = new AbortController()

    const run = async () => {
      if (isNewTicker) {
        setLoadingData(true)
        setLoadingAi(true)
        setMetrics(null)
        setAiScan(null)
        setEtfHoldings(null)
        setCurrentPrice(null)
        setDescription('')
      }

      try {
        const data = await api.stockData(ticker, timeframe, ctrl.signal)

        setChartData(data.chart ?? [])
        const last = data.chart?.[data.chart.length - 1]
        if (last) setCurrentPrice(last.price)

        if (isNewTicker) {
          setQuoteType(data.quoteType ?? 'EQUITY')
          setMetrics(data.metrics ?? null)
          setDescription(cleanDescription(data.description ?? ''))
          setLoadingData(false)

          if (data.quoteType !== 'ETF') {
            setLoadingAi(true)
            try {
              const ai = await api.aiScan(ticker, ctrl.signal)
              setAiScan(ai)
            } catch { /* ai is optional */ }
            setLoadingAi(false)
          } else {
            // fetch ETF top holdings for the breakdown display
            try {
              const holdings = await api.etfHoldings(ticker, ctrl.signal)
              setEtfHoldings(holdings ?? [])
            } catch { setEtfHoldings([]) }
            setLoadingAi(false)
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError' && isNewTicker) {
          setDescription('failed to fetch data.')
          setLoadingData(false)
          setLoadingAi(false)
        }
      }
    }

    run()
    return () => ctrl.abort()
  }, [ticker, timeframe])

  const isUp = chartData.length > 1
    && chartData[chartData.length - 1].price >= chartData[0].price
  const graphColor = isUp ? '#16a34a' : '#dc2626'
  const priceChange = chartData.length > 1
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100)
    : null

  return {
    chartData, currentPrice, quoteType, metrics, description, aiScan, etfHoldings,
    loadingData, loadingAi, graphColor, priceChange,
  }
}
