import type { CongestionLevel, AirQualityLevel } from '../types'

export const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  '여유': '#4caf50',
  '보통': '#ffc107',
  '약간 붐빔': '#ff9800',
  '붐빔': '#f44336',
}

export const CONGESTION_BG: Record<CongestionLevel, string> = {
  '여유': '#e8f5e9',
  '보통': '#fff8e1',
  '약간 붐빔': '#fff3e0',
  '붐빔': '#ffebee',
}

export const AIR_QUALITY_COLOR: Record<AirQualityLevel, string> = {
  '좋음': '#4caf50',
  '보통': '#ffc107',
  '나쁨': '#ff9800',
  '매우나쁨': '#f44336',
}
