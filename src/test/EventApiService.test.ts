import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventApiService } from '../services/EventApiService'

// Fixed "now" for active event tests: 2026-03-23
const FIXED_NOW = new Date('2026-03-23T12:00:00').getTime()

const mockApiResponse = {
  culturalEventInfo: {
    row: [
      {
        TITLE: '서울 봄 꽃 축제',
        CODENAME: '축제/행사',
        PLACE: '여의도 공원',
        STRTDATE: '2026-03-01 00:00:00',
        END_DATE: '2026-03-31 23:59:59',
        LAT: '37.5283',
        LOT: '126.9241',
        GUNAME: '영등포구',
        ORG_LINK: 'http://example.com',
        MAIN_IMG: 'http://example.com/img.jpg',
        USE_FEE: '무료',
      },
      {
        TITLE: '지난 공연',
        CODENAME: '공연',
        PLACE: '세종문화회관',
        STRTDATE: '2026-01-01 00:00:00',
        END_DATE: '2026-01-31 23:59:59',
        LAT: '37.5721',
        LOT: '126.9768',
        GUNAME: '종로구',
        ORG_LINK: '',
        MAIN_IMG: '',
        USE_FEE: '유료',
      },
      {
        TITLE: '미래 전시',
        CODENAME: '전시',
        PLACE: '국립현대미술관',
        STRTDATE: '2026-05-01 00:00:00',
        END_DATE: '2026-05-31 23:59:59',
        LAT: '37.5796',
        LOT: '126.9769',
        GUNAME: '종로구',
        ORG_LINK: '',
        MAIN_IMG: '',
        USE_FEE: '유료',
      },
    ],
  },
}

describe('EventApiService', () => {
  let service: EventApiService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    service = new EventApiService()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('fetches and returns only currently active events', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const events = await service.fetchEvents()

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('서울 봄 꽃 축제')
  })

  it('parses event fields correctly (LOT → lng)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const events = await service.fetchEvents()
    const event = events[0]

    expect(event.title).toBe('서울 봄 꽃 축제')
    expect(event.category).toBe('축제/행사')
    expect(event.place).toBe('여의도 공원')
    expect(event.lat).toBe(37.5283)
    expect(event.lng).toBe(126.9241) // LOT field mapped to lng
    expect(event.guName).toBe('영등포구')
    expect(event.useFee).toBe('무료')
  })

  it('caches events after fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    await service.fetchEvents()
    const cached = service.getCachedEvents()

    expect(cached).toHaveLength(1)
    expect(cached[0].title).toBe('서울 봄 꽃 축제')
  })

  it('isCacheFresh returns false before any fetch', () => {
    expect(service.isCacheFresh()).toBe(false)
  })

  it('isCacheFresh returns true immediately after fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    await service.fetchEvents()
    expect(service.isCacheFresh()).toBe(true)
  })

  it('isCacheFresh returns false after TTL expires', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    await service.fetchEvents()

    // Advance time by 31 minutes (past the 30-minute TTL)
    vi.advanceTimersByTime(31 * 60 * 1000)

    expect(service.isCacheFresh()).toBe(false)
  })

  it('returns cached data on second call within TTL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    await service.fetchEvents()
    await service.fetchEvents()

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    await expect(service.fetchEvents()).rejects.toThrow('HTTP error 500')
  })

  it('handles empty row array gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ culturalEventInfo: { row: [] } }),
    } as Response)

    const events = await service.fetchEvents()
    expect(events).toHaveLength(0)
  })

  it('getCachedEvents returns copy (not reference)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    await service.fetchEvents()
    const cached1 = service.getCachedEvents()
    const cached2 = service.getCachedEvents()

    expect(cached1).not.toBe(cached2) // different array instances
    expect(cached1).toEqual(cached2)
  })
})
