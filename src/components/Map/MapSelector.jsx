import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet'
import DatePicker from 'react-datepicker'
import { useStore, SCREENS } from '../../store/useStore'
import NavBar from '../UI/NavBar'

// North Indian Ocean bounding box
const NIO_BOUNDS = [[5, 45], [30, 105]]
const MAP_CENTER = [17.5, 75]

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

function ClickMarker({ point }) {
  if (!point) return null
  return (
    <div style={{ position: 'absolute', zIndex: 1000 }}>
      {/* Leaflet SVG marker is added via JS below */}
    </div>
  )
}

export default function MapSelector() {
  const { selectedDate, setSelectedDate, setScreen, setInspectorPoint, inspectorPoint } = useStore()
  const [mapClickPoint, setMapClickPoint] = useState(null)

  const parsedDate = new Date(selectedDate)

  const handleDateChange = (date) => {
    const iso = date.toISOString().split('T')[0]
    setSelectedDate(iso)
  }

  const handleMapClick = useCallback((latlng) => {
    const pt = { lat: Math.round(latlng.lat * 100) / 100, lon: Math.round(latlng.lng * 100) / 100 }
    setMapClickPoint(pt)
    setInspectorPoint(pt)
  }, [setInspectorPoint])

  return (
    <div className="screen" style={{ background: '#020B18' }}>
      <NavBar />

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Left control panel */}
        <div className="glass-card" style={{
          position: 'absolute', left: 24, top: 24, zIndex: 500,
          padding: '20px', width: 260,
        }}>
          <div className="section-title">Region</div>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>North Indian Ocean</h2>
          <div className="mono" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
            5°N–30°N · 45°E–105°E
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Select Date</div>
          <DatePicker
            selected={parsedDate}
            onChange={handleDateChange}
            dateFormat="dd MMM yyyy"
            minDate={new Date('2020-01-01')}
            maxDate={new Date('2024-12-31')}
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            placeholderText="Select date"
          />

          <div style={{ marginTop: 16, padding: '10px', borderRadius: 8, background: 'rgba(72,202,228,0.08)', border: '1px solid rgba(72,202,228,0.15)' }}>
            <div className="label" style={{ marginBottom: 4 }}>Active Date</div>
            <div className="mono" style={{ color: 'var(--ocean-surface)', fontSize: '0.9rem' }}>{selectedDate}</div>
          </div>

          {mapClickPoint && (
            <div style={{ marginTop: 12, padding: '10px', borderRadius: 8, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <div className="label" style={{ marginBottom: 4 }}>Selected Point</div>
              <div className="mono" style={{ color: '#FF6B35', fontSize: '0.82rem' }}>
                {mapClickPoint.lat}°N, {mapClickPoint.lon}°E
              </div>
              <button
                onClick={() => setScreen(SCREENS.DEPTH3D)}
                style={{ marginTop: 8, width: '100%', padding: '6px', borderRadius: 6, background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                View Depth Profile →
              </button>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div className="section-title">Quick Nav</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Surface Inputs', screen: SCREENS.SURFACE },
                { label: '3D Depth Profile', screen: SCREENS.DEPTH3D },
                { label: 'Validation', screen: SCREENS.VALIDATION },
              ].map(({ label, screen }) => (
                <button
                  key={screen}
                  className="btn-layer"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => setScreen(screen)}
                >
                  {label} →
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <MapContainer
          center={MAP_CENTER}
          zoom={4}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* NIO bounding box highlight */}
          <Rectangle
            bounds={NIO_BOUNDS}
            pathOptions={{
              color: '#48CAE4',
              weight: 2,
              opacity: 0.8,
              fillColor: '#48CAE4',
              fillOpacity: 0.08,
              dashArray: '6 4',
            }}
          />

          <ClickHandler onMapClick={handleMapClick} />
        </MapContainer>

        {/* Point inspector mini-card */}
        {mapClickPoint && (
          <div className="glass-card" style={{
            position: 'absolute', right: 24, top: 24, zIndex: 500,
            padding: '16px', width: 220,
          }}>
            <div className="section-title">Point Inspector</div>
            <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--ocean-surface)', marginBottom: 8 }}>
              {mapClickPoint.lat}°N<br />{mapClickPoint.lon}°E
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              Click a point on the map to view its depth profile in the 3D view or go to the Surface Inputs screen.
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
              onClick={() => setScreen(SCREENS.DEPTH3D)}
            >
              View in 3D →
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="glass" style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, padding: '10px 20px', display: 'flex', gap: 24, alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 2, background: '#48CAE4', borderRadius: 1 }} />
            <span className="label">NIO Bounding Box</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--glass-border)' }} />
          <span className="label">Click map to inspect point</span>
        </div>
      </div>
    </div>
  )
}
