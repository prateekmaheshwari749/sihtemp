import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { useStore, DEPTHS } from '../../store/useStore'
import { generateValidationData, tempColorCss } from '../../data/mockData'
import NavBar from '../UI/NavBar'

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card" style={{ padding: '8px 12px', fontSize: '0.75rem' }}>
      <div className="mono" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label} m</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color || 'var(--ocean-surface)', fontFamily: 'var(--font-mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value} {unit}
        </div>
      ))}
    </div>
  )
}

function MetricChart({ data, dataKey, label, unit, color, showRef, refVal }) {
  return (
    <div className="glass-card" style={{ padding: '16px', flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <div className="section-title">{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
          Unit: {unit}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {(() => {
          const vals = data.map(d => d[dataKey])
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          const best = Math.max(...vals.map(v => dataKey === 'correlation' ? v : -v))
          return (
            <>
              <div style={{ textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: '1.1rem', color }}>{avg.toFixed(3)}</div>
                <div className="label">Mean</div>
              </div>
              {dataKey === 'correlation' && (
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--ocean-surface)' }}>
                    {Math.max(...vals).toFixed(3)}
                  </div>
                  <div className="label">Peak</div>
                </div>
              )}
            </>
          )
        })()}
      </div>

      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          {dataKey === 'bias' ? (
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="depth"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Depth (m)', position: 'insideBottom', offset: -12, fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                interval={2}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />
              <Bar dataKey={dataKey} name={label} radius={[2, 2, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d[dataKey] >= 0 ? '#1B8CA8' : '#FF6B35'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="depth"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Depth (m)', position: 'insideBottom', offset: -12, fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                interval={2}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={dataKey === 'correlation' ? [0.7, 1] : ['auto', 'auto']}
              />
              <Tooltip content={<ChartTooltip unit={unit} />} />
              {showRef && (
                <ReferenceLine y={refVal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />
              )}
              <Line
                type="monotone"
                dataKey={dataKey}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, index } = props
                  const val = data[index][dataKey]
                  const t = dataKey === 'correlation'
                    ? val
                    : dataKey === 'rmse' ? 1 - val / 2 : 0.5 + val * 0.3
                  return (
                    <circle key={index} cx={cx} cy={cy} r={3}
                      fill={tempColorCss(Math.max(0, Math.min(1, t)))}
                      stroke="none"
                    />
                  )
                }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ValidationPanel() {
  const { selectedDate } = useStore()
  const validation = generateValidationData()

  const chartData = DEPTHS.map((d, i) => ({
    depth: d,
    correlation: validation.correlation[i],
    rmse: validation.rmse[i],
    bias: validation.bias[i],
  }))

  const avgCorr = validation.correlation.reduce((a, b) => a + b, 0) / validation.correlation.length
  const avgRmse = validation.rmse.reduce((a, b) => a + b, 0) / validation.rmse.length

  return (
    <div className="screen" style={{ background: '#020B18' }}>
      <NavBar />

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 4 }}>Validation Against ARGO Observations</h2>
          <div className="mono" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            15 depth levels · North Indian Ocean · Model vs ARGO float measurements
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Mean Correlation', value: avgCorr.toFixed(3), color: '#48CAE4', suffix: '', desc: 'Across all 15 depths' },
            { label: 'Mean RMSE', value: avgRmse.toFixed(3), color: '#FF6B35', suffix: ' °C', desc: 'Temperature error' },
            { label: 'Best Corr (0 m)', value: validation.correlation[0].toFixed(3), color: '#1B8CA8', suffix: '', desc: 'Surface layer' },
            { label: 'Depth Levels', value: '15', color: 'var(--ocean-surface)', suffix: '', desc: '0 – 1000 m' },
          ].map(card => (
            <div key={card.label} className="glass-card" style={{ padding: '14px 18px', flex: '1 1 160px', minWidth: 140 }}>
              <div className="section-title">{card.label}</div>
              <div className="mono" style={{ fontSize: '1.6rem', color: card.color, lineHeight: 1.1, margin: '6px 0 2px' }}>
                {card.value}{card.suffix}
              </div>
              <div className="label">{card.desc}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <MetricChart
            data={chartData}
            dataKey="correlation"
            label="Correlation (R)"
            unit=""
            color="#48CAE4"
            showRef
            refVal={1}
          />
          <MetricChart
            data={chartData}
            dataKey="rmse"
            label="RMSE"
            unit="°C"
            color="#FF6B35"
          />
          <MetricChart
            data={chartData}
            dataKey="bias"
            label="Bias"
            unit="°C"
            color="#1B8CA8"
            showRef
            refVal={0}
          />
        </div>

        {/* Depth-by-depth table */}
        <div className="glass-card" style={{ marginTop: 20, padding: '16px' }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Depth-Level Summary</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr>
                  {['Depth (m)', 'Correlation', 'RMSE (°C)', 'Bias (°C)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={row.depth} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '5px 12px', color: 'var(--ocean-surface)' }}>{row.depth}</td>
                    <td style={{ padding: '5px 12px', color: row.correlation > 0.95 ? '#48CAE4' : row.correlation > 0.9 ? 'rgba(255,255,255,0.7)' : '#FF6B35' }}>
                      {row.correlation.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 12px', color: row.rmse < 0.5 ? '#48CAE4' : row.rmse < 1 ? 'rgba(255,255,255,0.7)' : '#FF6B35' }}>
                      {row.rmse.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 12px', color: Math.abs(row.bias) < 0.1 ? '#48CAE4' : 'rgba(255,255,255,0.7)' }}>
                      {row.bias >= 0 ? '+' : ''}{row.bias.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
