import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SubwayApiService, parseArrivalSeconds, resetSubwayApiService, getSubwayApiService } from '../services/SubwayApiService'

const mockArrivalResponse = {
  realtimeArrivalList: [
    {
      SUBWAY_ID: '1002',
      STATN_NM: '강남',
      BTRAINNO: '2248',
      BARVLDT: '잠실방면',
      ARVLMSG2: '3분 20초',
      ARVLCD: '4',
      RECPTNDT: '2026-03-23 12:00:00',
    },
    {
      SUBWAY_ID: '1002',
      STATN_NM: '강남',
      BTRAINNO: '2231',
      BARVLDT: '교대방면',
      ARVLMSG2: '전역 도착',
      ARVLCD: '2',
      RECPTNDT: '2026-03-23 12:00:05',
    },
  ],
}

describe('parseArrivalSeconds', () => {
  it('parses "3분 20초" → 200', () => {
    expect(parseArrivalSeconds('3분 20초')).toBe(200)
  })

  it('parses "2분" → 120', () => {
    expect(parseArrivalSeconds('2분')).toBe(120)
  })

  it('parses "45초" → 45', () => {
    expect(parseArrivalSeconds('45초')).toBe(45)
  })

  it('parses "전역 도착" → 30', () => {
    expect(parseArrivalSeconds('전역 도착')).toBe(30)
  })

  it('parses "전역출발" → 30', () => {
    expect(parseArrivalSeconds('전역출발')).toBe(30)
  })

  it('parses "당역 도착" → 0', () => {
    expect(parseArrivalSeconds('당역 도착')).toBe(0)
  })

  it('parses "도착" → 0', () => {
    expect(parseArrivalSeconds('도착')).toBe(0)
  })

  it('parses "진입" → 10', () => {
    expect(parseArrivalSeconds('진입')).toBe(10)
  })

  it('returns -1 for empty string', () => {
    expect(parseArrivalSeconds('')).toBe(-1)
  })

  it('returns -1 for unknown format', () => {
    expect(parseArrivalSeconds('운행없음')).toBe(-1)
  })

  it('parses "1분 5초" → 65', () => {
    expect(parseArrivalSeconds('1분 5초')).toBe(65)
  })
})

describe('SubwayApiService', () => {
  let service: SubwayApiService

  beforeEach(() => {
    vi.useFakeTimers()
    service = new SubwayApiService()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    resetSubwayApiService()
  })

  it('fetches and parses arrival list', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    const arrivals = await service.fetchArrivals('강남')

    expect(arrivals).toHaveLength(2)
    expect(arrivals[0].stationName).toBe('강남')
    expect(arrivals[0].lineNumber).toBe('2호선')
    expect(arrivals[0].direction).toBe('잠실방면')
    expect(arrivals[0].arrivalMessage).toBe('3분 20초')
    expect(arrivals[0].arrivalSeconds).toBe(200)
    expect(arrivals[0].congestion).toBe('unknown')
  })

  it('parses "전역 도착" to 30 seconds', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    const arrivals = await service.fetchArrivals('강남')
    expect(arrivals[1].arrivalSeconds).toBe(30)
    expect(arrivals[1].arrivalMessage).toBe('전역 도착')
  })

  it('maps SUBWAY_ID 1002 to "2호선"', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    const arrivals = await service.fetchArrivals('강남')
    expect(arrivals[0].lineNumber).toBe('2호선')
  })

  it('uses cache within TTL (30 seconds)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')
    await service.fetchArrivals('강남')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after cache TTL expires', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')

    // Advance past 30-second TTL
    vi.advanceTimersByTime(31 * 1000)

    await service.fetchArrivals('강남')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    await expect(service.fetchArrivals('강남')).rejects.toThrow('HTTP error 503')
  })

  it('getCachedArrivals returns empty array before fetch', () => {
    const cached = service.getCachedArrivals('강남')
    expect(cached).toHaveLength(0)
  })

  it('getCachedArrivals returns data after fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')
    const cached = service.getCachedArrivals('강남')
    expect(cached).toHaveLength(2)
  })

  it('getCachedArrivals returns copy (not reference)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')
    const cached1 = service.getCachedArrivals('강남')
    const cached2 = service.getCachedArrivals('강남')
    expect(cached1).not.toBe(cached2)
    expect(cached1).toEqual(cached2)
  })

  it('handles empty realtimeArrivalList gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ realtimeArrivalList: [] }),
    } as Response)

    const arrivals = await service.fetchArrivals('강남')
    expect(arrivals).toHaveLength(0)
  })

  it('handles missing realtimeArrivalList key gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const arrivals = await service.fetchArrivals('강남')
    expect(arrivals).toHaveLength(0)
  })

  it('isCacheFresh returns false before fetch', () => {
    expect(service.isCacheFresh('강남')).toBe(false)
  })

  it('isCacheFresh returns true after fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')
    expect(service.isCacheFresh('강남')).toBe(true)
  })

  it('isCacheFresh returns false after TTL expires', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockArrivalResponse,
    } as Response)

    await service.fetchArrivals('강남')
    vi.advanceTimersByTime(31 * 1000)
    expect(service.isCacheFresh('강남')).toBe(false)
  })
})

describe('getSubwayApiService singleton', () => {
  afterEach(() => {
    resetSubwayApiService()
  })

  it('returns same instance on repeated calls', () => {
    const a = getSubwayApiService()
    const b = getSubwayApiService()
    expect(a).toBe(b)
  })

  it('returns new instance after reset', () => {
    const a = getSubwayApiService()
    resetSubwayApiService()
    const b = getSubwayApiService()
    expect(a).not.toBe(b)
  })
})
