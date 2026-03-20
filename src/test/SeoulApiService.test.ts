import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SeoulApiService } from '../services/SeoulApiService'

const mockAreaResponse = {
  CITYDATA: {
    AREA_CD: 'POI001',
    LIVE_PPLTN_STTS: [
      {
        AREA_CD: 'POI001',
        AREA_NM: '경복궁',
        AREA_CONGEST_LVL: '보통',
        AREA_CONGEST_MSG: '사람이 적당히 있습니다',
        AREA_PPLTN_MIN: 30000,
        AREA_PPLTN_MAX: 40000,
        MALE_PPLTN_RATE: 48.5,
        FEMALE_PPLTN_RATE: 51.5,
        RESNT_PPLTN_RATE: 30.0,
        NON_RESNT_PPLTN_RATE: 70.0,
        PPLTN_RATE_0: 2.0,
        PPLTN_RATE_10: 8.0,
        PPLTN_RATE_20: 25.0,
        PPLTN_RATE_30: 22.0,
        PPLTN_RATE_40: 18.0,
        PPLTN_RATE_50: 14.0,
        PPLTN_RATE_60: 8.0,
        PPLTN_RATE_70: 3.0,
      },
    ],
    WEATHER_STTS: [
      {
        WEATHER_TIME: '2026-03-20 10:00',
        TEMP: '15',
        SENSIBLE_TEMP: '14',
        MAX_TEMP: '18',
        MIN_TEMP: '8',
        HUMIDITY: '60',
        WIND_DIRCT: '북서',
        WIND_SPD: '3.5',
        PRECIPITATION: '0',
        PRECPT_TYPE: '없음',
        UV_INDEX: '2',
        UV_INDEX_LVL: '낮음',
        PM25: 12,
        PM25_INDEX: '좋음',
        PM10: 25,
        PM10_INDEX: '좋음',
        FCST24HOURS: [{ SKY_STTS: '맑음', FCST_DT: '202603201800', TEMP: '15', PRECIPITATION: '-', PRECPT_TYPE: '없음', RAIN_CHANCE: '0' }],
      },
    ],
  },
}

describe('SeoulApiService', () => {
  let service: SeoulApiService

  beforeEach(() => {
    service = new SeoulApiService('test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and parses area data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAreaResponse,
    } as Response)

    const data = await service.fetchArea('경복궁')

    expect(data.areaName).toBe('경복궁')
    expect(data.population).not.toBeNull()
    expect(data.population?.areaCongestLvl).toBe('보통')
    expect(data.population?.areaPopMin).toBe(30000)
    expect(data.weather).not.toBeNull()
    expect(data.weather?.temp).toBe(15)
    expect(data.weather?.skyStatus).toBe('맑음')
    expect(data.fetchedAt).toBeGreaterThan(0)
  })

  it('caches fetched data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAreaResponse,
    } as Response)

    await service.fetchArea('경복궁')
    const cached = service.getCached('경복궁')

    expect(cached).not.toBeUndefined()
    expect(cached?.areaName).toBe('경복궁')
  })

  it('isFresh returns true immediately after fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAreaResponse,
    } as Response)

    await service.fetchArea('경복궁')
    expect(service.isFresh('경복궁')).toBe(true)
  })

  it('isFresh returns false for unknown area', () => {
    expect(service.isFresh('없는장소')).toBe(false)
  })

  it('fetchAreas processes multiple areas with concurrency limit', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAreaResponse,
    } as Response)

    const areas = ['경복궁', '강남역', '홍대입구']
    const result = await service.fetchAreas(areas)

    expect(result.size).toBe(3)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('fetchAreas uses cached data on fetch failure', async () => {
    // First fetch succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAreaResponse,
    } as Response)
    await service.fetchArea('경복궁')

    // Second fetch fails
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await service.fetchAreas(['경복궁'])

    expect(result.get('경복궁')).not.toBeUndefined()
  })

  it('throws on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
    } as Response)

    await expect(service.fetchArea('경복궁')).rejects.toThrow('API error: 403')
  })

})
