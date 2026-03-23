import { useState, useEffect, useRef } from 'react'
import type { SubwayStation, SubwayArrivalInfo } from '../types'
import { findNearbyStations } from '../services/SubwayStationRegistry'
import { getSubwayApiService } from '../services/SubwayApiService'

const REFRESH_INTERVAL_MS = 30 * 1000 // 30 seconds

interface UseSubwayDataReturn {
  nearbyStations: SubwayStation[]
  arrivals: Map<string, SubwayArrivalInfo[]>
  loading: boolean
  error: string | null
}

export function useSubwayData(hotspotCode: string | null): UseSubwayDataReturn {
  const [nearbyStations, setNearbyStations] = useState<SubwayStation[]>([])
  const [arrivals, setArrivals] = useState<Map<string, SubwayArrivalInfo[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!hotspotCode) {
      setNearbyStations([])
      setArrivals(new Map())
      setLoading(false)
      setError(null)
      return
    }

    const stations = findNearbyStations(hotspotCode)
    setNearbyStations(stations)

    const service = getSubwayApiService()

    async function fetchAll() {
      if (stations.length === 0) {
        setArrivals(new Map())
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const results = await Promise.allSettled(
          stations.map(s => service.fetchArrivals(s.name))
        )

        const newArrivals = new Map<string, SubwayArrivalInfo[]>()
        results.forEach((result, idx) => {
          const stationId = stations[idx].id
          if (result.status === 'fulfilled') {
            newArrivals.set(stationId, result.value)
          } else {
            // Use cached data on failure
            const cached = service.getCachedArrivals(stations[idx].name)
            newArrivals.set(stationId, cached)
          }
        })

        setArrivals(newArrivals)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchAll()

    // Auto-refresh every 30 seconds while hotspot is selected
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [hotspotCode])

  return { nearbyStations, arrivals, loading, error }
}
