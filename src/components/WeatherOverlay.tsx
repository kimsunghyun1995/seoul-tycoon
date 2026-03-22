import { useEffect, useRef, useState } from 'react'
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

const DAY_TINTS: Record<DayPeriod, string> = {
  day: 'rgba(255, 255, 255, 0)',
  sunset: 'rgba(255, 130, 50, 0.22)',
  night: 'rgba(8, 15, 55, 0.52)',
  dawn: 'rgba(255, 170, 160, 0.18)',
}

// Fixed star positions generated once at module load
const STARS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: (i * 37.3 + 11) % 100,
  y: (i * 13.7 + 3) % 38,
  size: 1 + (i % 3),
  delay: (i * 0.41) % 3,
  duration: 1.5 + (i % 5) * 0.4,
}))

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
  const [hour] = useState(() => new Date().getHours())
  const dayPeriod = getDayPeriod(hour)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  return (
    <div
      data-testid="weather-overlay"
      data-sky-state={skyState}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {/* Day/Night sky tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: DAY_TINTS[dayPeriod],
          transition: 'background 1s ease',
          zIndex: 0,
        }}
      />

      {/* Night: stars */}
      {dayPeriod === 'night' &&
        STARS.map(star => (
          <div
            key={star.id}
            data-testid="star"
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: 'white',
              animation: `starTwinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
              zIndex: 1,
            }}
          />
        ))
      }

      {/* Night: crescent moon */}
      {dayPeriod === 'night' && (
        <svg
          data-testid="moon"
          style={{ position: 'absolute', top: '4%', right: '7%', zIndex: 1, opacity: 0.92 }}
          width="34" height="34" viewBox="0 0 34 34"
        >
          <path
            d="M21 3 A13 13 0 1 0 21 31 A9 9 0 1 1 21 3Z"
            fill="#fffae0"
          />
        </svg>
      )}

      {/* Clear: animated sun with rotating rays - always render for test compatibility */}
      {skyState === 'clear' && (
        <div
          data-testid="sun-glow"
          style={{
            position: 'absolute',
            top: dayPeriod === 'sunset' || dayPeriod === 'dawn' ? undefined : '5%',
            bottom: dayPeriod === 'sunset' || dayPeriod === 'dawn' ? '10%' : undefined,
            right: '12%',
            width: 56,
            height: 56,
            zIndex: 1,
          }}
        >
          {/* Rotating ray spokes */}
          <svg
            style={{
              position: 'absolute',
              inset: -22,
              width: 100,
              height: 100,
              animation: 'sunRotate 14s linear infinite',
              opacity: dayPeriod === 'night' ? 0.15 : 1,
            }}
            viewBox="0 0 100 100"
          >
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
              <line
                key={i}
                x1="50" y1="9"
                x2="50" y2="2"
                stroke={dayPeriod === 'sunset' ? '#ffb020' : dayPeriod === 'dawn' ? '#ffb8a0' : '#ffd740'}
                strokeWidth="2.5"
                strokeLinecap="round"
                transform={`rotate(${deg}, 50, 50)`}
              />
            ))}
          </svg>
          {/* Sun disk */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: dayPeriod === 'sunset'
                ? 'radial-gradient(circle, #fff0a0 25%, #ff9020 55%, rgba(255,100,0,0) 78%)'
                : dayPeriod === 'dawn'
                  ? 'radial-gradient(circle, #ffe0e0 25%, #ffb090 55%, rgba(255,170,140,0) 78%)'
                  : 'radial-gradient(circle, #fff9c4 30%, #ffeb3b 58%, rgba(255,235,59,0) 80%)',
              animation: 'sunPulse 3s ease-in-out infinite',
              opacity: dayPeriod === 'night' ? 0.1 : 1,
            }}
          />
        </div>
      )}

      {/* Clouds - clear gets 1 fluffy cloud; cloudy/rain get 3 darker clouds */}
      {skyState === 'clear' && (
        <Cloud x={15} y={7} size={1.0} speed={25} dark={false} />
      )}
      {(skyState === 'cloudy' || skyState === 'rain') && (
        <>
          <Cloud x={8} y={6} size={1.3} speed={20} dark={skyState === 'rain'} />
          <Cloud x={42} y={4} size={1.0} speed={27} dark={skyState === 'rain'} />
          <Cloud x={68} y={10} size={1.2} speed={23} dark={skyState === 'rain'} />
        </>
      )}

      {/* Rain darker sky */}
      {skyState === 'rain' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(50, 70, 95, 0.28)',
            transition: 'background 1s ease',
            zIndex: 0,
          }}
        />
      )}

      {/* Dust haze */}
      {skyState === 'dust' && (
        <div
          data-testid="dust-haze"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(185, 145, 75, 0.32)',
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

      <style>{`
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.88; }
        }
        @keyframes sunRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cloudDrift {
          from { transform: translateX(0); }
          to { transform: translateX(22px); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(0.5); }
        }
      `}</style>
    </div>
  )
}

function Cloud({ x, y, size, speed, dark }: { x: number; y: number; size: number; speed: number; dark: boolean }) {
  const color = dark ? 'rgb(100, 115, 130)' : 'white'
  return (
    <div
      data-testid="cloud"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${80 * size}px`,
        height: `${40 * size}px`,
        background: color,
        borderRadius: '50px',
        opacity: dark ? 0.88 : 0.72,
        animation: `cloudDrift ${speed}s ease-in-out infinite alternate`,
        boxShadow: `${20 * size}px -${10 * size}px 0 ${10 * size}px ${color}`,
        zIndex: 1,
      }}
    />
  )
}

export { getSkyState, getDayPeriod }
