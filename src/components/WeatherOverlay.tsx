import { useEffect, useRef } from 'react'
import type { WeatherData } from '../types'

type WeatherState = 'clear' | 'cloudy' | 'rain' | 'snow' | 'dust'
type DayPeriod = 'day' | 'sunset' | 'night' | 'dawn'

function getSkyState(weather: WeatherData | null): WeatherState {
  if (!weather) return 'clear'
  const sky = weather.skyStatus ?? ''
  const pm = weather.pm25 ?? 0
  const precip = weather.precipitationType ?? ''

  if (pm > 75) return 'dust'
  if (precip === '눈' || sky.includes('눈')) return 'snow'
  if (precip !== '없음' && precip !== '' && precip !== '0') return 'rain'
  if (sky.includes('흐림') || sky.includes('구름많음')) return 'cloudy'
  return 'clear'
}

function getDayPeriod(hour: number): DayPeriod {
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'sunset'
  if (hour >= 19 || hour < 5) return 'night'
  return 'dawn'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  wobble?: number
}

function createRainParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 110 - 5,
    y: Math.random() * 100,
    vx: -0.5,
    vy: 2.2 + Math.random() * 2.0,
    size: 0.15 + Math.random() * 0.15,
    opacity: 0.6 + Math.random() * 0.3,
  }))
}

function createSnowParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.4,
    vy: 0.25 + Math.random() * 0.45,
    size: 2 + Math.random() * 6,
    opacity: 0.65 + Math.random() * 0.35,
    wobble: Math.random() * Math.PI * 2,
  }))
}

function createDustMotes(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.1,
    size: 1.5 + Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.25,
  }))
}

interface WeatherOverlayProps {
  weather: WeatherData | null
}

export default function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const skyState = getSkyState(weather)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Only create particles for rain/snow/dust — clear/cloudy show nothing
  useEffect(() => {
    if (skyState === 'rain') {
      particlesRef.current = createRainParticles(160)
    } else if (skyState === 'snow') {
      particlesRef.current = createSnowParticles(80)
    } else if (skyState === 'dust') {
      particlesRef.current = createDustMotes(40)
    } else {
      particlesRef.current = []
    }
  }, [skyState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function animate() {
      if (!running || !canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const w = canvas.width
      const h = canvas.height

      if (skyState === 'rain') {
        ctx.strokeStyle = 'rgba(160, 200, 230, 0.8)'
        for (const p of particles) {
          p.y += p.vy
          p.x += p.vx
          if (p.y > 105) { p.y = -5; p.x = Math.random() * 110 - 5 }
          if (p.x < -5) p.x = 105

          const px = (p.x / 100) * w
          const py = (p.y / 100) * h
          ctx.globalAlpha = p.opacity
          ctx.lineWidth = Math.max(0.8, p.size * w * 0.006)
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px + p.vx * 12, py + p.vy * 12)
          ctx.stroke()
        }
      } else if (skyState === 'snow') {
        for (const p of particles) {
          p.y += p.vy
          p.wobble = (p.wobble ?? 0) + 0.025
          p.x += p.vx + Math.sin(p.wobble ?? 0) * 0.18
          if (p.y > 105) { p.y = -3; p.x = Math.random() * 100 }
          if (p.x < 0) p.x = 100
          if (p.x > 100) p.x = 0

          const px = (p.x / 100) * w
          const py = (p.y / 100) * h
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.arc(px, py, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (skyState === 'dust') {
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0) p.x = 100
          if (p.x > 100) p.x = 0
          if (p.y < 0) p.y = 100
          if (p.y > 100) p.y = 0

          const px = (p.x / 100) * w
          const py = (p.y / 100) * h
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = 'rgba(210, 165, 80, 1)'
          ctx.beginPath()
          ctx.arc(px, py, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [skyState])

  // Don't render overlay at all for clear/cloudy weather
  const hasEffect = skyState === 'rain' || skyState === 'snow' || skyState === 'dust'

  return (
    <div
      data-testid="weather-overlay"
      data-sky-state={skyState}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: hasEffect ? 1 : 0,
      }}
    >
      {/* Slight darkening for rain only */}
      {skyState === 'rain' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(50, 70, 95, 0.15)',
            zIndex: 0,
          }}
        />
      )}

      {/* Subtle dust haze */}
      {skyState === 'dust' && (
        <div
          data-testid="dust-haze"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(185, 145, 75, 0.18)',
            zIndex: 1,
          }}
        />
      )}

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        data-testid="particle-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}
      />
    </div>
  )
}

export { getSkyState, getDayPeriod }
