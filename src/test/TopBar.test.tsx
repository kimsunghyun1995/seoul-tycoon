import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TopBar, { WeatherBadge, AirQualityBadge } from '../components/TopBar'
import type { WeatherData } from '../types'

const mockWeather: WeatherData = {
  weatherTime: '2026-03-20 10:00',
  temp: 15,
  sensibleTemp: 14,
  maxTemp: 18,
  minTemp: 8,
  humidity: 60,
  wind: '북서',
  windSpd: 3.5,
  precipitation: '0',
  precipitationType: '없음',
  skyStatus: '맑음',
  uvIdx: '2',
  uvIdxLvl: '낮음',
  pm25: 12,
  pm25Idx: '좋음',
  pm10: 25,
  pm10Idx: '좋음',
}

describe('WeatherBadge', () => {
  it('shows loading state when weather is null', () => {
    render(<WeatherBadge weather={null} />)
    expect(screen.getByTestId('weather-badge')).toBeInTheDocument()
    expect(screen.getByText('날씨 로딩 중')).toBeInTheDocument()
  })

  it('shows temperature and sky status', () => {
    render(<WeatherBadge weather={mockWeather} />)
    expect(screen.getByText('15°C')).toBeInTheDocument()
    expect(screen.getByText('맑음')).toBeInTheDocument()
  })

  it('shows weather emoji icon', () => {
    render(<WeatherBadge weather={mockWeather} />)
    const icon = screen.getByRole('img', { name: '맑음' })
    expect(icon).toBeInTheDocument()
  })
})

describe('AirQualityBadge', () => {
  it('shows loading state when weather is null', () => {
    render(<AirQualityBadge weather={null} />)
    expect(screen.getByTestId('air-quality-badge')).toBeInTheDocument()
    expect(screen.getByText('PM2.5 --')).toBeInTheDocument()
  })

  it('shows PM2.5 value and level', () => {
    render(<AirQualityBadge weather={mockWeather} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByTestId('air-quality-level')).toHaveTextContent('좋음')
  })

  it('uses green color for 좋음 level', () => {
    render(<AirQualityBadge weather={mockWeather} />)
    const indicator = screen.getByTestId('air-quality-indicator')
    expect(indicator.style.background).toBe('rgb(76, 175, 80)')
  })

  it('uses red color for 매우나쁨 level', () => {
    const badWeather: WeatherData = { ...mockWeather, pm25: 120, pm25Idx: '매우나쁨' }
    render(<AirQualityBadge weather={badWeather} />)
    const indicator = screen.getByTestId('air-quality-indicator')
    expect(indicator.style.background).toBe('rgb(244, 67, 54)')
  })

  it('uses orange color for 나쁨 level', () => {
    const weather: WeatherData = { ...mockWeather, pm25: 60, pm25Idx: '나쁨' }
    render(<AirQualityBadge weather={weather} />)
    const indicator = screen.getByTestId('air-quality-indicator')
    expect(indicator.style.background).toBe('rgb(255, 152, 0)')
  })
})

describe('TopBar', () => {
  it('renders the title', () => {
    render(<TopBar weather={null} />)
    expect(screen.getByText('서울 타이쿤')).toBeInTheDocument()
  })

  it('renders weather and air quality badges', () => {
    render(<TopBar weather={mockWeather} />)
    expect(screen.getByTestId('weather-badge')).toBeInTheDocument()
    expect(screen.getByTestId('air-quality-badge')).toBeInTheDocument()
  })

  it('is absolutely positioned', () => {
    render(<TopBar weather={null} />)
    const topBar = screen.getByTestId('top-bar')
    expect(topBar.style.pointerEvents).toBe('none')
  })
})
