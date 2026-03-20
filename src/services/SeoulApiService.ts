import type { AreaData, PopulationData, WeatherData, CongestionLevel, AirQualityLevel } from '../types'

// Use Vite dev proxy to avoid CORS; in production use a serverless proxy
const API_BASE = import.meta.env.DEV ? '/api/seoul' : 'http://openapi.seoul.go.kr:8088'
const CONCURRENCY_LIMIT = 5
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePopulation(raw: any): PopulationData | null {
  const p = raw?.LIVE_PPLTN_STTS?.[0]
  if (!p) return null
  return {
    areaCd: p.AREA_CD ?? '',
    areaName: p.AREA_NM ?? '',
    areaCongestLvl: p.AREA_CONGEST_LVL as CongestionLevel,
    areaCongestMsg: p.AREA_CONGEST_MSG ?? '',
    areaPopMin: Number(p.AREA_PPLTN_MIN ?? 0),
    areaPopMax: Number(p.AREA_PPLTN_MAX ?? 0),
    malePopRate: Number(p.MALE_PPLTN_RATE ?? 0),
    femalePopRate: Number(p.FEMALE_PPLTN_RATE ?? 0),
    residentPopRate: Number(p.RESNT_PPLTN_RATE ?? 0),
    nonResidentPopRate: Number(p.NON_RESNT_PPLTN_RATE ?? 0),
    ageGroup: {
      rate0: Number(p.PPLTN_RATE_0 ?? 0),
      rate10: Number(p.PPLTN_RATE_10 ?? 0),
      rate20: Number(p.PPLTN_RATE_20 ?? 0),
      rate30: Number(p.PPLTN_RATE_30 ?? 0),
      rate40: Number(p.PPLTN_RATE_40 ?? 0),
      rate50: Number(p.PPLTN_RATE_50 ?? 0),
      rate60: Number(p.PPLTN_RATE_60 ?? 0),
      rate70: Number(p.PPLTN_RATE_70 ?? 0),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWeather(raw: any): WeatherData | null {
  const w = raw?.WEATHER_STTS?.[0]
  if (!w) return null

  // SKY_STTS is only in FCST24HOURS forecast entries, not current weather
  // Derive sky status from PRECPT_TYPE and first forecast entry
  const forecasts = w.FCST24HOURS ?? []
  const firstForecast = Array.isArray(forecasts) ? forecasts[0] : null
  const skyStatus = firstForecast?.SKY_STTS ?? ''

  // Derive current sky: use precipitation type or forecast sky
  let currentSky = skyStatus
  const precptType = w.PRECPT_TYPE ?? ''
  if (precptType === '비') currentSky = '비'
  else if (precptType === '눈') currentSky = '눈'
  else if (precptType === '비/눈') currentSky = '비/눈'

  return {
    weatherTime: w.WEATHER_TIME ?? '',
    temp: Number(w.TEMP ?? 0),
    sensibleTemp: Number(w.SENSIBLE_TEMP ?? 0),
    maxTemp: Number(w.MAX_TEMP ?? 0),
    minTemp: Number(w.MIN_TEMP ?? 0),
    humidity: Number(w.HUMIDITY ?? 0),
    wind: w.WIND_DIRCT ?? '',
    windSpd: Number(w.WIND_SPD ?? 0),
    precipitation: w.PRECIPITATION ?? '',
    precipitationType: precptType,
    skyStatus: currentSky,
    uvIdx: w.UV_INDEX ?? '',
    uvIdxLvl: w.UV_INDEX_LVL ?? '',
    pm25: Number(w.PM25 ?? 0),
    pm25Idx: w.PM25_INDEX as AirQualityLevel,
    pm10: Number(w.PM10 ?? 0),
    pm10Idx: w.PM10_INDEX as AirQualityLevel,
  }
}

export class SeoulApiService {
  private readonly apiKey: string
  private cache: Map<string, AreaData> = new Map()

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchArea(areaName: string): Promise<AreaData> {
    const url = `${API_BASE}/${this.apiKey}/json/citydata/1/5/${encodeURIComponent(areaName)}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API error: ${response.status} for ${areaName}`)
    }
    const json = await response.json()
    const cityData = json?.SeoulRtd?.row?.[0] ?? json?.CITYDATA ?? json

    const data: AreaData = {
      areaCd: cityData?.AREA_CD ?? areaName,
      areaName,
      population: parsePopulation(cityData),
      weather: parseWeather(cityData),
      fetchedAt: Date.now(),
    }
    this.cache.set(areaName, data)
    return data
  }

  async fetchAreas(areaNames: string[]): Promise<Map<string, AreaData>> {
    const results = new Map<string, AreaData>()
    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < areaNames.length; i += CONCURRENCY_LIMIT) {
      const batch = areaNames.slice(i, i + CONCURRENCY_LIMIT)
      const settled = await Promise.allSettled(
        batch.map(name => this.fetchArea(name))
      )
      settled.forEach((result, idx) => {
        const name = batch[idx]
        if (result.status === 'fulfilled') {
          results.set(name, result.value)
        } else {
          // Use cached data on failure
          const cached = this.cache.get(name)
          if (cached) results.set(name, cached)
        }
      })
    }
    return results
  }

  getCache(): Map<string, AreaData> {
    return new Map(this.cache)
  }

  getCached(areaName: string): AreaData | undefined {
    const data = this.cache.get(areaName)
    if (!data) return undefined
    // Return stale data if too old (caller decides freshness)
    return data
  }

  isFresh(areaName: string): boolean {
    const data = this.cache.get(areaName)
    if (!data) return false
    return Date.now() - data.fetchedAt < CACHE_TTL_MS
  }

}

// Singleton for app use
let _instance: SeoulApiService | null = null

export function getApiService(): SeoulApiService {
  if (!_instance) {
    _instance = new SeoulApiService(import.meta.env.VITE_SEOUL_API_KEY ?? '')
  }
  return _instance
}
