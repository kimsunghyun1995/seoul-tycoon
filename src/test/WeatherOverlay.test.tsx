import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WeatherOverlay, { getSkyState } from '../components/WeatherOverlay'
import type { WeatherData } from '../types'

const makeWeather = (overrides: Partial<WeatherData> = {}): WeatherData => ({
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
  pm25: 10,
  pm25Idx: '좋음',
  pm10: 20,
  pm10Idx: '좋음',
  ...overrides,
})

describe('getSkyState', () => {
  it('returns clear for sunny weather', () => {
    expect(getSkyState(makeWeather({ skyStatus: '맑음' }))).toBe('clear')
  })

  it('returns cloudy for overcast', () => {
    expect(getSkyState(makeWeather({ skyStatus: '흐림' }))).toBe('cloudy')
  })

  it('returns rain for precipitation', () => {
    expect(getSkyState(makeWeather({ precipitationType: '비' }))).toBe('rain')
  })

  it('returns snow for snow', () => {
    expect(getSkyState(makeWeather({ precipitationType: '눈' }))).toBe('snow')
  })

  it('returns dust for high PM2.5', () => {
    expect(getSkyState(makeWeather({ pm25: 80 }))).toBe('dust')
  })

  it('returns clear for null weather', () => {
    expect(getSkyState(null)).toBe('clear')
  })
})

describe('WeatherOverlay', () => {
  it('renders overlay container', () => {
    render(<WeatherOverlay weather={null} />)
    expect(screen.getByTestId('weather-overlay')).toBeInTheDocument()
  })

  it('shows sun glow in clear weather', () => {
    render(<WeatherOverlay weather={makeWeather({ skyStatus: '맑음' })} />)
    expect(screen.getByTestId('sun-glow')).toBeInTheDocument()
  })

  it('shows dust haze for high PM2.5', () => {
    render(<WeatherOverlay weather={makeWeather({ pm25: 100 })} />)
    expect(screen.getByTestId('dust-haze')).toBeInTheDocument()
  })

  it('shows clouds for cloudy weather', () => {
    render(<WeatherOverlay weather={makeWeather({ skyStatus: '흐림' })} />)
    expect(screen.getAllByTestId('cloud').length).toBeGreaterThan(0)
  })

  it('sets correct sky-state data attribute', () => {
    render(<WeatherOverlay weather={makeWeather({ skyStatus: '맑음' })} />)
    expect(screen.getByTestId('weather-overlay')).toHaveAttribute('data-sky-state', 'clear')
  })

  it('shows particle canvas for rain', () => {
    render(<WeatherOverlay weather={makeWeather({ precipitationType: '비' })} />)
    expect(screen.getByTestId('particle-canvas')).toBeInTheDocument()
  })
})
