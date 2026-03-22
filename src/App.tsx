import { useState, useMemo, useRef, useCallback } from 'react'
import MapView from './components/MapView'
import { HotspotLayer } from './components/HotspotMarker'
import CharacterSystem from './components/CharacterSystem'
import TopBar from './components/TopBar'
import BottomSheet from './components/BottomSheet'
import WeatherOverlay from './components/WeatherOverlay'
import { useSeoulData } from './hooks/useSeoulData'
import { LOCATIONS, LOCATION_MAP } from './services/LocationRegistry'
import type { Map } from 'maplibre-gl'

const API_KEY = import.meta.env.VITE_SEOUL_API_KEY ?? ''

export default function App() {
  const { data, loading, error, lastUpdated, isOffline } = useSeoulData(API_KEY)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [mapInstance, setMapInstance] = useState<Map | null>(null)
  const handleMapLoaded = useCallback((map: Map) => setMapInstance(map), [])

  // Get weather from the first available area with weather data
  const weather = useMemo(() => {
    for (const areaData of data.values()) {
      if (areaData.weather) return areaData.weather
    }
    return null
  }, [data])

  // Build congestion map (code → congestion level) from API data
  const congestionMap = useMemo(() => {
    const map = new Map<string, import('./types').CongestionLevel>()
    for (const loc of LOCATIONS) {
      const areaData = data.get(loc.name)
      if (areaData?.population?.areaCongestLvl) {
        map.set(loc.code, areaData.population.areaCongestLvl)
      }
    }
    return map
  }, [data])

  // Build population map (code → estimated population) for character counts
  const populationMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const loc of LOCATIONS) {
      const areaData = data.get(loc.name)
      if (areaData?.population) {
        const avg = (areaData.population.areaPopMin + areaData.population.areaPopMax) / 2
        map.set(loc.code, avg)
      }
    }
    return map
  }, [data])

  // Get selected area data
  const selectedAreaData = useMemo(() => {
    if (!selectedCode) return null
    const loc = LOCATION_MAP.get(selectedCode)
    if (!loc) return null
    return data.get(loc.name) ?? null
  }, [selectedCode, data])

  const handleDismiss = () => setSelectedCode(null)

  return (
    <div data-testid="app-root" className="w-full h-full relative overflow-hidden">
      {/* MapLibre map */}
      <div className="absolute inset-0 z-0">
        <MapView mapRef={mapRef} onMapLoaded={handleMapLoaded} />
        <HotspotLayer
          map={mapInstance}
          locations={LOCATIONS}
          congestionMap={congestionMap}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
        />
        <CharacterSystem
          map={mapInstance}
          locations={LOCATIONS}
          congestionMap={congestionMap}
          populationMap={populationMap}
        />
      </div>

      {/* Weather overlay */}
      <WeatherOverlay weather={weather} />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10">
        <TopBar weather={weather} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div
          data-testid="loading-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        >
          <div className="text-center">
            <div className="text-4xl mb-3">🏙️</div>
            <p className="text-green-700 font-bold text-lg">서울 타이쿤</p>
            <p className="text-gray-500 text-sm mt-1">데이터 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* Offline/error banner */}
      {(isOffline || error) && !loading && (
        <div
          data-testid="error-banner"
          className="absolute top-16 left-4 right-4 z-20 rounded-xl px-4 py-2 text-sm text-center"
          style={{ background: 'rgba(255,152,0,0.9)', color: 'white' }}
        >
          오프라인 - 캐시 데이터 표시 중
        </div>
      )}

      {/* Last updated indicator */}
      {lastUpdated && !loading && (
        <div
          data-testid="last-updated"
          className="absolute bottom-20 right-4 z-10 text-xs text-gray-500"
          style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '2px 8px' }}
        >
          업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Bottom sheet */}
      <BottomSheet areaData={selectedAreaData} onDismiss={handleDismiss} />
    </div>
  )
}
