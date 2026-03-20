import { useEffect, useRef, useCallback } from 'react'
import { Application, Graphics, Container, Ticker } from 'pixi.js'
import type { CongestionLevel, Location } from '../types'

const CONGESTION_COUNT: Record<CongestionLevel, [number, number]> = {
  '여유': [2, 5],
  '보통': [5, 10],
  '약간 붐빔': [10, 20],
  '붐빔': [20, 40],
}

const HOTSPOT_RADIUS = 25
const WALK_SPEED = 0.3
const SPAWN_RADIUS = 20

const BODY_COLORS = [
  0xff8fab, // pink
  0xffb347, // orange
  0x87ceeb, // sky blue
  0x98fb98, // pale green
  0xdda0dd, // plum
  0xf0e68c, // khaki
  0xb0e0e6, // powder blue
  0xffa07a, // light salmon
]

interface Character {
  container: Container
  graphics: Graphics
  x: number
  y: number
  vx: number
  vy: number
  phase: number // walk animation phase
  targetX: number
  targetY: number
  homeX: number
  homeY: number
  alpha: number
  state: 'spawning' | 'walking' | 'despawning'
  bodyColor: number
}

function createCharacterGraphics(bodyColor: number): Graphics {
  const g = new Graphics()

  // Head (round)
  g.circle(0, -10, 5)
  g.fill({ color: 0xffe4c4 })

  // Body
  g.roundRect(-4, -5, 8, 9, 2)
  g.fill({ color: bodyColor })

  return g
}

function drawLegs(g: Graphics, phase: number, bodyColor: number): void {
  g.clear()

  // Head
  g.circle(0, -10, 5)
  g.fill({ color: 0xffe4c4 })

  // Body
  g.roundRect(-4, -5, 8, 9, 2)
  g.fill({ color: bodyColor })

  // Animated legs
  const legSwing = Math.sin(phase) * 3
  // Left leg
  g.moveTo(-2, 4)
  g.lineTo(-2 + legSwing, 10)
  g.stroke({ color: bodyColor, width: 2 })
  // Right leg
  g.moveTo(2, 4)
  g.lineTo(2 - legSwing, 10)
  g.stroke({ color: bodyColor, width: 2 })
}

function randomInRadius(cx: number, cy: number, r: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2
  const dist = Math.random() * r
  return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist }
}

function spawnCharacter(homeX: number, homeY: number, bodyColor: number): Character {
  const container = new Container()
  const graphics = createCharacterGraphics(bodyColor)
  container.addChild(graphics)
  const pos = randomInRadius(homeX, homeY, SPAWN_RADIUS)
  container.x = pos.x
  container.y = pos.y
  container.alpha = 0
  container.scale.set(0.7 + Math.random() * 0.6)

  const target = randomInRadius(homeX, homeY, HOTSPOT_RADIUS)

  return {
    container,
    graphics,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    phase: Math.random() * Math.PI * 2,
    targetX: target.x,
    targetY: target.y,
    homeX,
    homeY,
    alpha: 0,
    state: 'spawning',
    bodyColor,
  }
}

interface HotspotState {
  location: Location
  congestion: CongestionLevel
  characters: Character[]
  targetCount: number
}

export interface CharacterSystemProps {
  locations: Location[]
  congestionMap: Map<string, CongestionLevel>
}

export default function CharacterSystem({ locations, congestionMap }: CharacterSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  const hotspotsRef = useRef<Map<string, HotspotState>>(new Map())
  const stageContainerRef = useRef<Container | null>(null)

  const initPixi = useCallback(async () => {
    if (!canvasRef.current) return
    if (appRef.current) return

    const app = new Application()
    await app.init({
      canvas: canvasRef.current,
      backgroundAlpha: 0,
      resizeTo: canvasRef.current.parentElement ?? canvasRef.current,
      antialias: true,
    })
    appRef.current = app

    const stageContainer = new Container()
    app.stage.addChild(stageContainer)
    stageContainerRef.current = stageContainer

    app.ticker.add((ticker: Ticker) => {
      const dt = ticker.deltaTime
      const hotspots = hotspotsRef.current

      hotspots.forEach(state => {
        const { characters, targetCount } = state

        // Spawn or despawn to match target count
        while (characters.length < targetCount) {
          const colorIdx = characters.length % BODY_COLORS.length
          const char = spawnCharacter(state.location.x, state.location.y, BODY_COLORS[colorIdx])
          stageContainer.addChild(char.container)
          characters.push(char)
        }

        // Mark excess characters for despawning
        if (characters.length > targetCount) {
          const excess = characters.length - targetCount
          for (let i = 0; i < excess; i++) {
            const char = characters[characters.length - 1 - i]
            if (char.state === 'walking') {
              char.state = 'despawning'
            }
          }
        }

        // Update each character
        for (let i = characters.length - 1; i >= 0; i--) {
          const char = characters[i]

          if (char.state === 'spawning') {
            char.alpha = Math.min(1, char.alpha + 0.05 * dt)
            char.container.alpha = char.alpha
            if (char.alpha >= 1) char.state = 'walking'
          } else if (char.state === 'despawning') {
            char.alpha = Math.max(0, char.alpha - 0.04 * dt)
            char.container.alpha = char.alpha
            if (char.alpha <= 0) {
              stageContainer.removeChild(char.container)
              char.container.destroy()
              characters.splice(i, 1)
              continue
            }
          }

          if (char.state === 'walking' || char.state === 'spawning') {
            // Move towards target
            const dx = char.targetX - char.container.x
            const dy = char.targetY - char.container.y
            const dist = Math.hypot(dx, dy)

            if (dist < 2) {
              // Pick new random target within hotspot
              const target = randomInRadius(char.homeX, char.homeY, HOTSPOT_RADIUS)
              char.targetX = target.x
              char.targetY = target.y
            } else {
              char.container.x += (dx / dist) * WALK_SPEED * dt
              char.container.y += (dy / dist) * WALK_SPEED * dt
            }

            // Animate legs
            char.phase += 0.15 * dt
            drawLegs(char.graphics, char.phase, char.bodyColor)
          }
        }
      })
    })
  }, [])

  useEffect(() => {
    initPixi()
    return () => {
      appRef.current?.destroy(false)
      appRef.current = null
    }
  }, [initPixi])

  useEffect(() => {
    const hotspots = hotspotsRef.current

    locations.forEach(loc => {
      const congestion = congestionMap.get(loc.code) ?? '여유'
      const [min, max] = CONGESTION_COUNT[congestion]
      const targetCount = Math.floor(min + Math.random() * (max - min))

      const existing = hotspots.get(loc.code)
      if (existing) {
        existing.congestion = congestion
        existing.targetCount = targetCount
      } else {
        hotspots.set(loc.code, {
          location: loc,
          congestion,
          characters: [],
          targetCount,
        })
      }
    })
  }, [locations, congestionMap])

  return (
    <canvas
      ref={canvasRef}
      data-testid="character-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
