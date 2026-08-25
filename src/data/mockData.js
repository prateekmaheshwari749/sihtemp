// Mock data generators for all data contract shapes.
// Real data can replace these by placing JSON in /public/data/

import { DEPTHS } from '../store/useStore'

// Bounding box
const LAT_MIN = 5, LAT_MAX = 30
const LON_MIN = 45, LON_MAX = 105
const GRID_LAT = 20, GRID_LON = 24

function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function dateSeed(dateStr) {
  return dateStr.split('-').reduce((a, b) => a * 100 + parseInt(b), 0)
}

/** Generate a 2D grid [GRID_LAT][GRID_LON] of values */
function makeGrid(rng, base, range, smoothness = 3) {
  const grid = []
  for (let i = 0; i < GRID_LAT; i++) {
    const row = []
    for (let j = 0; j < GRID_LON; j++) {
      const noise = Math.sin(i / smoothness) * Math.cos(j / smoothness) * 0.4 + rng() * 0.6
      row.push(base + noise * range)
    }
    grid.push(row)
  }
  return grid
}

export function generateLats() {
  return Array.from({ length: GRID_LAT }, (_, i) => LAT_MIN + (i / (GRID_LAT - 1)) * (LAT_MAX - LAT_MIN))
}
export function generateLons() {
  return Array.from({ length: GRID_LON }, (_, i) => LON_MIN + (i / (GRID_LON - 1)) * (LON_MAX - LON_MIN))
}

export function generateSurfaceData(dateStr) {
  const rng = seededRandom(dateSeed(dateStr))
  const lat = generateLats()
  const lon = generateLons()
  // SST: 26–32 °C
  const sst = makeGrid(rng, 29, 3)
  // SSS: 34–37 psu
  const sss = makeGrid(seededRandom(dateSeed(dateStr) + 1), 35.5, 1.5)
  // SSH/SLA: -0.3 to 0.3 m
  const ssh = makeGrid(seededRandom(dateSeed(dateStr) + 2), 0, 0.3)
  // Currents
  const u_curr = makeGrid(seededRandom(dateSeed(dateStr) + 3), 0, 0.4)
  const v_curr = makeGrid(seededRandom(dateSeed(dateStr) + 4), 0, 0.4)
  // Winds
  const u_wind = makeGrid(seededRandom(dateSeed(dateStr) + 5), 0, 6)
  const v_wind = makeGrid(seededRandom(dateSeed(dateStr) + 6), 0, 6)
  return { sst, sss, ssh, u_curr, v_curr, u_wind, v_wind, lat, lon }
}

export function generateDepthData(dateStr) {
  const rng = seededRandom(dateSeed(dateStr) + 99)
  const depths = DEPTHS
  // Surface ~28-30°C, decreasing to ~3-5°C at 1000m
  const tempProfiles = depths.map((d) => {
    const basetemp = 30 - 25 * Math.pow(d / 1000, 0.45)
    return makeGrid(seededRandom(dateSeed(dateStr) + d), basetemp, 1.5 * (1 - d / 1200))
  })
  return { depths, temperature: tempProfiles, lat: generateLats(), lon: generateLons() }
}

export function generateValidationData() {
  const rng = seededRandom(42)
  return {
    depth: DEPTHS,
    correlation: DEPTHS.map((d) => 0.98 - 0.1 * Math.pow(d / 1000, 0.6) + (rng() - 0.5) * 0.03),
    rmse: DEPTHS.map((d) => 0.15 + 1.4 * Math.pow(d / 1000, 0.5) + (rng() - 0.5) * 0.1),
    bias: DEPTHS.map((d) => (rng() - 0.5) * 0.4 * (1 + d / 500)),
  }
}

export function generateArgoPoints(dateStr) {
  const rng = seededRandom(dateSeed(dateStr) + 777)
  const count = 12
  return Array.from({ length: count }, (_, k) => {
    const lat = LAT_MIN + rng() * (LAT_MAX - LAT_MIN)
    const lon = LON_MIN + rng() * (LON_MAX - LON_MIN)
    const temps = DEPTHS.map((d) => {
      const basetemp = 29.5 - 24 * Math.pow(d / 1000, 0.45)
      return basetemp + (rng() - 0.5) * 1.5
    })
    return { lat, lon, depths: DEPTHS, temperature: temps }
  })
}

// ─── Async loaders with /public/data fallback ─────────────────
async function loadJson(path, fallback) {
  try {
    const r = await fetch(path)
    if (!r.ok) throw new Error(r.status)
    return r.json()
  } catch {
    return fallback
  }
}

export function useSurfaceData(dateStr) { return generateSurfaceData(dateStr) }
export function useDepthData(dateStr)   { return generateDepthData(dateStr) }
export function useValidationData()     { return generateValidationData() }
export function useArgoPoints(dateStr)  { return generateArgoPoints(dateStr) }

// ─── Colormap helpers ─────────────────────────────────────────
/** Map t ∈ [0,1] to a warm→cool temperature color */
export function tempColor(t) {
  // warm: #FF6B35  cool: #023E8A   with mid #1B8CA8
  const stops = [
    [1,   [255, 107, 53]],   // warm surface
    [0.7, [72,  202, 228]],  // thermocline
    [0.4, [27,  140, 168]],
    [0.2, [15,  76,  117]],
    [0,   [2,   62,  138]],  // deep cold
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t1, c1] = stops[i]
    const [t0, c0] = stops[i + 1]
    if (t >= t0) {
      const f = (t - t0) / (t1 - t0)
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ]
    }
  }
  return [2, 62, 138]
}

export function tempColorCss(t) {
  const [r, g, b] = tempColor(t)
  return `rgb(${r},${g},${b})`
}

/** Normalize a grid value to [0,1] given min/max */
export function gridMinMax(grid) {
  let min = Infinity, max = -Infinity
  grid.forEach(row => row.forEach(v => { if (v < min) min = v; if (v > max) max = v }))
  return { min, max }
}

export function normalizeGrid(grid) {
  const { min, max } = gridMinMax(grid)
  const range = max - min || 1
  return grid.map(row => row.map(v => (v - min) / range))
}
