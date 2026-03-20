import { useEffect, useRef, useCallback, type RefObject } from 'react'
import { Application, Graphics, Container, Ticker } from 'pixi.js'
import type { CongestionLevel, Location } from '../types'

const CHARS_PER_100_PEOPLE = 1
const MAX_CHARS_PER_HOTSPOT = 500
// Fallback counts when population data is unavailable
const CONGESTION_FALLBACK_COUNT: Record<CongestionLevel, number> = {
  '여유': 3,
  '보통': 8,
  '약간 붐빔': 15,
  '붐빔': 30,
}

function populationToCharCount(population: number | undefined, congestion: CongestionLevel): number {
  if (population != null && population > 0) {
    return Math.min(MAX_CHARS_PER_HOTSPOT, Math.floor(population / 100 * CHARS_PER_100_PEOPLE))
  }
  return CONGESTION_FALLBACK_COUNT[congestion]
}

const BASE_HOTSPOT_RADIUS = 30
const WALK_SPEED = 0.3

function getHotspotRadius(charCount: number): number {
  return Math.max(BASE_HOTSPOT_RADIUS, Math.sqrt(charCount) * 3)
}

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

function spawnCharacter(homeX: number, homeY: number, bodyColor: number, radius: number): Character {
  const container = new Container()
  const graphics = createCharacterGraphics(bodyColor)
  container.addChild(graphics)
  const pos = randomInRadius(homeX, homeY, radius * 0.7)
  container.x = pos.x
  container.y = pos.y
  container.alpha = 0
  container.scale.set(0.9 + Math.random() * 0.4)

  const target = randomInRadius(homeX, homeY, radius)

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
  radius: number
}

const DETAIL_ZOOM_THRESHOLD = 0.9  // below this: render as dots
const SPAWN_THROTTLE_FRAMES = 3    // only spawn/despawn every N frames

export interface CharacterSystemProps {
  locations: Location[]
  congestionMap: Map<string, CongestionLevel>
  populationMap?: Map<string, number>
  zoomScaleRef?: RefObject<number>
}

export default function CharacterSystem({ locations, congestionMap, populationMap, zoomScaleRef }: CharacterSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  const hotspotsRef = useRef<Map<string, HotspotState>>(new Map())
  const stageContainerRef = useRef<Container | null>(null)
  const frameCountRef = useRef(0)

  const initPixi = useCallback(async () => {
    if (!canvasRef.current) return
    if (appRef.current) return

    const app = new Application()
    await app.init({
      canvas: canvasRef.current,
      backgroundAlpha: 0,
      width: 800,
      height: 700,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app

    const stageContainer = new Container()
    app.stage.addChild(stageContainer)
    stageContainerRef.current = stageContainer

    app.ticker.add((ticker: Ticker) => {
      const dt = ticker.deltaTime
      const hotspots = hotspotsRef.current
      const frame = ++frameCountRef.current
      const doSpawnDespawn = frame % SPAWN_THROTTLE_FRAMES === 0
      const scale = zoomScaleRef?.current ?? 1
      const showDetail = scale >= DETAIL_ZOOM_THRESHOLD

      hotspots.forEach(state => {
        const { characters, targetCount } = state

        // Throttle spawn/despawn to avoid frame drops during data refresh
        if (doSpawnDespawn) {
          // Spawn one character per frame batch (not all at once)
          if (characters.length < targetCount) {
            const colorIdx = characters.length % BODY_COLORS.length
            const char = spawnCharacter(state.location.x, state.location.y, BODY_COLORS[colorIdx], state.radius)
            stageContainer.addChild(char.container)
            characters.push(char)
          }

          // Mark one excess character for despawning
          if (characters.length > targetCount) {
            const char = characters[characters.length - 1]
            if (char.state === 'walking') char.state = 'despawning'
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
              const target = randomInRadius(char.homeX, char.homeY, state.radius)
              char.targetX = target.x
              char.targetY = target.y
            } else {
              char.container.x += (dx / dist) * WALK_SPEED * dt
              char.container.y += (dy / dist) * WALK_SPEED * dt
            }

            // LOD: full detail (legs + body) when zoomed in, dot only when zoomed out
            if (showDetail) {
              char.phase += 0.15 * dt
              drawLegs(char.graphics, char.phase, char.bodyColor)
            } else {
              // Simple dot representation for performance at low zoom
              char.graphics.clear()
              char.graphics.circle(0, -5, 4)
              char.graphics.fill({ color: char.bodyColor })
            }
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
      const population = populationMap?.get(loc.code)
      const targetCount = populationToCharCount(population, congestion)
      const radius = getHotspotRadius(targetCount)

      const existing = hotspots.get(loc.code)
      if (existing) {
        existing.congestion = congestion
        existing.targetCount = targetCount
        existing.radius = radius
      } else {
        hotspots.set(loc.code, {
          location: loc,
          congestion,
          characters: [],
          targetCount,
          radius,
        })
      }
    })
  }, [locations, congestionMap, populationMap])

  return (
    <canvas
      ref={canvasRef}
      data-testid="character-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 800,
        height: 700,
        pointerEvents: 'none',
      }}
    />
  )
}
