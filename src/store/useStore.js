import { create } from 'zustand'

export const DEPTHS = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]

export const SCREENS = {
  HERO: 'hero',
  MAP: 'map',
  SURFACE: 'surface',
  DEPTH3D: 'depth3d',
  VALIDATION: 'validation',
}

export const useStore = create((set) => ({
  // Navigation
  currentScreen: SCREENS.HERO,
  setScreen: (screen) => set({ currentScreen: screen }),

  // Date
  selectedDate: '2023-06-15',
  setSelectedDate: (date) => set({ selectedDate: date }),

  // Surface layer
  activeLayer: 'sst', // sst | sss | ssh | currents | winds
  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // Depth
  depthIndex: 0,
  setDepthIndex: (i) => set({ depthIndex: i }),

  // Point inspector
  inspectorPoint: null, // { lat, lon }
  setInspectorPoint: (pt) => set({ inspectorPoint: pt }),
  closeInspector: () => set({ inspectorPoint: null }),
}))
