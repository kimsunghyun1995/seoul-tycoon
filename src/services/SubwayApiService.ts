import type { SubwayArrivalInfo } from '../types'
import { fetchWithCorsProxy, getSeoulApiBase } from './corsProxy'

const CACHE_TTL_MS = 30 * 1000 // 30 seconds — arrivals change fast

interface CacheEntry {
  arrivals: SubwayArrivalInfo[]
  fetchedAt: number
}

/**
 * Parse ARVLMSG2 arrival message into seconds.
 * Examples:
 *   "3분 20초" → 200
 *   "2분" → 120
 *   "전역 도착" → 30
 *   "당역 도착" → 0
 *   "진입" → 10
 *   Others / unknown → -1
 */
export function parseArrivalSeconds(msg: string): number {
  if (!msg) return -1

  // "당역 도착" or "도착"
  if (msg.includes('당역') || msg === '도착') return 0

  // "전역 도착" or "전역출발"
  if (msg.includes('전역')) return 30

  // "진입" (entering station)
  if (msg.includes('진입')) return 10

  // "X분 Y초"
  const fullMatch = msg.match(/(\d+)분\s*(\d+)초/)
  if (fullMatch) {
    return parseInt(fullMatch[1]) * 60 + parseInt(fullMatch[2])
  }

  // "X분"
  const minMatch = msg.match(/(\d+)분/)
  if (minMatch) {
    return parseInt(minMatch[1]) * 60
  }

  // "X초"
  const secMatch = msg.match(/(\d+)초/)
  if (secMatch) {
    return parseInt(secMatch[1])
  }

  return -1
}

/**
 * Map Seoul API SUBWAY_ID to human-readable line number string.
 * Seoul API uses numeric codes like "1001" (line 1), "1002" (line 2), etc.
 */
function mapSubwayIdToLine(subwayId: string): string {
  const lineMap: Record<string, string> = {
    '1001': '1호선',
    '1002': '2호선',
    '1003': '3호선',
    '1004': '4호선',
    '1005': '5호선',
    '1006': '6호선',
    '1007': '7호선',
    '1008': '8호선',
    '1009': '9호선',
    '1061': '중앙선',
    '1063': '경의중앙선',
    '1065': '공항철도',
    '1067': '경춘선',
    '1075': '수인분당선',
    '1077': '신분당선',
  }
  return lineMap[subwayId] ?? subwayId
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseArrivalItem(raw: any): SubwayArrivalInfo {
  const msg = raw.ARVLMSG2 ?? ''
  return {
    stationName: raw.STATN_NM ?? '',
    lineNumber: mapSubwayIdToLine(raw.SUBWAY_ID ?? ''),
    direction: raw.BARVLDT ?? '',
    destination: raw.BTRAINNO ?? '',
    arrivalMessage: msg,
    arrivalSeconds: parseArrivalSeconds(msg),
    congestion: 'unknown',
    updatedAt: raw.RECPTNDT ?? new Date().toISOString(),
  }
}

export class SubwayApiService {
  private cache: Map<string, CacheEntry> = new Map()

  async fetchArrivals(stationName: string): Promise<SubwayArrivalInfo[]> {
    // Return fresh cache if available
    const cached = this.cache.get(stationName)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return [...cached.arrivals]
    }

    const { base, includeApiKey } = getSeoulApiBase()

    // Build URL — Supabase proxy doesn't need API key
    const encodedName = encodeURIComponent(stationName)
    const url = includeApiKey
      ? `${base}/${getApiKey()}/json/realtimeStationArrival/1/10/${encodedName}`
      : `${base}/realtimeStationArrival/1/10/${encodedName}`

    const response = await fetchWithCorsProxy(url)
    if (!response.ok) {
      throw new Error(`SubwayApiService: HTTP error ${response.status} for ${stationName}`)
    }

    const json = await response.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = json?.realtimeArrivalList ?? []

    const arrivals = rows.map(parseArrivalItem)

    this.cache.set(stationName, { arrivals, fetchedAt: Date.now() })
    return [...arrivals]
  }

  getCachedArrivals(stationName: string): SubwayArrivalInfo[] {
    const cached = this.cache.get(stationName)
    if (!cached) return []
    return [...cached.arrivals]
  }

  isCacheFresh(stationName: string): boolean {
    const cached = this.cache.get(stationName)
    if (!cached) return false
    return Date.now() - cached.fetchedAt < CACHE_TTL_MS
  }
}

// Helper to get API key from import.meta.env (safe for test environments)
function getApiKey(): string {
  try {
    return import.meta.env.VITE_SEOUL_API_KEY ?? ''
  } catch {
    return ''
  }
}

// Singleton
let _instance: SubwayApiService | null = null

export function getSubwayApiService(): SubwayApiService {
  if (!_instance) {
    _instance = new SubwayApiService()
  }
  return _instance
}

// Needed for test isolation
export function resetSubwayApiService(): void {
  _instance = null
}
