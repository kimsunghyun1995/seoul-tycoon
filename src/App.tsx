import { useState, useMemo, useRef, useCallback } from 'react'
import MapView from './components/MapView'
import { HotspotLayer } from './components/HotspotMarker'
import CharacterSystem from './components/CharacterSystem'
import LandmarkLayer from './components/LandmarkLayer'
import TopBar from './components/TopBar'
import BottomSheet from './components/BottomSheet'
import WeatherOverlay, { getDayPeriod } from './components/WeatherOverlay'
import RankingToggle from './components/RankingToggle'
import RankingPanel from './components/RankingPanel'
import { useSeoulData } from './hooks/useSeoulData'
import { useEventData } from './hooks/useEventData'
import { useRanking, SortMode } from './hooks/useRanking'
import { LOCATIONS, LOCATION_MAP } from './services/LocationRegistry'
import type { Map as MaplibreMap } from 'maplibre-gl'
import type { CongestionLevel } from './types'

const API_KEY = import.meta.env.VITE_SEOUL_API_KEY ?? ''

export default function App() {
  const { data, loading, error, lastUpdated, isOffline } = useSeoulData(API_KEY)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const [mapInstance, setMapInstance] = useState<MaplibreMap | null>(null)
  const handleMapLoaded = useCallback((map: MaplibreMap) => setMapInstance(map), [])
  const [rankingOpen, setRankingOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('congestion')
  const { events, eventsByArea, loading: eventsLoading, fetch: fetchEvents } = useEventData()

  // Get weather from the first available area with weather data
  const weather = useMemo(() => {
    for (const areaData of data.values()) {
      if (areaData.weather) return areaData.weather
    }
    return null
  }, [data])

  // Build congestion map (code → congestion level) from API data
  const congestionMap = useMemo(() => {
    const map = new Map<string, CongestionLevel>()
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

  const rankings = useRanking(data, eventsByArea, sortMode)

  // Count busy areas (붐빔 or 약간 붐빔)
  const busyCount = useMemo(() => {
    let count = 0
    for (const level of congestionMap.values()) {
      if (level === '붐빔' || level === '약간 붐빔') count++
    }
    return count
  }, [congestionMap])

  // Get selected area data
  const selectedAreaData = useMemo(() => {
    if (!selectedCode) return null
    const loc = LOCATION_MAP.get(selectedCode)
    if (!loc) return null
    return data.get(loc.name) ?? null
  }, [selectedCode, data])

  const handleDismiss = () => setSelectedCode(null)

  const handleRankingOpen = useCallback(() => {
    setRankingOpen(true)
    if (events.length === 0 && !eventsLoading) {
      fetchEvents()
    }
  }, [events.length, eventsLoading, fetchEvents])

  const handleRankingSelect = useCallback((code: string) => {
    setSelectedCode(code)
    setRankingOpen(false)
    const loc = LOCATION_MAP.get(code)
    if (loc && mapRef.current) {
      mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 1500 })
    }
  }, [])

  const dayPeriod = getDayPeriod(new Date().getHours())
  const mapFilter = dayPeriod === 'night' ? { filter: 'brightness(0.7)' } : undefined

  return (
    <div data-testid="app-root" className="w-full h-full relative overflow-hidden">
      {/* MapLibre map */}
      <div className="absolute inset-0 z-0" style={mapFilter}>
        <MapView mapRef={mapRef} onMapLoaded={handleMapLoaded} />
        <HotspotLayer
          map={mapInstance}
          locations={LOCATIONS}
          congestionMap={congestionMap}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
        />
        <LandmarkLayer map={mapInstance} />
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
          className="absolute bottom-4 left-4 z-10 text-xs text-gray-500"
          style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '2px 8px' }}
        >
          업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Ranking toggle FAB */}
      <RankingToggle onClick={handleRankingOpen} busyCount={busyCount} />

      {/* Ranking panel */}
      <RankingPanel
        isOpen={rankingOpen}
        onClose={() => setRankingOpen(false)}
        rankings={rankings}
        sortMode={sortMode}
        onSortChange={setSortMode}
        onSelectArea={handleRankingSelect}
        loading={eventsLoading}
      />

      {/* Bottom sheet */}
      <BottomSheet
        areaData={selectedAreaData}
        onDismiss={handleDismiss}
        events={selectedCode ? (eventsByArea.get(selectedCode) ?? []) : []}
      />
    </div>
  )
}
