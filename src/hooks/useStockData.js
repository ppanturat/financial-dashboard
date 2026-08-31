import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { cleanDescription, deriveCashRunway } from '../lib/formatters'

export function useStockData(ticker, timeframe) {
  const [chartData, setChartData]     = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [quoteType, setQuoteType]     = useState('EQUITY')
  const [metrics, setMetrics]         = useState(null)
  const [description, setDescription] = useState('')
  const [etfHoldings, setEtfHoldings] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingExtra, setLoadingExtra] = useState(false)

  // raw inputs for the Altman Z / Piotroski F / Beneish M quant models —
  // each is either a fully-populated object or null (see api/index.py's
  // _build_quant_model_inputs, which never returns a partial object)
  const [altmanInputs, setAltmanInputs]       = useState(null)
  const [piotroskiInputs, setPiotroskiInputs] = useState(null)
  const [beneishInputs, setBeneishInputs]     = useState(null)

  const prevTickerRef = useRef(null)

  useEffect(() => {
    if (!ticker) return
    const isNewTicker = prevTickerRef.current !== ticker
    prevTickerRef.current = ticker

    const ctrl = new AbortController()

    const run = async () => {
      if (isNewTicker) {
        setLoadingData(true)
        setLoadingExtra(true)
        setMetrics(null)
        setEtfHoldings(null)
        setCurrentPrice(null)
        setDescription('')
        setAltmanInputs(null)
        setPiotroskiInputs(null)
        setBeneishInputs(null)
      }

      try {
        const data = await api.stockData(ticker, timeframe, ctrl.signal)

        setChartData(data.chart ?? [])
        const last = data.chart?.[data.chart.length - 1]
        if (last) setCurrentPrice(last.price)

        if (isNewTicker) {
          setQuoteType(data.quoteType ?? 'EQUITY')
          // augment with Cash Runway — computed client-side from
          // total_cash/fcf (already in the metrics payload), the same way
          // runTerminalRedFlagSweep does it internally, so it can be shown
          // as its own tile in the Financial Health pill
          const rawMetrics = data.metrics ?? null
          setMetrics(rawMetrics ? { ...rawMetrics, cash_runway: deriveCashRunway(rawMetrics) } : null)
          setDescription(cleanDescription(data.description ?? ''))
          setAltmanInputs(data.altman_inputs ?? null)
          setPiotroskiInputs(data.piotroski_inputs ?? null)
          setBeneishInputs(data.beneish_inputs ?? null)
          setLoadingData(false)

          if (data.quoteType === 'ETF') {
            try {
              const holdings = await api.etfHoldings(ticker, ctrl.signal)
              setEtfHoldings(holdings ?? [])
            } catch { setEtfHoldings([]) }
          }

          setLoadingExtra(false)
        }
      } catch (e) {
        if (e.name !== 'AbortError' && isNewTicker) {
          setDescription('Failed to fetch data.')
          setLoadingData(false)
          setLoadingExtra(false)
        }
      }
    }

    run()
    return () => ctrl.abort()
  }, [ticker, timeframe])

  const isUp = chartData.length > 1
    && chartData[chartData.length - 1].price >= chartData[0].price

  return {
    chartData,
    currentPrice,
    quoteType,
    metrics,
    description,
    etfHoldings,
    loadingData,
    loadingExtra,
    altmanInputs,
    piotroskiInputs,
    beneishInputs,
    graphColor:  isUp ? '#16a34a' : '#dc2626',
    priceChange: chartData.length > 1
      ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100)
      : null,
  }
}
