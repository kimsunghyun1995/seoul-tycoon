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
  x: number
  y: number
}
