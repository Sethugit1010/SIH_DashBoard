import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  CloudRain,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  GaugeCircle,
  MapPinned,
  Navigation,
  Radio,
  Route,
  Settings,
  ShieldCheck,
  ThermometerSun,
  Truck,
  User,
  Waves,
  Wind,
  Zap,
  CarFront,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

const navItems = [
  { label: 'Overview', icon: Activity, active: true },
  { label: 'Fleet Operations', icon: Truck },
  { label: 'Rover Intelligence', icon: Cpu },
  { label: 'Guided Haulage', icon: Route },
  { label: 'Environment', icon: CloudRain },
  { label: 'Safety & Alerts', icon: AlertTriangle },
  { label: 'V2V / V2I Network', icon: Radio },
  { label: 'Vision Intelligence', icon: Eye },
  { label: 'Control Center', icon: GaugeCircle },
  { label: 'Settings', icon: Settings },
]

const routePath = [
  [18.6949, 81.2162],
  [18.6984, 81.2206],
  [18.7028, 81.2258],
  [18.7087, 81.2321],
  [18.7149, 81.2398],
  [18.7210, 81.2489],
  [18.7268, 81.2601],
  [18.7321, 81.2730],
  [18.7372, 81.2870],
  [18.7424, 81.3013],
]

const safeBounds = [
  [18.6918, 81.2116],
  [18.6970, 81.2175],
  [18.7025, 81.2243],
  [18.7093, 81.2329],
  [18.7182, 81.2460],
  [18.7290, 81.2695],
  [18.7448, 81.3062],
]

const obstacleBlueprint = [
  { id: 'OBSTACLE-07', type: 'Large Rock', distance: 34, severity: 'HIGH', coord: [22.5712, 88.4278] },
  { id: 'OBSTACLE-09', type: 'Road Debris', distance: 28, severity: 'MEDIUM', coord: [22.5701, 88.4256] },
  { id: 'OBSTACLE-11', type: 'Stopped Vehicle', distance: 19, severity: 'CRITICAL', coord: [22.5697, 88.4246] },
]

const initialFleet = [
  { id: 'ROVER-01', type: 'rover', x: 0.12, y: 0.24, speed: 12, heading: 'NE', gps: '11.542° N / 81.412° E', gap: 34, radar: 'ONLINE', thermal: 'ONLINE', v2v: 'CONNECTED', v2i: 'CONNECTED', visibility: 'GOOD', status: 'AUTONOMOUS' },
  { id: 'DMP-01', type: 'dump', x: 0.2, y: 0.42, speed: 16, heading: 'E', gps: '11.546° N / 81.416° E', gap: 32, radar: 'ONLINE', thermal: 'ONLINE', v2v: 'CONNECTED', v2i: 'CONNECTED', visibility: 'GOOD' },
  { id: 'DMP-02', type: 'dump', x: 0.34, y: 0.56, speed: 17, heading: 'SE', gps: '11.549° N / 81.419° E', gap: 20, radar: 'ONLINE', thermal: 'ONLINE', v2v: 'CONNECTED', v2i: 'CONNECTED', visibility: 'LIMITED' },
  { id: 'DMP-03', type: 'dump', x: 0.54, y: 0.7, speed: 15, heading: 'E', gps: '11.553° N / 81.424° E', gap: 35, radar: 'ONLINE', thermal: 'ONLINE', v2v: 'CONNECTED', v2i: 'CONNECTED', visibility: 'GOOD' },
  { id: 'DMP-04', type: 'dump', x: 0.72, y: 0.84, speed: 14, heading: 'NE', gps: '11.557° N / 81.431° E', gap: 40, radar: 'ONLINE', thermal: 'ONLINE', v2v: 'CONNECTED', v2i: 'CONNECTED', visibility: 'GOOD' },
]

const dustSeries = [
  { time: '00:00', dust: 61, humidity: 84, visibility: 65 },
  { time: '00:05', dust: 62, humidity: 85, visibility: 63 },
  { time: '00:10', dust: 64, humidity: 86, visibility: 60 },
  { time: '00:15', dust: 67, humidity: 87, visibility: 58 },
  { time: '00:20', dust: 68, humidity: 88, visibility: 54 },
  { time: '00:25', dust: 69, humidity: 89, visibility: 50 },
  { time: '00:30', dust: 68, humidity: 88, visibility: 42 },
]

const eventTemplates = [
  'ROVER-01 | Obstacle detected | 46 m',
  'DMP-02 | Following distance | 28 m',
  'SYSTEM | Safety warning issued',
  'DMP-02 | Speed adjusted | 17 → 12 km/h',
  'ENVIRONMENT | Dust concentration increased',
  'SYSTEM | Particulate suppression activated',
  'CONTROL | Rover switched to semi-autonomous',
  'V2V | Communication restored',
]

const makeIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const vehicleIconMap = {
  rover: makeIcon('green'),
  dump: makeIcon('orange'),
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedNav, setSelectedNav] = useState('Overview')
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
  const [dust, setDust] = useState(68)
  const [humidity, setHumidity] = useState(89)
  const [visibility, setVisibility] = useState(42)
  const [fleet, setFleet] = useState(initialFleet)
  const [alerts, setAlerts] = useState([
    { id: 1, severity: 'WARNING', vehicle: 'DMP-02', event: 'DMP-02 following distance below 30 m', time: '20:42:13', status: 'ACTIVE' },
    { id: 2, severity: 'CRITICAL', vehicle: 'ROVER-01', event: 'ROVER-01 obstacle detected at 24 m', time: '20:42:18', status: 'ACTIVE' },
    { id: 3, severity: 'WARNING', vehicle: 'SYSTEM', event: 'Visibility below configured threshold', time: '20:42:22', status: 'ACKNOWLEDGED' },
    { id: 4, severity: 'INFO', vehicle: 'V2V', event: 'V2V communication restored', time: '20:42:26', status: 'ACTIVE' },
    { id: 5, severity: 'SUCCESS', vehicle: 'SYSTEM', event: 'Particulate suppression activated', time: '20:42:32', status: 'RESOLVED' },
  ])
  const [events, setEvents] = useState([
    '20:42:13 | ROVER-01 | Obstacle detected | 46 m',
    '20:42:18 | DMP-02 | Following distance | 28 m',
    '20:42:20 | SYSTEM | Safety warning issued',
    '20:42:23 | DMP-02 | Speed adjusted | 17 → 12 km/h',
    '20:42:30 | ENVIRONMENT | Dust concentration increased',
    '20:42:32 | SYSTEM | Particulate suppression activated',
  ])
  const [runScenario, setRunScenario] = useState(false)
  const [enhancement, setEnhancement] = useState(58)
  const [dustMode, setDustMode] = useState('AUTO')
  const [roverMode, setRoverMode] = useState('AUTONOMOUS')
  const [obstacles, setObstacles] = useState(obstacleBlueprint)
  const [v2vDistance, setV2vDistance] = useState(21)

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setDust((current) => Math.min(82, Math.max(55, current + (Math.random() - 0.45) * (runScenario ? 1.8 : 0.8))))
      setHumidity((current) => Math.min(94, Math.max(72, current + (Math.random() - 0.4) * 1.2)))
      setVisibility((current) => Math.min(78, Math.max(20, current + (Math.random() - 0.5) * (runScenario ? -1.8 : 0.8))))
      setV2vDistance((current) => {
        const next = Math.min(38, Math.max(18, current + (Math.random() - 0.45) * 3))
        return Number(next.toFixed(1))
      })

      setFleet((current) => current.map((vehicle, index) => {
        const speedShift = vehicle.id === 'ROVER-01' ? 0.9 : 0.45
        const speed = Math.max(10, Math.min(24, vehicle.speed + (Math.random() - 0.5) * speedShift))
        const x = Math.min(0.82, Math.max(0.08, vehicle.x + (Math.random() - 0.5) * 0.01))
        const y = Math.min(0.9, Math.max(0.12, vehicle.y + (Math.random() - 0.5) * 0.01))
        const gap = index === 1 ? Math.max(18, 32 + (Math.random() - 0.5) * 8) : vehicle.gap

        return {
          ...vehicle,
          speed: Number(speed.toFixed(1)),
          x,
          y,
          gap: Number(gap.toFixed(0)),
        }
      }))
    }, 1600)

    return () => clearInterval(timer)
  }, [runScenario])

  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts((current) => [
        { id: Date.now(), severity: 'WARNING', vehicle: 'DMP-02', event: 'DMP-02 following distance below 30 m', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), status: 'ACTIVE' },
        { id: Date.now() + 1, severity: 'CRITICAL', vehicle: 'ROVER-01', event: 'ROVER-01 obstacle detected at 24 m', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), status: 'ACTIVE' },
        { id: Date.now() + 2, severity: 'WARNING', vehicle: 'SYSTEM', event: 'Visibility below configured threshold', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), status: 'ACTIVE' },
      ])
    }, 12000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setEvents((current) => [
        `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} | ${eventTemplates[Math.floor(Math.random() * eventTemplates.length)]}`,
        ...current,
      ].slice(0, 8))
    }, 4000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (runScenario) {
      setDust(72)
      setVisibility(28)
      setAlerts((current) => [
        ...current,
        { id: Date.now(), severity: 'CRITICAL', vehicle: 'ROVER-01', event: 'AUTONOMOUS ROUTE BLOCKED', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), status: 'ACTIVE' },
      ].slice(0, 6))
      setRoverMode('SEMI-AUTONOMOUS')
      setTimeout(() => setRoverMode('REMOTE CONTROL'), 3000)
      setTimeout(() => setRoverMode('AUTONOMOUS'), 9000)
      setObstacles((current) => [...current, { id: 'OBSTACLE-15', type: 'Large Obstruction', distance: 12, severity: 'CRITICAL', coord: [22.5709, 88.4269] }])
    }
  }, [runScenario])

  const kpis = useMemo(() => [
    { label: 'ACTIVE VEHICLES', value: 5, unit: '', status: 'SAFE', trend: '↗ 3% vs baseline', icon: Truck },
    { label: 'CURRENT VISIBILITY', value: Math.round(visibility), unit: '%', status: visibility < 35 ? 'WARNING' : 'SAFE', trend: '↓ 8% from target', icon: EyeOff },
    { label: 'MINIMUM VEHICLE GAP', value: Math.round(Math.min(...fleet.filter(v => v.id !== 'ROVER-01').map(v => v.gap))), unit: 'm', status: 'WARNING', trend: '↓ 10 m below required', icon: ShieldCheck },
    { label: 'DUST CONCENTRATION', value: Math.round(dust), unit: 'µg/m³', status: dust > 65 ? 'WARNING' : 'SAFE', trend: '↑ 4 µg/m³', icon: Wind },
    { label: 'ACTIVE ALERTS', value: alerts.length, unit: '', status: 'CRITICAL', trend: '2 new in 15 min', icon: AlertTriangle },
    { label: 'FLEET SPEED', value: (fleet.reduce((sum, v) => sum + v.speed, 0) / fleet.length).toFixed(1), unit: 'km/h', status: 'SAFE', trend: '↗ 1.4 km/h', icon: Gauge },
  ], [alerts.length, dust, fleet, visibility])

  const routePolyline = useMemo(() => routePath.map(([lat, lng]) => [lat, lng]), [])
  const boundaryPolyline = useMemo(() => safeBounds.map(([lat, lng]) => [lat, lng]), [])

  const chartData = useMemo(() => {
    return dustSeries.map((entry, index) => ({
      ...entry,
      dust: Number((dust + index * 0.55).toFixed(1)) % 90,
      humidity: Number((humidity - index * 0.8).toFixed(1)) % 100,
      visibility: Number((visibility + index * 1.1).toFixed(1)) % 100,
    }))
  }, [dust, humidity, visibility])

  const mapCenter = [18.69498, 81.2162]
  const corridorPolygon = [
    [18.6922, 81.2120],
    [18.6981, 81.2185],
    [18.7036, 81.2256],
    [18.7108, 81.2340],
    [18.7182, 81.2430],
    [18.7245, 81.2544],
    [18.7301, 81.2684],
    [18.7360, 81.2840],
    [18.7407, 81.2957],
    [18.7387, 81.2910],
    [18.7308, 81.2702],
    [18.7240, 81.2527],
    [18.7148, 81.2384],
    [18.7038, 81.2247],
    [18.6972, 81.2165],
  ]
  const warningPolygon = [
    [18.6939, 81.2140],
    [18.6997, 81.2214],
    [18.7060, 81.2285],
    [18.7132, 81.2376],
    [18.7210, 81.2500],
    [18.7291, 81.2676],
    [18.7360, 81.2842],
    [18.7340, 81.2804],
    [18.7246, 81.2577],
    [18.7142, 81.2394],
    [18.7036, 81.2255],
  ]
  const protectedPerimeter = [
    [18.6910, 81.2096],
    [18.6974, 81.2178],
    [18.7041, 81.2264],
    [18.7118, 81.2368],
    [18.7207, 81.2514],
    [18.7310, 81.2728],
    [18.7391, 81.2926],
    [18.7382, 81.2992],
    [18.7264, 81.2708],
    [18.7148, 81.2397],
    [18.7017, 81.2206],
  ]
  const v2vState = v2vDistance >= 30 ? 'SAFE' : v2vDistance >= 25 ? 'CAUTION' : 'CRITICAL'
  const v2vTone = v2vState === 'SAFE' ? 'status-safe' : v2vState === 'CAUTION' ? 'status-warning' : 'status-critical'

  const roverData = {
    gps: '11.542° N / 81.412° E',
    speed: '12 km/h',
    heading: 'NE',
    radar: 'ONLINE',
    thermal: 'ONLINE',
    dust: 'ONLINE',
    humidity: 'ONLINE',
    v2v: 'CONNECTED',
    v2i: 'CONNECTED',
    dustSuppression: dust > 65 ? 'ACTIVE' : 'STANDBY',
  }

  const radarObjects = [
    { type: 'ROCK', distance: '28 m', angle: '+12°', threat: 'HIGH', x: 48, y: 34, critical: true },
    { type: 'VEHICLE', distance: '41 m', angle: '-07°', threat: 'MEDIUM', x: 64, y: 58 },
    { type: 'DEBRIS', distance: '17 m', angle: '+20°', threat: 'HIGH', x: 72, y: 28, critical: true },
    { type: 'OBSTACLE', distance: '22 m', angle: '-16°', threat: 'CRITICAL', x: 36, y: 62, critical: true },
  ]

  const renderStatus = (status) => {
    const tone = status === 'SAFE' ? 'status-safe' : status === 'WARNING' ? 'status-warning' : status === 'CRITICAL' ? 'status-critical' : 'status-info'
    return <span className={`status-chip ${tone}`}>{status}</span>
  }

  const ackAlert = (id) => {
    setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, status: 'ACKNOWLEDGED' } : alert))
  }

  const runOperationalScenario = () => {
    setRunScenario(true)
    setTimeout(() => setRunScenario(false), 12000)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="mining-brand">
            <div className="brand-mark" />
          </div>
          <button className="icon-button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label="Toggle menu" type="button">
            <ChevronRight style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${selectedNav === label || active ? 'active' : ''}`}
              onClick={() => setSelectedNav(label)}
              title={label}
            >
              <span className="nav-icon"><Icon size={16} /></span>
              {!sidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <div className="brand-mark" />
            <div className="topbar-title">
              <h1>MINING INTELLIGENCE SAFETY &amp; GUIDED HAULAGE SYSTEM</h1>
              <div className="topbar-subtitle">Intelligent Fleet Monitoring • Guided Haulage • Environmental Safety</div>
            </div>
          </div>

          <div className="topbar-center">
            <span className="system-dot" />
            <span>SYSTEM OPERATIONAL</span>
          </div>

          <div className="topbar-right">
            <div className="status-pills">
              <span className="inline-pill">{time}</span>
              <span className="inline-pill"><CloudRain size={12} /> WEATHER: CLEAR</span>
              <span className="inline-pill"><Eye size={12} /> VISIBILITY: {Math.round(visibility)}%</span>
            </div>
            <button className="icon-button" aria-label="User profile" type="button"><User size={15} /></button>
            <button className="icon-button" aria-label="Settings" type="button"><Settings size={15} /></button>
            <button className="icon-button" aria-label="Notifications" type="button"><Bell size={15} /></button>
          </div>
        </header>

        <div className="content">
          <div className="section-header">
            <h2>OPERATIONAL OVERVIEW</h2>
            <button className="primary-button" type="button" onClick={runOperationalScenario}>RUN OPERATIONAL SCENARIO</button>
          </div>

          <div className="kpi-grid">
            {kpis.map(({ label, value, unit, status, trend, icon: Icon }) => (
              <div key={label} className="kpi-card">
                <div className="kpi-row">
                  <span className="kpi-label">{label}</span>
                  <span className="kpi-icon"><Icon size={15} /></span>
                </div>
                <div>
                  <span className="kpi-value">{value}</span>
                  {unit && <span className="kpi-unit">{unit}</span>}
                </div>
                <div className="kpi-foot">
                  <span className="kpi-trend">{trend}</span>
                  {renderStatus(status)}
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="panel map-panel">
              <div className="panel-header">
                <h3 className="panel-title">LIVE HAUL ROAD MONITORING</h3>
                <span className="status-chip status-safe">REAL-TIME OPERATIONS</span>
              </div>
              <div className="panel-body">
                <div className="map-box">
                  <div className="map-ambient" />
                  <div className="map-overlay-top">
                    <span className="map-tag">Mining haul road</span>
                    <span className={`distance-badge ${v2vTone}`}>
                      V2V {v2vDistance.toFixed(1)} m / 30 m
                    </span>
                  </div>
                  <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} zoomControl={false} attributionControl={false} className="map-base">
                    <TileLayer
                      attribution='Tiles &copy; Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors, and the GIS User Community'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <Polygon positions={corridorPolygon} pathOptions={{ color: '#3ddc97', weight: 4, fillColor: '#1b7f57', fillOpacity: 0.18 }} />
                    <Polygon positions={warningPolygon} pathOptions={{ color: '#fbbf24', weight: 3, fillColor: '#d97706', fillOpacity: 0.12, dashArray: '8 8' }} />
                    <Polygon positions={protectedPerimeter} pathOptions={{ color: '#ef4444', weight: 2, fillColor: '#7f1d1d', fillOpacity: 0.08, dashArray: '4 7' }} />
                    <Polyline positions={routePolyline} pathOptions={{ color: '#7dd3fc', weight: 6, opacity: 0.9 }} />
                    <Polyline positions={routePolyline} pathOptions={{ color: '#22c55e', weight: 3, opacity: 1 }} />
                    <Circle center={[18.709, 81.238]} radius={1800} pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.08, weight: 1 }} />
                    {obstacles.map((obstacle) => (
                      <Marker key={obstacle.id} position={obstacle.coord} icon={makeIcon(obstacle.severity === 'CRITICAL' ? 'red' : 'gold')}>
                        <Popup>
                          <div>
                            <strong>{obstacle.id}</strong><br />
                            {obstacle.type}<br />
                            {obstacle.distance} m<br />
                            Severity: {obstacle.severity}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {fleet.map((vehicle) => (
                      <Marker
                        key={vehicle.id}
                        position={[18.690 + vehicle.x * 0.012, 81.208 + vehicle.y * 0.015]}
                        icon={vehicle.id === 'ROVER-01' ? vehicleIconMap.rover : vehicleIconMap.dump}
                      >
                        <Popup>
                          <div>
                            <strong>{vehicle.id}</strong><br />
                            Speed: {vehicle.speed} km/h<br />
                            Heading: {vehicle.heading}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
                <div className="map-legend">
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#22c55e' }} /> Safe corridor</span>
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#fbbf24' }} /> Warning buffer</span>
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#ef4444' }} /> No-go perimeter</span>
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#38bdf8' }} /> Guided haulage</span>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">ROVER INTELLIGENCE</h3>
                <span className="status-chip status-info">{roverMode}</span>
              </div>
              <div className="panel-body rover-card">
                <div className="rover-header">
                  <span className="rover-title">ROVER-01</span>
                  <span className="status-chip status-info">V2V CONNECTED</span>
                </div>

                <div className="rover-metrics">
                  <div className="metric-block"><span className="metric-label">Status</span><span className="metric-value">{roverMode}</span></div>
                  <div className="metric-block"><span className="metric-label">GPS</span><span className="metric-value">{roverData.gps}</span></div>
                  <div className="metric-block"><span className="metric-label">Speed</span><span className="metric-value">{roverData.speed}</span></div>
                  <div className="metric-block"><span className="metric-label">Heading</span><span className="metric-value">{roverData.heading}</span></div>
                  <div className="metric-block"><span className="metric-label">Radar</span><span className="metric-value">ONLINE</span></div>
                  <div className="metric-block"><span className="metric-label">Thermal</span><span className="metric-value">ONLINE</span></div>
                  <div className="metric-block"><span className="metric-label">Dust Sensor</span><span className="metric-value">ONLINE</span></div>
                  <div className="metric-block"><span className="metric-label">Humidity Sensor</span><span className="metric-value">ONLINE</span></div>
                  <div className="metric-block"><span className="metric-label">V2V</span><span className="metric-value">CONNECTED</span></div>
                  <div className="metric-block"><span className="metric-label">V2I</span><span className="metric-value">CONNECTED</span></div>
                  <div className="metric-block"><span className="metric-label">Dust Suppression</span><span className="metric-value">{roverData.dustSuppression}</span></div>
                </div>
              </div>
            </section>
          </div>

          <div className="route-stack">
            <div className="panel radar-card">
              <div className="panel-header">
                <h3 className="panel-title">FORWARD RADAR</h3>
                <span className="status-chip status-info">ONLINE</span>
              </div>
              <div className="panel-body">
                <div className="radar-screen">
                  <div className="radar-sweep" />
                  <div className="radar-ring" />
                  <div className="radar-ring ring-2" />
                  <div className="radar-ring ring-3" />
                  <div className="radar-ring ring-4" />
                  {radarObjects.map((obj) => (
                    <div
                      key={obj.type}
                      className={`radar-object ${obj.critical ? 'critical' : 'safe'}`}
                      data-tag={obj.type}
                      style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="panel thermal-card">
              <div className="panel-header">
                <h3 className="panel-title">THERMAL INTELLIGENCE</h3>
                <span className="status-chip status-info">THERMAL SENSOR ONLINE</span>
              </div>
              <div className="panel-body">
                <div className="thermal-grid">
                  {[...Array(18)].map((_, index) => {
                    const type = index % 5 === 0 ? 'hot' : index % 3 === 0 ? 'human' : ''
                    return <div key={index} className={`thermal-cell ${type}`} />
                  })}
                </div>
                <div className="map-legend">
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#f59e0b' }} /> Vehicle</span>
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#38bdf8' }} /> Human Presence</span>
                  <span className="legend-item"><span className="legend-swatch" style={{ background: '#f87171' }} /> Obstacle</span>
                </div>
              </div>
            </div>
          </div>

          <div className="environment-grid">
            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">ENVIRONMENTAL MONITORING</h3>
                <span className="status-chip status-info">ACTIVE MONITORING</span>
              </div>
              <div className="panel-body">
                <div className="chart-card">
                  <p className="chart-title">Dust Trend</p>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="dustFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                        <XAxis dataKey="time" stroke="#9ab3cf" tick={{ fill: '#9ab3cf', fontSize: 11 }} />
                        <YAxis stroke="#9ab3cf" tick={{ fill: '#9ab3cf', fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="dust" stroke="#22d3ee" fill="url(#dustFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">DUST SUPPRESSION SYSTEM</h3>
                <span className="status-chip status-info">AUTO</span>
              </div>
              <div className="panel-body dust-suppression">
                <div className="gauge-box">
                  <div className="gauge-wrap">
                    <div className="gauge" style={{ background: `conic-gradient(#22c55e 0deg ${Math.min(360, dust * 3.6)}deg, rgba(148,163,184,0.14) ${Math.min(360, dust * 3.6)}deg 360deg)` }}>
                      <div className="gauge-inner">{Math.round(dust)}</div>
                    </div>
                  </div>
                  <div className="vehicle-row"><span>Dust Level</span><strong>{Math.round(dust)} µg/m³</strong></div>
                  <div className="vehicle-row"><span>Humidity</span><strong>{Math.round(humidity)}%</strong></div>
                  <div className="vehicle-row"><span>Spray Pressure</span><strong>4.2 bar</strong></div>
                  <div className="vehicle-row"><span>Flow Rate</span><strong>18 L/min</strong></div>
                  <div className="vehicle-row"><span>Tank Level</span><strong>72%</strong></div>
                </div>

                <div className="gauge-box">
                  <div className="vehicle-row"><span>System</span><strong>{dust > 65 ? 'ACTIVE' : 'STANDBY'}</strong></div>
                  <div className="control-row">
                    {['AUTO', 'MANUAL ON', 'MANUAL OFF'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`secondary-button ${dustMode === mode ? 'active' : ''}`}
                        onClick={() => setDustMode(mode)}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="vehicle-row"><span>Particulate Suppression</span><strong>ACTIVE</strong></div>
                  <div className="vehicle-row"><span>Visibility Support</span><strong>{Math.round(visibility)}%</strong></div>
                  <div className="vehicle-row"><span>Dust Threshold</span><strong>65 µg/m³</strong></div>
                </div>
              </div>
            </section>
          </div>

          <div className="lower-grid">
            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">DUMPER FLEET MONITORING</h3>
                <span className="status-chip status-info">ACTIVE FLEET</span>
              </div>
              <div className="panel-body">
                <div className="fleet-list">
                  {fleet.filter((vehicle) => vehicle.id !== 'ROVER-01').map((vehicle) => (
                    <div key={vehicle.id} className="fleet-card">
                      <div className="vehicle-header">
                        <span className="vehicle-tag">{vehicle.id}</span>
                        <span className="status-chip status-warning">WARNING</span>
                      </div>
                      <div className="vehicle-row"><span>Speed</span><strong>{vehicle.speed.toFixed(1)} km/h</strong></div>
                      <div className="vehicle-row"><span>GPS</span><strong>{vehicle.gps}</strong></div>
                      <div className="vehicle-row"><span>Heading</span><strong>{vehicle.heading}</strong></div>
                      <div className="vehicle-row"><span>Distance to vehicle ahead</span><strong>{Math.round(vehicle.gap)} m</strong></div>
                      <div className="vehicle-row"><span>Radar</span><strong>{vehicle.radar}</strong></div>
                      <div className="vehicle-row"><span>Thermal</span><strong>{vehicle.thermal}</strong></div>
                      <div className="vehicle-row"><span>V2V</span><strong>{vehicle.v2v}</strong></div>
                      <div className="vehicle-row"><span>V2I</span><strong>{vehicle.v2i}</strong></div>
                      <div className="vehicle-row"><span>Visibility</span><strong>{vehicle.visibility}</strong></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">SAFETY &amp; ALERT CENTER</h3>
                <span className="status-chip status-warning">LIVE</span>
              </div>
              <div className="panel-body">
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <div className="alert-card" key={alert.id}>
                      <div className="alert-meta">
                        <span className="alert-icon"><AlertTriangle size={16} /></span>
                        <div className="alert-detail">
                          <strong>{alert.severity}</strong>
                          <span>{alert.time} • {alert.vehicle} • {alert.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.7rem', color: '#dfeaf6' }}>{alert.event}</span>
                        <button className="secondary-button" type="button" onClick={() => ackAlert(alert.id)}>ACKNOWLEDGE</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="network-grid">
            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">V2V SAFETY SYSTEM</h3>
                <span className={`status-chip ${v2vTone}`}>{v2vState === 'SAFE' ? 'SAFE FOLLOWING DISTANCE' : v2vState === 'CAUTION' ? 'WATCH FOLLOWING DISTANCE' : 'UNSAFE FOLLOWING DISTANCE'}</span>
              </div>
              <div className="panel-body">
                <div className="distance-readout">
                  <span className="distance-readout-label">Current Distance</span>
                  <strong className={`distance-value ${v2vTone.replace('status-', '')}`}>{v2vDistance.toFixed(1)} m</strong>
                </div>
                <div className="vehicle-row"><span>Required Distance</span><strong>30 m</strong></div>
                <div className="vehicle-row"><span>Current Speed</span><strong>17 km/h</strong></div>
                <div className="vehicle-row"><span>Recommended Speed</span><strong>{v2vDistance < 25 ? '10 km/h' : '12 km/h'}</strong></div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">V2V / V2I NETWORK</h3>
                <span className="status-chip status-info">LINKS ACTIVE</span>
              </div>
              <div className="panel-body">
                <div className="v2v-visual">
                  {['ROVER-01', 'DMP-01', 'DMP-02', 'DMP-03', 'DMP-04'].map((node, index, array) => (
                    <div className="v2v-line" key={node}>
                      <span className={`node ${index < array.length ? 'connected' : ''}`}>{node}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="vision-grid">
            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">VISION INTELLIGENCE</h3>
                <span className="status-chip status-info">AI-ASSISTED VISIBILITY ENHANCEMENT</span>
              </div>
              <div className="panel-body">
                <div className="vision-window">
                  <div className="vision-road" />
                  <div className="vision-overlay" />
                  <div className="vision-labels">
                    <span className="camera-tag">RAW VIEW</span>
                    <span className="camera-tag">Visibility Before: 28%</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3 className="panel-title">ENHANCED VIEW</h3>
                <span className="status-chip status-safe">Improvement +14 pts</span>
              </div>
              <div className="panel-body">
                <div className="vision-window enhanced" style={{ filter: `brightness(${0.7 + enhancement / 100}) contrast(${1 + enhancement / 200})` }}>
                  <div className="vision-road" />
                  <div className="vision-overlay" />
                  <div className="vision-labels">
                    <span className="camera-tag">ENHANCED VIEW</span>
                    <span className="camera-tag">Visibility After: 42%</span>
                  </div>
                </div>
                <div className="slider-wrap">
                  <span>0%</span>
                  <input type="range" min="0" max="100" value={enhancement} onChange={(e) => setEnhancement(Number(e.target.value))} />
                  <span>100%</span>
                </div>
              </div>
            </section>
          </div>

          <div className="panel event-panel">
            <div className="panel-header">
              <h3 className="panel-title">OPERATIONAL EVENT LOG</h3>
              <span className="status-chip status-info">LIVE</span>
            </div>
            <div className="panel-body">
              <div className="event-list">
                {events.map((event) => (
                  <div key={event} className="event-item">
                    <strong>{event.split(' | ')[0]}</strong>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel control-center">
            <div className="panel-header">
              <h3 className="panel-title">CONTROL CENTER</h3>
              <span className="status-chip status-safe">FLEET STATUS NORMAL</span>
            </div>
            <div className="panel-body">
              <div className="control-surface">
                {fleet.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`control-vehicle ${vehicle.id === 'ROVER-01' ? 'rover' : 'dump'}`}
                    data-id={vehicle.id}
                    style={{ left: `${vehicle.x * 100}%`, top: `${vehicle.y * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
