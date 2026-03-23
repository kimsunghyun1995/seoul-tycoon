import type { CulturalEvent } from '../types'
import { fetchWithCorsProxy, getSeoulApiBase } from './corsProxy'

const { base: API_BASE, includeApiKey: INCLUDE_API_KEY } = getSeoulApiBase()

/**
 * Parse date strings from "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD" format.
 * Returns a Date object.
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  // Normalize "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DDTHH:mm:ss"
  const normalized = dateStr.trim().replace(' ', 'T')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? new Date(0) : d
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEvent(raw: any): CulturalEvent {
  return {
    title: raw.TITLE ?? '',
    category: raw.CODENAME ?? '',
    place: raw.PLACE ?? '',
    startDate: raw.STRTDATE ?? '',
    endDate: raw.END_DATE ?? '',
    lat: Number(raw.LAT ?? 0),
    lng: Number(raw.LOT ?? 0),
    guName: raw.GUNAME ?? '',
    orgLink: raw.ORG_LINK ?? '',
    mainImg: raw.MAIN_IMG ?? '',
    useFee: raw.USE_FEE ?? '',
  }
}

function isActiveEvent(event: CulturalEvent): boolean {
  const now = new Date()
  const start = parseDate(event.startDate)
  const end = parseDate(event.endDate)
  return start <= now && now <= end
}

export class EventApiService {
  private cache: CulturalEvent[] = []
  private lastFetchTime = 0
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes

  async fetchEvents(): Promise<CulturalEvent[]> {
    if (this.isCacheFresh()) {
      return [...this.cache]
    }

    const apiKey = import.meta.env.VITE_SEOUL_API_KEY ?? ''
    const url = INCLUDE_API_KEY
      ? `${API_BASE}/${apiKey}/json/culturalEventInfo/1/1000/`
      : `${API_BASE}/culturalEventInfo/1/1000/`

    const response = await fetchWithCorsProxy(url)
    if (!response.ok) {
      throw new Error(`EventApiService: HTTP error ${response.status}`)
    }

    const json = await response.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = json?.culturalEventInfo?.row ?? []

    const allEvents = rows.map(parseEvent)
    const activeEvents = allEvents.filter(isActiveEvent)

    this.cache = activeEvents
    this.lastFetchTime = Date.now()

    return [...this.cache]
  }

  getCachedEvents(): CulturalEvent[] {
    return [...this.cache]
  }

  isCacheFresh(): boolean {
    return this.lastFetchTime > 0 && Date.now() - this.lastFetchTime < this.CACHE_TTL
  }
}

// Singleton for app use
let _instance: EventApiService | null = null

export function getEventApiService(): EventApiService {
  if (!_instance) {
    _instance = new EventApiService()
  }
  return _instance
}
