import { useEffect, useRef, useState } from 'react'
import type { WeatherData } from '../types'

type WeatherState = 'clear' | 'cloudy' | 'rain' | 'snow' | 'dust'

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

const SKY_GRADIENTS: Record<WeatherState, [string, string]> = {
  clear: ['#87ceeb', '#d4f1c0'],
  cloudy: ['#b0c4de', '#c8d8c8'],
  rain: ['#708090', '#a0a8b0'],
  snow: ['#e0e8f0', '#c8d8e8'],
  dust: ['#d4b896', '#c8a878'],
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

function createRainParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: -0.3,
    vy: 1.5 + Math.random() * 1.5,
    size: 0.15 + Math.random() * 0.1,
    opacity: 0.4 + Math.random() * 0.4,
  }))
}

function createSnowParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.3,
    vy: 0.4 + Math.random() * 0.4,
    size: 0.3 + Math.random() * 0.4,
    opacity: 0.6 + Math.random() * 0.4,
  }))
}

interface WeatherOverlayProps {
  weather: WeatherData | null
}

export default function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const skyState = getSkyState(weather)
  const [gradTop, gradBottom] = SKY_GRADIENTS[skyState]
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (skyState === 'rain') {
      particlesRef.current = createRainParticles(80)
    } else if (skyState === 'snow') {
      particlesRef.current = createSnowParticles(50)
    } else {
      particlesRef.current = []
    }
    forceUpdate(n => n + 1)
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
        ctx.strokeStyle = 'rgba(150, 180, 200, 0.7)'
        for (const p of particles) {
          p.y += p.vy
          p.x += p.vx
          if (p.y > 100) { p.y = -5; p.x = Math.random() * 100 }
          if (p.x < 0) p.x = 100

          const px = (p.x / 100) * w
          const py = (p.y / 100) * h
          ctx.globalAlpha = p.opacity
          ctx.lineWidth = p.size
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px + p.vx * 8, py + p.vy * 8)
          ctx.stroke()
        }
      } else if (skyState === 'snow') {
        for (const p of particles) {
          p.y += p.vy
          p.x += p.vx + Math.sin(p.y * 0.05) * 0.1
          if (p.y > 100) { p.y = -3; p.x = Math.random() * 100 }
          if (p.x < 0) p.x = 100
          if (p.x > 100) p.x = 0

          const px = (p.x / 100) * w
          const py = (p.y / 100) * h
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.arc(px, py, (p.size / 100) * w, 0, Math.PI * 2)
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
        transition: 'background 1s ease',
        background: `linear-gradient(to bottom, ${gradTop}, ${gradBottom})`,
        opacity: 0.35,
      }}
    >
      {/* Fine dust haze */}
      {skyState === 'dust' && (
        <div
          data-testid="dust-haze"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(180, 140, 80, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sun glow */}
      {skyState === 'clear' && (
        <div
          data-testid="sun-glow"
          style={{
            position: 'absolute',
            top: '8%',
            right: '15%',
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff9c4 30%, #ffeb3b 60%, transparent 80%)',
            animation: 'sunPulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Clouds */}
      {(skyState === 'cloudy' || skyState === 'rain') && (
        <>
          <Cloud x={10} y={8} size={1.2} speed={20} />
          <Cloud x={45} y={5} size={0.9} speed={28} />
          <Cloud x={70} y={12} size={1.1} speed={22} />
        </>
      )}

      {/* Particle canvas for rain/snow */}
      <canvas
        ref={canvasRef}
        data-testid="particle-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <style>{`
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes cloudDrift {
          from { transform: translateX(0); }
          to { transform: translateX(15px); }
        }
      `}</style>
    </div>
  )
}

function Cloud({ x, y, size, speed }: { x: number; y: number; size: number; speed: number }) {
  return (
    <div
      data-testid="cloud"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${80 * size}px`,
        height: `${40 * size}px`,
        background: 'white',
        borderRadius: '50px',
        opacity: 0.8,
        animation: `cloudDrift ${speed}s ease-in-out infinite alternate`,
        boxShadow: `${20 * size}px -${10 * size}px 0 ${10 * size}px white`,
      }}
    />
  )
}

export { getSkyState }
