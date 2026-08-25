import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, SCREENS } from '../../store/useStore'

// ─── Caustic Light Shafts ──────────────────────────────────────
function CausticLights() {
  const light1 = useRef()
  const light2 = useRef()
  const light3 = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (light1.current) {
      light1.current.position.x = Math.sin(t * 0.3) * 4
      light1.current.position.z = Math.cos(t * 0.2) * 3
    }
    if (light2.current) {
      light2.current.position.x = Math.cos(t * 0.25 + 1) * 5
      light2.current.position.z = Math.sin(t * 0.35 + 2) * 4
    }
    if (light3.current) {
      light3.current.position.x = Math.sin(t * 0.18 + 3) * 3
      light3.current.position.z = Math.cos(t * 0.28) * 5
    }
  })

  return (
    <>
      <ambientLight intensity={0.08} color="#0A2340" />
      <spotLight
        ref={light1}
        position={[0, 8, 0]}
        angle={0.35}
        penumbra={0.9}
        intensity={3}
        color="#48CAE4"
        castShadow={false}
      />
      <spotLight
        ref={light2}
        position={[3, 8, 2]}
        angle={0.28}
        penumbra={0.95}
        intensity={2}
        color="#1B8CA8"
        castShadow={false}
      />
      <spotLight
        ref={light3}
        position={[-2, 8, -1]}
        angle={0.4}
        penumbra={0.85}
        intensity={1.5}
        color="#0F4C75"
        castShadow={false}
      />
    </>
  )
}

// ─── Animated Water Surface (viewed from below) ─────────────────
function WaterSurface() {
  const meshRef = useRef()
  const materialRef = useRef()

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec4 modelPos = modelMatrix * vec4(position, 1.0);

      float elevation =
        sin(modelPos.x * 0.8 + uTime * 0.6) * 0.18 +
        sin(modelPos.z * 0.9 + uTime * 0.5) * 0.14 +
        sin(modelPos.x * 1.4 + modelPos.z * 1.1 + uTime * 0.4) * 0.08 +
        cos(modelPos.x * 0.5 - modelPos.z * 0.7 + uTime * 0.3) * 0.1;

      modelPos.y += elevation;
      vElevation = elevation;

      gl_Position = projectionMatrix * viewMatrix * modelPos;
    }
  `

  const fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // caustic pattern
      float cx = sin(vUv.x * 18.0 + uTime * 0.8) * cos(vUv.y * 14.0 + uTime * 0.6) * 0.5 + 0.5;
      float cy = cos(vUv.x * 12.0 - uTime * 0.5) * sin(vUv.y * 16.0 + uTime * 0.7) * 0.5 + 0.5;
      float caustic = cx * cy;

      vec3 deepBlue = vec3(0.039, 0.137, 0.251);
      vec3 teal = vec3(0.282, 0.792, 0.894);
      vec3 color = mix(deepBlue, teal, caustic * 0.6 + vElevation * 0.5 + 0.15);

      // Fresnel-like edge glow
      float edge = abs(vUv.x - 0.5) + abs(vUv.y - 0.5);
      color = mix(color, vec3(0.071, 0.298, 0.659), edge * 0.6);

      gl_FragColor = vec4(color, 0.75);
    }
  `

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 3, 0]} rotation={[0, 0, 0]}>
      <planeGeometry args={[24, 24, 80, 80]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Floating Particles (bubbles/motes) ────────────────────────
function Particles() {
  const pointsRef = useRef()
  const count = 300

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8 + 1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return pos
  }, [])

  const speeds = useMemo(() => Array.from({ length: count }, () => 0.01 + Math.random() * 0.03), [])
  const offsets = useMemo(() => Array.from({ length: count }, () => Math.random() * Math.PI * 2), [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const drift = Math.sin(t * speeds[i] * 15 + offsets[i]) * 0.005
      pos.array[i * 3 + 1] += speeds[i] * 0.012
      pos.array[i * 3]     += drift
      if (pos.array[i * 3 + 1] > 4) pos.array[i * 3 + 1] = -4
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#48CAE4"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  )
}

// ─── Gentle Camera Drift ───────────────────────────────────────
function CameraDrift() {
  const { camera } = useThree()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.06) * 0.5
    camera.position.y = -0.5 + Math.cos(t * 0.04) * 0.2
    camera.lookAt(0, 3.5, 0)
  })

  return null
}

// ─── Ocean Floor Grid ──────────────────────────────────────────
function OceanGrid() {
  return (
    <gridHelper
      args={[30, 30, '#0F4C75', '#0A2340']}
      position={[0, -4, 0]}
    />
  )
}

// ─── Hero Overlay (HTML on top of canvas) ─────────────────────
function HeroOverlay() {
  const setScreen = useStore((s) => s.setScreen)

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 10,
    }}>
      {/* Project badge */}
      <div className="fade-in-up" style={{ pointerEvents: 'auto', textAlign: 'center', padding: '0 24px' }}>
        <div className="glass-light" style={{ display: 'inline-block', padding: '4px 12px', marginBottom: 24 }}>
          <span className="label">SIH 2026 · Smart India Hackathon</span>
        </div>

        <h1 className="fade-in-up-delay-1" style={{
          background: 'linear-gradient(135deg, #e8f4fd 0%, #48CAE4 50%, #1B8CA8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 16, textShadow: 'none',
          maxWidth: 700,
        }}>
          Subsurface Ocean<br />Temperature Reconstruction
        </h1>

        <p className="fade-in-up-delay-2" style={{
          fontSize: '1rem', color: 'rgba(255,255,255,0.65)',
          maxWidth: 520, margin: '0 auto 12px', lineHeight: 1.6,
        }}>
          North Indian Ocean · 5°N–30°N, 45°E–105°E
        </p>
        <p className="fade-in-up-delay-2" style={{
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)',
          maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6,
          fontFamily: 'var(--font-mono)',
        }}>
          Satellite embedding-based deep learning · 15 depth levels (0–1000 m)<br />
          Surface inputs: SST · SSS · SSH · Surface Currents · Surface Winds
        </p>

        <button
          className="btn-primary fade-in-up-delay-3"
          onClick={() => setScreen(SCREENS.MAP)}
        >
          Explore Data
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <div className="label fade-in-up-delay-3" style={{ marginBottom: 8 }}>
          Depth Simulation Active
        </div>
        <div style={{
          width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(72,202,228,0.5), transparent)',
          margin: '0 auto',
        }} />
      </div>

      {/* Depth indicator top-right */}
      <div className="glass" style={{
        position: 'absolute', top: 24, right: 24,
        padding: '10px 16px', pointerEvents: 'auto',
      }}>
        <div className="label">Camera Depth</div>
        <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--ocean-surface)' }}>0 m</div>
      </div>
    </div>
  )
}

// ─── Hero Component ────────────────────────────────────────────
export default function Hero() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#020B18' }}>
      <Canvas
        camera={{ position: [0, -0.5, 6], fov: 60 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, alpha: false }}
      >
        <fog attach="fog" args={['#020B18', 10, 40]} />
        <CausticLights />
        <WaterSurface />
        <Particles />
        <CameraDrift />
        <OceanGrid />
      </Canvas>

      <HeroOverlay />
    </div>
  )
}
