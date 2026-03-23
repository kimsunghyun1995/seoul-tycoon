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
