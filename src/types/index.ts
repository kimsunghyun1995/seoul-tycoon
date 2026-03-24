export type CongestionLevel = '여유' | '보통' | '약간 붐빔' | '붐빔'

export type AirQualityLevel = '좋음' | '보통' | '나쁨' | '매우나쁨'

export interface PopulationData {
  areaCd: string
  areaName: string
  areaCongestLvl: CongestionLevel
  areaCongestMsg: string
  areaPopMin: number
  areaPopMax: number
  malePopRate: number
  femalePopRate: number
  residentPopRate: number
  nonResidentPopRate: number
  ageGroup: {
    rate0: number
    rate10: number
    rate20: number
    rate30: number
    rate40: number
    rate50: number
    rate60: number
    rate70: number
  }
}

export interface WeatherData {
  weatherTime: string
  temp: number
  sensibleTemp: number
  maxTemp: number
  minTemp: number
  humidity: number
  wind: string
  windSpd: number
  precipitation: string
  precipitationType: string
  skyStatus: string
  uvIdx: string
  uvIdxLvl: string
  pm25: number
  pm25Idx: AirQualityLevel
  pm10: number
  pm10Idx: AirQualityLevel
}

export interface AreaData {
  areaCd: string
  areaName: string
  population: PopulationData | null
  weather: WeatherData | null
  fetchedAt: number
}

export interface Location {
  code: string
  name: string
  lng: number
  lat: number
}

// Cultural event from Seoul API
export interface CulturalEvent {
  title: string
  category: string
  place: string
  startDate: string
  endDate: string
  lat: number
  lng: number
  guName: string
  orgLink: string
  mainImg: string
  useFee: string
}

// Ranked area for ranking panel
export interface RankedArea {
  code: string
  name: string
  congestionLevel: CongestionLevel
  populationAvg: number
  events: CulturalEvent[]
}

// Prediction types (interfaces only - Phase 5)
export interface SubwayArrival {
  stationName: string
  lineId: string
  direction: string
  arrivalTime: number
  congestion: 'low' | 'medium' | 'high'
}

export interface TrafficSegment {
  roadName: string
  speed: number
  congestion: 'smooth' | 'slow' | 'congested'
  lat: number
  lng: number
}

export interface PredictionInput {
  areaCode: string
  currentPopulation: number
  currentCongestion: CongestionLevel
  subwayArrivals: SubwayArrival[]
  trafficSegments: TrafficSegment[]
  activeEvents: CulturalEvent[]
  hour: number
  dayOfWeek: number
}

export interface CongestionPrediction {
  areaCode: string
  predictions: Array<{
    hour: number
    predictedLevel: CongestionLevel
    predictedPopulation: number
    confidence: number
  }>
  factors: PredictionFactor[]
}

export interface PredictionFactor {
  type: 'event' | 'subway' | 'traffic' | 'time' | 'weather'
  description: string
  impact: 'increase' | 'decrease' | 'neutral'
  weight: number
}

// Hot/trending restaurant from Supabase
export interface HotRestaurant {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  google_rating: number | null
  google_review_count: number
  google_place_id: string | null
  instagram_mentions: number
  threads_mentions: number
  source_urls: string[]
  trending_score: number
  category: string | null
  image_url: string | null
  created_at: string
}

// Subway station data
export interface SubwayStation {
  id: string                    // e.g., "ST001"
  name: string                  // Korean name
  nameEn: string                // English name
  lines: number[]               // Line numbers [2], [2, 6], etc.
  lat: number
  lng: number
  nearbyHotspots: string[]      // POI codes within 800m
}

// Real-time subway arrival
export interface SubwayArrivalInfo {
  stationName: string
  lineNumber: string            // "2호선", "6호선"
  direction: string             // "잠실방면", etc.
  destination: string           // Final destination
  arrivalMessage: string        // "3분 20초", "전역 도착", etc.
  arrivalSeconds: number        // Seconds until arrival (-1 if unknown)
  congestion: 'low' | 'medium' | 'high' | 'unknown'
  updatedAt: string
}
