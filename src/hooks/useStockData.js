import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cleanDescription } from '../lib/formatters'

export function useStockData(ticker, timeframe) {
  const [chartData, setChartData] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [quoteType, setQuoteType] = useState('EQUITY')
  const [metrics, setMetrics] = useState(null)
  const [description, setDescription] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  const prevTickerRef = useRef(null)

  useEffect(() => {
    if (!ticker) return
    const isNewTicker = prevTickerRef.current !== ticker
    prevTickerRef.current = ticker

    const ctrl = new AbortController()

    const run = async () => {
      if (isNewTicker) {
        setLoadingData(true)
        setMetrics(null)
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
        }
      } catch (e) {
        if (e.name !== 'AbortError' && isNewTicker) {
          setDescription('failed to fetch data.')
          setLoadingData(false)
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
    chartData, currentPrice, quoteType, metrics, description,
    loadingData, graphColor, priceChange,
  }
}
