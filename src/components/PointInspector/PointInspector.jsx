import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useStore, DEPTHS } from '../../store/useStore'
import { generateDepthData, generateArgoPoints } from '../../data/mockData'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card" style={{ padding: '8px 12px', fontSize: '0.78rem' }}>
      <div className="mono" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label} m</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {p.value?.toFixed(2)}°C
        </div>
      ))}
    </div>
  )
}

export default function PointInspector() {
  const { inspectorPoint, closeInspector, selectedDate, setDepthIndex } = useStore()
  if (!inspectorPoint) return null

  const depthData = generateDepthData(selectedDate)
  const argoPoints = generateArgoPoints(selectedDate)

  // Extract model temperature at closest grid point
  const lat = generateLats()
  const lon = generateLons()

  // For mock: just pick a pseudo-random deterministic profile based on lat/lon
  const seed = Math.round(inspectorPoint.lat * 100 + inspectorPoint.lon * 100)
  const rng = seededRng(seed)

  const modelTemps = DEPTHS.map((d, i) => {
    const base = depthData.temperature[i]
    const latFrac = Math.max(0, Math.min(1, (inspectorPoint.lat - 5) / 25))
    const lonFrac = Math.max(0, Math.min(1, (inspectorPoint.lon - 45) / 60))
    const row = Math.min(Math.round(latFrac * (base.length - 1)), base.length - 1)
    const col = Math.min(Math.round(lonFrac * (base[0].length - 1)), base[0].length - 1)
    return base[row][col]
  })

  // Nearest ARGO point
  const nearestArgo = argoPoints.reduce((nearest, p) => {
    const dist = Math.hypot(p.lat - inspectorPoint.lat, p.lon - inspectorPoint.lon)
    return dist < (nearest?.dist ?? Infinity) ? { ...p, dist } : nearest
  }, null)

  const hasArgo = nearestArgo && nearestArgo.dist < 3

  const chartData = DEPTHS.map((d, i) => ({
    depth: d,
    model: modelTemps[i],
    ...(hasArgo ? { argo: nearestArgo.temperature[i] } : {}),
  }))

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div className="section-title">Point Inspector</div>
          <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--ocean-surface)' }}>
            {inspectorPoint.lat}°N · {inspectorPoint.lon}°E
          </div>
          <div className="label">{selectedDate}</div>
        </div>
        <button
          onClick={closeInspector}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
          title="Close inspector"
        >
          ×
        </button>
      </div>

      {hasArgo && (
        <div style={{
          padding: '5px 10px', borderRadius: 6, marginBottom: 10,
          background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)',
          fontSize: '0.7rem', color: '#FF6B35', fontFamily: 'var(--font-mono)',
        }}>
          ARGO obs within {nearestArgo.dist.toFixed(1)}° · {nearestArgo.lat.toFixed(2)}°N {nearestArgo.lon.toFixed(2)}°E
        </div>
      )}

      {!hasArgo && (
        <div style={{
          padding: '5px 10px', borderRadius: 6, marginBottom: 10,
          background: 'rgba(72,202,228,0.05)', border: '1px solid rgba(72,202,228,0.1)',
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)',
        }}>
          No ARGO obs within 3° — model output only
        </div>
      )}

      {/* Line chart: depth on Y (inverted), temp on X */}
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 4, left: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              horizontal={true}
              vertical={true}
            />
            <XAxis
              type="number"
              dataKey="model"
              domain={['auto', 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{ value: '°C', position: 'insideRight', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="depth"
              reversed
              domain={[0, 1000]}
              ticks={DEPTHS}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
            />
            <Line
              type="monotone"
              dataKey="model"
              stroke="#1B8CA8"
              strokeWidth={2}
              dot={false}
              name="Model"
            />
            {hasArgo && (
              <Line
                type="monotone"
                dataKey="argo"
                stroke="#FF6B35"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ fill: '#FF6B35', r: 3 }}
                name="ARGO"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
        Model: DL reconstruction · ARGO: in-situ float observation
      </div>
    </div>
  )
}

// Local helpers (inline to avoid circular imports)
function generateLats() {
  return Array.from({ length: 20 }, (_, i) => 5 + (i / 19) * 25)
}
function generateLons() {
  return Array.from({ length: 24 }, (_, i) => 45 + (i / 23) * 60)
}
function seededRng(seed) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}
