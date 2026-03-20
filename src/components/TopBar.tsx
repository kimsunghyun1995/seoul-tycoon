import type { WeatherData } from '../types'
import { AIR_QUALITY_COLOR } from '../constants/colors'

const SKY_ICON: Record<string, string> = {
  '맑음': '☀️',
  '구름조금': '🌤️',
  '구름많음': '⛅',
  '흐림': '☁️',
  '비': '🌧️',
  '눈': '❄️',
  '비/눈': '🌨️',
  '소나기': '⛈️',
}

function getWeatherIcon(skyStatus: string): string {
  return SKY_ICON[skyStatus] ?? '🌡️'
}

interface WeatherBadgeProps {
  weather: WeatherData | null
}

export function WeatherBadge({ weather }: WeatherBadgeProps) {
  if (!weather) {
    return (
      <div
        data-testid="weather-badge"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
        style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
      >
        <span>--</span>
        <span className="text-white/80">날씨 로딩 중</span>
      </div>
    )
  }

  const icon = getWeatherIcon(weather.skyStatus)

  return (
    <div
      data-testid="weather-badge"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
    >
      <span role="img" aria-label={weather.skyStatus}>{icon}</span>
      <span className="text-white font-bold">{weather.temp}°C</span>
      <span className="text-white/90 text-xs">{weather.skyStatus}</span>
    </div>
  )
}

interface AirQualityBadgeProps {
  weather: WeatherData | null
}

export function AirQualityBadge({ weather }: AirQualityBadgeProps) {
  if (!weather) {
    return (
      <div
        data-testid="air-quality-badge"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
        style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
      >
        <span className="text-white/80">PM2.5 --</span>
      </div>
    )
  }

  const level = weather.pm25Idx
  const color = AIR_QUALITY_COLOR[level] ?? '#4caf50'

  return (
    <div
      data-testid="air-quality-badge"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
    >
      <span
        data-testid="air-quality-indicator"
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
        }}
      />
      <span className="text-white text-xs">PM2.5</span>
      <span className="text-white font-bold">{weather.pm25}</span>
      <span
        data-testid="air-quality-level"
        className="text-xs font-semibold"
        style={{ color }}
      >
        {level}
      </span>
    </div>
  )
}

interface TopBarProps {
  weather: WeatherData | null
}

export default function TopBar({ weather }: TopBarProps) {
  return (
    <div
      data-testid="top-bar"
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
      style={{ pointerEvents: 'none' }}
    >
      {/* App title */}
      <div
        className="text-white font-bold text-lg tracking-wide"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
      >
        서울 타이쿤
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
        <WeatherBadge weather={weather} />
        <AirQualityBadge weather={weather} />
      </div>
    </div>
  )
}
