import { useStore, SCREENS } from '../../store/useStore'
import DatePicker from 'react-datepicker'

const NAV_ITEMS = [
  { id: SCREENS.HERO,       label: '⌂ Home',         icon: '⌂' },
  { id: SCREENS.MAP,        label: 'Region & Date',   icon: '◎' },
  { id: SCREENS.SURFACE,    label: 'Surface Inputs',  icon: '≋' },
  { id: SCREENS.DEPTH3D,    label: '3D Depth View',   icon: '◈' },
  { id: SCREENS.VALIDATION, label: 'Validation',      icon: '◉' },
]

export default function NavBar() {
  const { currentScreen, setScreen, selectedDate, setSelectedDate } = useStore()
  const parsedDate = new Date(selectedDate)

  return (
    <div className="glass" style={{
      display: 'flex', alignItems: 'center',
      padding: '0 20px', height: 52, flexShrink: 0,
      borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
      borderBottom: '1px solid var(--glass-border)',
      gap: 8, zIndex: 100,
    }}>
      {/* Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginRight: 12 }}
        onClick={() => setScreen(SCREENS.HERO)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="10" stroke="#48CAE4" strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="11" cy="11" rx="4" ry="10" stroke="#48CAE4" strokeWidth="1" opacity="0.4" />
          <line x1="1" y1="11" x2="21" y2="11" stroke="#48CAE4" strokeWidth="1" opacity="0.4" />
          <circle cx="11" cy="11" r="2" fill="#48CAE4" opacity="0.8" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ocean-surface)', letterSpacing: '-0.01em' }}>
          OceanDepth
        </span>
      </div>

      {/* Nav pills */}
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-pill ${currentScreen === item.id ? 'active' : ''}`}
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Date picker (compact) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="label" style={{ fontSize: '0.65rem' }}>Date</span>
        <DatePicker
          selected={parsedDate}
          onChange={(date) => setSelectedDate(date.toISOString().split('T')[0])}
          dateFormat="dd MMM yyyy"
          minDate={new Date('2020-01-01')}
          maxDate={new Date('2024-12-31')}
          popperPlacement="bottom-end"
        />
      </div>
    </div>
  )
}
