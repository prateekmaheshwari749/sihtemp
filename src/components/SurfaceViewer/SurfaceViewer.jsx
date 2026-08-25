import { useRef, useEffect, useState } from 'react'
import { useStore, SCREENS } from '../../store/useStore'
import { generateSurfaceData, normalizeGrid, tempColorCss, gridMinMax } from '../../data/mockData'
import NavBar from '../UI/NavBar'
import PointInspector from '../PointInspector/PointInspector'

const LAYERS = [
  { id: 'sst',      label: 'SST',      unit: '°C',   desc: 'Sea Surface Temperature' },
  { id: 'sss',      label: 'SSS',      unit: 'psu',  desc: 'Sea Surface Salinity' },
  { id: 'ssh',      label: 'SSH/SLA',  unit: 'm',    desc: 'Sea Surface Height Anomaly' },
  { id: 'currents', label: 'Currents', unit: 'm/s',  desc: 'Surface Current Vectors (U,V)' },
  { id: 'winds',    label: 'Winds',    unit: 'm/s',  desc: 'Surface Wind Vectors (U,V)' },
]

// ─── Canvas-based heatmap ──────────────────────────────────────
function HeatmapCanvas({ grid, colorFn, width = 600, height = 400 }) {
  const canvasRef = useRef()
  const rows = grid.length
  const cols = grid[0]?.length || 1

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cellW = width / cols
    const cellH = height / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = colorFn(grid[r][c])
        ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH))
      }
    }
  }, [grid, width, height, colorFn])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
    />
  )
}

// ─── Vector field (arrows) ─────────────────────────────────────
function VectorField({ uGrid, vGrid, width = 600, height = 400, color = '#48CAE4' }) {
  const canvasRef = useRef()
  const rows = uGrid.length
  const cols = uGrid[0]?.length || 1
  const step = 3 // show every 3rd arrow

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    const cellW = width / cols
    const cellH = height / rows

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.7

    for (let r = 0; r < rows; r += step) {
      for (let c = 0; c < cols; c += step) {
        const u = uGrid[r][c]
        const v = vGrid[r][c]
        const mag = Math.sqrt(u * u + v * v)
        if (mag < 0.05) continue

        const scale = Math.min(mag * 12, cellW * 2)
        const nx = u / mag
        const ny = -v / mag
        const x = (c + 0.5) * cellW
        const y = (r + 0.5) * cellH

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + nx * scale, y + ny * scale)
        ctx.stroke()

        // arrowhead
        const angle = Math.atan2(ny, nx)
        ctx.beginPath()
        ctx.moveTo(x + nx * scale, y + ny * scale)
        ctx.lineTo(x + nx * scale - 4 * Math.cos(angle - 0.4), y + ny * scale - 4 * Math.sin(angle - 0.4))
        ctx.lineTo(x + nx * scale - 4 * Math.cos(angle + 0.4), y + ny * scale - 4 * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [uGrid, vGrid, width, height, color])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

// ─── Color scale legend ────────────────────────────────────────
function ColorLegend({ min, max, unit, label }) {
  const stops = 8
  return (
    <div className="glass-card" style={{ padding: '14px 16px', minWidth: 200 }}>
      <div className="section-title">{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <div style={{
          width: 16, height: 120,
          background: 'linear-gradient(to bottom, #FF6B35, #48CAE4, #0F4C75, #023E8A)',
          borderRadius: 4, flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 120 }}>
          <span className="mono" style={{ fontSize: '0.7rem' }}>{max.toFixed(1)}</span>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{((max + min) / 2).toFixed(1)}</span>
          <span className="mono" style={{ fontSize: '0.7rem' }}>{min.toFixed(1)}</span>
        </div>
      </div>
      <div className="label" style={{ marginTop: 6 }}>{unit}</div>
    </div>
  )
}

// ─── SST colormap (same temp colormap but for individual layers) ─
function makeLayerColorFn(min, max) {
  return (v) => {
    const t = (v - min) / (max - min || 1)
    return tempColorCss(t)
  }
}

export default function SurfaceViewer() {
  const { selectedDate, activeLayer, setActiveLayer, inspectorPoint } = useStore()
  const [containerSize, setContainerSize] = useState({ w: 700, h: 450 })
  const containerRef = useRef()

  const data = generateSurfaceData(selectedDate)

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0]
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Determine which grid to show
  let grid, colorFn, legendMin, legendMax, legendUnit, legendLabel
  let uGrid = null, vGrid = null, isVector = false

  if (activeLayer === 'sst') {
    grid = data.sst
    const { min, max } = gridMinMax(grid)
    colorFn = makeLayerColorFn(min, max)
    legendMin = min; legendMax = max; legendUnit = '°C'; legendLabel = 'SST'
  } else if (activeLayer === 'sss') {
    grid = data.sss
    const { min, max } = gridMinMax(grid)
    const fn = makeLayerColorFn(min, max)
    // SSS: blue→teal
    colorFn = (v) => { const t = (v - min) / (max - min || 1); return `hsl(${190 + t * 30}, ${60 + t * 30}%, ${30 + t * 30}%)` }
    legendMin = min; legendMax = max; legendUnit = 'psu'; legendLabel = 'SSS'
  } else if (activeLayer === 'ssh') {
    grid = data.ssh
    const { min, max } = gridMinMax(grid)
    colorFn = (v) => {
      const t = (v - min) / (max - min || 1)
      const r = Math.round(t * 255)
      const b = Math.round((1 - t) * 200 + 30)
      return `rgb(${r},60,${b})`
    }
    legendMin = min; legendMax = max; legendUnit = 'm'; legendLabel = 'SSH/SLA'
  } else if (activeLayer === 'currents') {
    grid = data.u_curr
    uGrid = data.u_curr; vGrid = data.v_curr; isVector = true
    colorFn = (v) => { const t = Math.abs(v) / 0.4; return `rgba(72,202,228,${0.1 + t * 0.5})` }
    const { min, max } = gridMinMax(data.u_curr)
    legendMin = -0.4; legendMax = 0.4; legendUnit = 'm/s'; legendLabel = 'Surface Currents'
  } else if (activeLayer === 'winds') {
    grid = data.u_wind
    uGrid = data.u_wind; vGrid = data.v_wind; isVector = true
    colorFn = (v) => { const t = Math.abs(v) / 6; return `rgba(255,200,100,${0.08 + t * 0.4})` }
    legendMin = -6; legendMax = 6; legendUnit = 'm/s'; legendLabel = 'Surface Winds'
  }

  return (
    <div className="screen" style={{ background: '#020B18' }}>
      <NavBar />

      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{ width: 240, flexShrink: 0, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div className="section-title">Surface Layer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {LAYERS.map(l => (
                <button
                  key={l.id}
                  className={`btn-layer ${activeLayer === l.id ? 'active' : ''}`}
                  style={{ textAlign: 'left', width: '100%', padding: '8px 12px' }}
                  onClick={() => setActiveLayer(l.id)}
                >
                  <div style={{ fontWeight: 600 }}>{l.label}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 2 }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <div className="section-title">Active Date</div>
            <div className="mono" style={{ color: 'var(--ocean-surface)', fontSize: '0.85rem', marginTop: 4 }}>
              {selectedDate}
            </div>
            <div className="label" style={{ marginTop: 8 }}>
              {LAYERS.find(l => l.id === activeLayer)?.desc}
            </div>
          </div>

          {legendMin !== undefined && (
            <ColorLegend
              min={legendMin}
              max={legendMax}
              unit={legendUnit}
              label={legendLabel}
            />
          )}
        </div>

        {/* Map canvas area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} ref={containerRef}>
          {/* Lat/Lon frame labels */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1, pointerEvents: 'none',
            border: '1px solid rgba(72,202,228,0.2)',
            borderRadius: 4,
          }}>
            {/* Corner labels */}
            {[
              { label: '30°N 45°E', style: { top: 4, left: 4 } },
              { label: '30°N 105°E', style: { top: 4, right: 4 } },
              { label: '5°N 45°E', style: { bottom: 4, left: 4 } },
              { label: '5°N 105°E', style: { bottom: 4, right: 4 } },
            ].map(({ label, style }) => (
              <div key={label} className="mono" style={{
                position: 'absolute', fontSize: '0.62rem',
                color: 'rgba(72,202,228,0.5)', ...style
              }}>{label}</div>
            ))}
          </div>

          {/* Heatmap */}
          {grid && (
            <HeatmapCanvas
              grid={grid}
              colorFn={colorFn}
              width={Math.round(containerSize.w)}
              height={Math.round(containerSize.h)}
            />
          )}

          {/* Vector overlay */}
          {isVector && uGrid && vGrid && (
            <VectorField
              uGrid={uGrid}
              vGrid={vGrid}
              width={Math.round(containerSize.w)}
              height={Math.round(containerSize.h)}
              color={activeLayer === 'winds' ? '#FFD166' : '#48CAE4'}
            />
          )}

          {/* Grid lines overlay */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            preserveAspectRatio="none"
          >
            {[0.25, 0.5, 0.75].map(f => (
              <g key={f}>
                <line x1={`${f * 100}%`} y1="0" x2={`${f * 100}%`} y2="100%"
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <line x1="0" y1={`${f * 100}%`} x2="100%" y2={`${f * 100}%`}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              </g>
            ))}
          </svg>

          {/* Active layer badge */}
          <div className="glass" style={{
            position: 'absolute', top: 16, right: 16, padding: '8px 14px'
          }}>
            <div className="label">{LAYERS.find(l => l.id === activeLayer)?.label}</div>
            <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--ocean-surface)' }}>
              {selectedDate}
            </div>
          </div>
        </div>

        {/* Point inspector panel */}
        {inspectorPoint && (
          <div style={{ width: 300, flexShrink: 0, padding: 16, overflowY: 'auto' }}>
            <PointInspector />
          </div>
        )}
      </div>
    </div>
  )
}
