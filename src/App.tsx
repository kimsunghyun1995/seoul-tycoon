import { useState, useMemo } from 'react'
import SeoulMap from './components/SeoulMap'
import TopBar from './components/TopBar'
import BottomSheet from './components/BottomSheet'
import WeatherOverlay from './components/WeatherOverlay'
import CharacterSystem from './components/CharacterSystem'
import { HotspotLayer } from './components/HotspotMarker'
import { useSeoulData } from './hooks/useSeoulData'
import { LOCATIONS, LOCATION_MAP } from './services/LocationRegistry'

const API_KEY = import.meta.env.VITE_SEOUL_API_KEY ?? ''

export default function App() {
  const { data, congestionMap, populationMap, loading, error, lastUpdated, isOffline } = useSeoulData(API_KEY)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  // Get weather from the first available area with weather data
  const weather = useMemo(() => {
    for (const areaData of data.values()) {
      if (areaData.weather) return areaData.weather
    }
    return null
  }, [data])

  // Get selected area data
  const selectedAreaData = useMemo(() => {
    if (!selectedCode) return null
    const loc = LOCATION_MAP.get(selectedCode)
    if (!loc) return null
    return data.get(loc.name) ?? null
  }, [selectedCode, data])

  const handleSelect = (code: string) => setSelectedCode(code)
  const handleDismiss = () => setSelectedCode(null)

  return (
    <div data-testid="app-root" className="w-full h-full relative overflow-hidden">
      {/* Sky/weather gradient background */}
      <WeatherOverlay weather={weather} />

      {/* SVG Map with PixiJS character overlay inside same transformed container */}
      <div className="absolute inset-0 z-2">
        <SeoulMap
          overlay={<CharacterSystem locations={LOCATIONS} congestionMap={congestionMap} populationMap={populationMap} />}
        >
          {/* Hotspot markers rendered inside SVG */}
          <HotspotLayer
            locations={LOCATIONS}
            congestionMap={congestionMap}
            selectedCode={selectedCode}
            onSelect={handleSelect}
          />
        </SeoulMap>
      </div>

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
