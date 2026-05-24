import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatXAxis, formatTooltipLabel } from '../lib/formatters'

export function StockChart({ chartData, graphColor, timeframe, loading }) {
  if (loading) return (
    <div className="chart-card">
      <div className="chart-empty"><span className="spinner" /> Fetching Market Data...</div>
    </div>
  )

  if (!chartData.length) return (
    <div className="chart-card">
      <div className="chart-empty">No Data Available</div>
    </div>
  )

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={v => formatXAxis(v, timeframe)}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd" minTickGap={30}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Mono, monospace' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => `$${v}`}
          />
          <Tooltip
            labelFormatter={formatTooltipLabel}
            contentStyle={{ background: '#111', border: 'none', borderRadius: '8px', padding: '8px 12px' }}
            labelStyle={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }}
            itemStyle={{ color: graphColor, fontSize: '13px', fontFamily: 'DM Mono, monospace' }}
            formatter={v => [`$${v.toFixed(2)}`, 'Price']}
          />
          <Line
            type="monotone" dataKey="price"
            stroke={graphColor} strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: graphColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
