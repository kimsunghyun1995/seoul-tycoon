import { useState, useCallback } from 'react'
import { getEventApiService } from '../services/EventApiService'
import { matchEventsToAreas } from '../services/EventMatcher'
import { LOCATIONS } from '../services/LocationRegistry'
import type { CulturalEvent } from '../types'

interface UseEventDataReturn {
  events: CulturalEvent[]
  eventsByArea: Map<string, CulturalEvent[]>
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export function useEventData(): UseEventDataReturn {
  const [events, setEvents] = useState<CulturalEvent[]>([])
  const [eventsByArea, setEventsByArea] = useState<Map<string, CulturalEvent[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetched = await getEventApiService().fetchEvents()
      const matched = matchEventsToAreas(fetched, LOCATIONS)
      setEvents(fetched)
      setEventsByArea(matched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { events, eventsByArea, loading, error, fetch }
}
