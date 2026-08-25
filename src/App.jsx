import { useStore, SCREENS } from './store/useStore'
import Hero from './components/Hero/Hero'
import MapSelector from './components/Map/MapSelector'
import SurfaceViewer from './components/SurfaceViewer/SurfaceViewer'
import DepthProfile3D from './components/DepthProfile3D/DepthProfile3D'
import ValidationPanel from './components/ValidationPanel/ValidationPanel'

export default function App() {
  const currentScreen = useStore((s) => s.currentScreen)

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {currentScreen === SCREENS.HERO       && <Hero />}
      {currentScreen === SCREENS.MAP        && <MapSelector />}
      {currentScreen === SCREENS.SURFACE    && <SurfaceViewer />}
      {currentScreen === SCREENS.DEPTH3D    && <DepthProfile3D />}
      {currentScreen === SCREENS.VALIDATION && <ValidationPanel />}
    </div>
  )
}
