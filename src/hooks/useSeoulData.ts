import { useState, useEffect, useCallback, useRef } from 'react'
import { SeoulApiService } from '../services/SeoulApiService'
import { LOCATIONS, LOCATION_BY_NAME } from '../services/LocationRegistry'
import type { AreaData, CongestionLevel } from '../types'

const AREA_NAMES = LOCATIONS.map(l => l.name)
const REFRESH_INTERVAL = 5 * 60 * 1000

export interface SeoulDataState {
  data: Map<string, AreaData>
  congestionMap: Map<string, CongestionLevel>
  populationMap: Map<string, number>
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
    populationMap: new Map(),
    loading: true,
    error: null,
    lastUpdated: null,
    isOffline: false,
  })

  const buildMaps = useCallback((data: Map<string, AreaData>): {
    congestionMap: Map<string, CongestionLevel>
    populationMap: Map<string, number>
  } => {
    const congestionMap = new Map<string, CongestionLevel>()
    const populationMap = new Map<string, number>()
    for (const [name, areaData] of data.entries()) {
      const loc = LOCATION_BY_NAME.get(name)
      if (loc && areaData.population) {
        if (areaData.population.areaCongestLvl) {
          congestionMap.set(loc.code, areaData.population.areaCongestLvl)
        }
        populationMap.set(loc.code, areaData.population.areaPopMin)
      }
    }
    return { congestionMap, populationMap }
  }, [])

  const fetchAll = useCallback(async () => {
    const service = serviceRef.current
    if (!service) return

    try {
      const result = await service.fetchAreas(AREA_NAMES)
      // If no results came back, treat as offline (all fetches failed silently)
      const isOffline = result.size === 0
      const cached = service.getCache()
      const activeData = isOffline && cached.size > 0 ? cached : result.size > 0 ? result : null
      const { congestionMap, populationMap } = buildMaps(activeData ?? new Map())
      setState(prev => ({
        ...prev,
        data: activeData ?? prev.data,
        congestionMap,
        populationMap,
        loading: false,
        error: isOffline ? 'No data received' : null,
        lastUpdated: isOffline ? prev.lastUpdated : new Date(),
        isOffline,
      }))
    } catch (err) {
      const cached = service.getCache()
      const { congestionMap, populationMap } = cached.size > 0 ? buildMaps(cached) : { congestionMap: new Map(), populationMap: new Map() }
      setState(prev => ({
        ...prev,
        data: cached.size > 0 ? cached : prev.data,
        congestionMap,
        populationMap,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        isOffline: true,
      }))
    }
  }, [buildMaps])

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
