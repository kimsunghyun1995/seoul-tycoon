import { useState, useEffect, useCallback, useRef } from 'react'
import { SeoulApiService } from '../services/SeoulApiService'
import { LOCATIONS, LOCATION_BY_NAME } from '../services/LocationRegistry'
import type { AreaData, CongestionLevel } from '../types'

const AREA_NAMES = LOCATIONS.map(l => l.name)
const REFRESH_INTERVAL = 5 * 60 * 1000

export interface SeoulDataState {
  data: Map<string, AreaData>
  congestionMap: Map<string, CongestionLevel>
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isOffline: boolean
}

export function useSeoulData(apiKey: string) {
  const serviceRef = useRef<SeoulApiService | null>(null)
  const [state, setState] = useState<SeoulDataState>({
    data: new Map(),
    congestionMap: new Map(),
    loading: true,
    error: null,
    lastUpdated: null,
    isOffline: false,
  })

  const buildCongestionMap = useCallback((data: Map<string, AreaData>): Map<string, CongestionLevel> => {
    const congestionMap = new Map<string, CongestionLevel>()
    for (const [name, areaData] of data.entries()) {
      if (areaData.population?.areaCongestLvl) {
        // Map by location name → find code
        const loc = LOCATION_BY_NAME.get(name)
        if (loc) {
          congestionMap.set(loc.code, areaData.population.areaCongestLvl)
        }
      }
    }
    return congestionMap
  }, [])

  const fetchAll = useCallback(async () => {
    const service = serviceRef.current
    if (!service) return

    try {
      const result = await service.fetchAreas(AREA_NAMES)
      const congestionMap = buildCongestionMap(result)
      // If no results came back, treat as offline (all fetches failed silently)
      const isOffline = result.size === 0
      const cached = service.getCache()
      setState(prev => ({
        ...prev,
        data: isOffline && cached.size > 0 ? cached : result.size > 0 ? result : prev.data,
        congestionMap,
        loading: false,
        error: isOffline ? 'No data received' : null,
        lastUpdated: isOffline ? prev.lastUpdated : new Date(),
        isOffline,
      }))
    } catch (err) {
      const cached = service.getCache()
      setState(prev => ({
        ...prev,
        data: cached.size > 0 ? cached : prev.data,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        isOffline: true,
      }))
    }
  }, [buildCongestionMap])

  useEffect(() => {
    serviceRef.current = new SeoulApiService(apiKey)
    fetchAll()

    const timer = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [apiKey, fetchAll])

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }))
    fetchAll()
  }, [fetchAll])

  return { ...state, refresh }
}
