import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, DEPTHS } from '../../store/useStore'
import { generateDepthData, tempColor } from '../../data/mockData'
import NavBar from '../UI/NavBar'
import PointInspector from '../PointInspector/PointInspector'

// ─── Convert depth index → Y position in scene ─────────────────
function depthToY(depthIdx) {
  return 4 - (depthIdx / (DEPTHS.length - 1)) * 10
}

// ─── Temperature grid → Three.js DataTexture ──────────────────
function gridToTexture(grid) {
  const rows = grid.length
  const cols = grid[0]?.length || 1
  const data = new Uint8Array(rows * cols * 4)

  // find min/max in this layer
  let min = Infinity, max = -Infinity
  grid.forEach(row => row.forEach(v => { if (v < min) min = v; if (v > max) max = v }))
  const range = max - min || 1

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (grid[r][c] - min) / range
      const [red, grn, blu] = tempColor(t)
      const idx = (r * cols + c) * 4
      data[idx]     = red
      data[idx + 1] = grn
      data[idx + 2] = blu
      data[idx + 3] = 200
    }
  }

  const tex = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

// ─── Single depth slice plane ──────────────────────────────────
function DepthSlice({ depthIdx, temperature, isActive, yPos }) {
  const meshRef = useRef()
  const matRef = useRef()

  const texture = useMemo(() => gridToTexture(temperature), [temperature])

  useFrame(({ clock }) => {
    if (!matRef.current) return
    const targetOpacity = isActive ? 0.85 : 0.28
    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.08

    if (meshRef.current && isActive) {
      meshRef.current.scale.x = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.005
      meshRef.current.scale.z = 1 + Math.cos(clock.getElapsedTime() * 2) * 0.005
    }
  })

  return (
    <group position={[0, yPos, 0]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8, 1, 1]} />
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={isActive ? 0.85 : 0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Depth label */}
      {isActive && (
        <Text
          position={[-6.5, 0, 0]}
          fontSize={0.25}
          color="#48CAE4"
          anchorX="right"
          font={undefined}
        >
          {DEPTHS[depthIdx]} m
        </Text>
      )}

      {/* Edge glow when active */}
      {isActive && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.PlaneGeometry(12, 8)]} />
          <lineBasicMaterial
            attach="material"
            color="#48CAE4"
            transparent
            opacity={0.6}
          />
        </lineSegments>
      )}
    </group>
  )
}

// ─── All depth slices + scene ──────────────────────────────────
function OceanDepthScene({ depthData, activeDepthIdx }) {
  const { camera } = useThree()

  // Smoothly move camera to active depth
  useEffect(() => {
    const targetY = depthToY(activeDepthIdx) + 6
    // camera drift toward that Y
  }, [activeDepthIdx])

  useFrame(() => {
    const targetY = depthToY(activeDepthIdx) + 5
    camera.position.y += (targetY - camera.position.y) * 0.04
  })

  return (
    <>
      {/* Ambient + depth-tuned lighting */}
      <ambientLight intensity={0.15} color="#0A2340" />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#48CAE4" />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#1B8CA8" />

      {/* Fog deepens with depth */}
      <fog attach="fog" args={['#020B18', 15, 35]} />

      {/* Depth slices */}
      {DEPTHS.map((d, i) => (
        <DepthSlice
          key={d}
          depthIdx={i}
          temperature={depthData.temperature[i]}
          isActive={i === activeDepthIdx}
          yPos={depthToY(i)}
        />
      ))}

      {/* Vertical axis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 5, -4.5, 0, -6, -4.5]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#1B8CA8" transparent opacity={0.4} />
      </line>

      {/* Depth tick marks */}
      {DEPTHS.map((d, i) => (
        <group key={`tick-${d}`} position={[0, depthToY(i), -4.5]}>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([-0.2, 0, 0, 0.2, 0, 0]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={i === activeDepthIdx ? '#48CAE4' : '#1B8CA8'} transparent opacity={0.5} />
          </line>
        </group>
      ))}

      {/* Background particles */}
      <BackgroundParticles />
    </>
  )
}

function BackgroundParticles() {
  const ref = useRef()
  const count = 200
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 16
      p[i * 3 + 1] = Math.random() * 12 - 8
      p[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return p
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += 0.005
      if (pos.array[i * 3 + 1] > 4) pos.array[i * 3 + 1] = -8
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#48CAE4" transparent opacity={0.35} sizeAttenuation />
    </points>
  )
}

// ─── Depth Slider UI ───────────────────────────────────────────
function DepthSlider({ depthIndex, onChange }) {
  const depthM = DEPTHS[depthIndex]

  return (
    <div className="glass-card" style={{ padding: '16px 20px', minWidth: 260 }}>
      <div className="section-title">Depth Scrubber</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <input
            type="range"
            className="depth-slider"
            min={0}
            max={DEPTHS.length - 1}
            value={depthIndex}
            onChange={(e) => onChange(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div className="mono" style={{ fontSize: '1rem', color: 'var(--ocean-surface)', minWidth: 60, textAlign: 'right' }}>
          {depthM} m
        </div>
      </div>

      {/* Depth scale visual */}
      <div style={{ display: 'flex', gap: 4, marginTop: 14, alignItems: 'stretch' }}>
        <div style={{
          width: 8, borderRadius: 4,
          background: 'linear-gradient(to bottom, #FF6B35, #48CAE4, #1B8CA8, #0F4C75, #023E8A)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          {[0, 50, 200, 500, 1000].map((d) => {
            const idx = DEPTHS.indexOf(d)
            return (
              <button
                key={d}
                onClick={() => idx >= 0 && onChange(idx)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '2px 8px', borderRadius: 4, border: 'none',
                  background: depthM === d ? 'rgba(72,202,228,0.15)' : 'transparent',
                  color: depthM === d ? 'var(--ocean-surface)' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                }}
              >
                {d} m
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Temperature scale ─────────────────────────────────────────
function TempScale({ depthIdx, depthData }) {
  const grid = depthData.temperature[depthIdx]
  let min = Infinity, max = -Infinity
  grid.forEach(row => row.forEach(v => { if (v < min) min = v; if (v > max) max = v }))

  return (
    <div className="glass-card" style={{ padding: '16px', minWidth: 180 }}>
      <div className="section-title">Temperature</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <div style={{
          width: 14, height: 100,
          background: 'linear-gradient(to bottom, #FF6B35, #48CAE4, #023E8A)',
          borderRadius: 3,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 100 }}>
          <span className="mono" style={{ fontSize: '0.72rem' }}>{max.toFixed(1)}°C</span>
          <span className="mono" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{((max + min) / 2).toFixed(1)}°C</span>
          <span className="mono" style={{ fontSize: '0.72rem' }}>{min.toFixed(1)}°C</span>
        </div>
      </div>
      <div className="label" style={{ marginTop: 8 }}>At {DEPTHS[depthIdx]} m depth</div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────
export default function DepthProfile3D() {
  const { selectedDate, depthIndex, setDepthIndex, inspectorPoint } = useStore()
  const depthData = generateDepthData(selectedDate)

  return (
    <div className="screen" style={{ background: '#020B18' }}>
      <NavBar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left controls */}
        <div style={{ width: 220, flexShrink: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <DepthSlider depthIndex={depthIndex} onChange={setDepthIndex} />
          <TempScale depthIdx={depthIndex} depthData={depthData} />

          <div className="glass-card" style={{ padding: '12px 16px' }}>
            <div className="section-title">Active Date</div>
            <div className="mono" style={{ color: 'var(--ocean-surface)', fontSize: '0.82rem', marginTop: 4 }}>
              {selectedDate}
            </div>
            <div className="label" style={{ marginTop: 8 }}>
              Reconstructed depth field
            </div>
          </div>

          <div className="glass-card" style={{ padding: '12px 16px' }}>
            <div className="section-title">How to use</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Drag the depth slider to dive through 15 depth levels.<br /><br />
              The active layer glows. Camera descends with you.<br /><br />
              Drag to orbit the 3D view.
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            camera={{ position: [14, 8, 12], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true }}
          >
            <OceanDepthScene
              depthData={depthData}
              activeDepthIdx={depthIndex}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={8}
              maxDistance={28}
            />
          </Canvas>

          {/* Overlay: depth + temp readout */}
          <div className="glass" style={{
            position: 'absolute', top: 16, right: 16,
            padding: '12px 16px', textAlign: 'right',
          }}>
            <div className="label">Current Depth</div>
            <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--ocean-surface)', lineHeight: 1 }}>
              {DEPTHS[depthIndex]} m
            </div>
            <div className="label" style={{ marginTop: 4 }}>
              {depthIndex === 0 ? 'Surface' : depthIndex < 5 ? 'Mixed Layer' : depthIndex < 8 ? 'Thermocline' : 'Deep Ocean'}
            </div>
          </div>

          {/* Instruction badge */}
          <div className="glass" style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            padding: '6px 16px',
          }}>
            <span className="label">Drag to orbit · Scroll to zoom · Use slider to change depth</span>
          </div>
        </div>

        {/* Point inspector sidebar */}
        {inspectorPoint && (
          <div style={{ width: 280, flexShrink: 0, padding: 16, overflowY: 'auto', borderLeft: '1px solid var(--glass-border)' }}>
            <PointInspector />
          </div>
        )}
      </div>
    </div>
  )
}
