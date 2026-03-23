import { useEffect, useRef, useCallback } from 'react'
import { Application, Graphics, Container, Ticker } from 'pixi.js'
import type { CongestionLevel, Location } from '../types'
import type { Map as MaplibreMap } from 'maplibre-gl'

const CHARS_PER_500_PEOPLE = 1
const MAX_CHARS_PER_HOTSPOT = 50
const CONGESTION_FALLBACK_COUNT: Record<CongestionLevel, number> = {
  '여유': 3,
  '보통': 8,
  '약간 붐빔': 15,
  '붐빔': 25,
}

function populationToCharCount(population: number | undefined, congestion: CongestionLevel): number {
  if (population != null && population > 0) {
    return Math.min(MAX_CHARS_PER_HOTSPOT, Math.floor(population / 500 * CHARS_PER_500_PEOPLE))
  }
  return CONGESTION_FALLBACK_COUNT[congestion]
}

const WALK_SPEED = 0.4
// At MapLibre zoom >= 13, render full character detail; below: simplified
const DETAIL_ZOOM_THRESHOLD = 13

function getHotspotRadius(charCount: number, zoom: number): number {
  // Scale hotspot radius with zoom: more spread at higher zoom
  const zoomFactor = Math.pow(2, zoom - 11)
  return Math.max(20, Math.sqrt(charCount) * 4) * zoomFactor
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
  homeLng: number
  homeLat: number
  // current screen offset from projected home position
  offsetX: number
  offsetY: number
  targetOffsetX: number
  targetOffsetY: number
  phase: number
  bouncePhase: number
  alpha: number
  state: 'spawning' | 'walking' | 'despawning'
  bodyColor: number
}

function createCharacterGraphics(bodyColor: number): Graphics {
  const g = new Graphics()
  // Head (radius 3px)
  g.circle(0, -8, 3)
  g.fill({ color: 0xffe4c4 })
  // Body (5x7px)
  g.roundRect(-2.5, -5, 5, 7, 1)
  g.fill({ color: bodyColor })
  // Static legs
  g.moveTo(-1, 2)
  g.lineTo(-1, 6)
  g.stroke({ color: bodyColor, width: 1.5 })
  g.moveTo(1, 2)
  g.lineTo(1, 6)
  g.stroke({ color: bodyColor, width: 1.5 })
  return g
}

function drawLegs(g: Graphics, phase: number, bodyColor: number): void {
  g.clear()
  // Head
  g.circle(0, -8, 3)
  g.fill({ color: 0xffe4c4 })
  // Body
  g.roundRect(-2.5, -5, 5, 7, 1)
  g.fill({ color: bodyColor })
  // Animated legs with swing
  const legSwing = Math.sin(phase) * 2.5
  g.moveTo(-1, 2)
  g.lineTo(-1 + legSwing, 7)
  g.stroke({ color: bodyColor, width: 1.5 })
  g.moveTo(1, 2)
  g.lineTo(1 - legSwing, 7)
  g.stroke({ color: bodyColor, width: 1.5 })
}

function randomOffset(r: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2
  const dist = Math.random() * r
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
}

function spawnCharacter(homeLng: number, homeLat: number, bodyColor: number, radius: number): Character {
  const container = new Container()
  const graphics = createCharacterGraphics(bodyColor)
  container.addChild(graphics)
  container.alpha = 0
  container.scale.set(0.8 + Math.random() * 0.2)

  const startOffset = randomOffset(radius * 0.7)
  const targetOffset = randomOffset(radius)

  return {
    container,
    graphics,
    homeLng,
    homeLat,
    offsetX: startOffset.x,
    offsetY: startOffset.y,
    targetOffsetX: targetOffset.x,
    targetOffsetY: targetOffset.y,
    phase: Math.random() * Math.PI * 2,
    bouncePhase: Math.random() * Math.PI * 2,
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

const SPAWN_THROTTLE_FRAMES = 3

export interface CharacterSystemProps {
  map: MaplibreMap | null
  locations: Location[]
  congestionMap: Map<string, CongestionLevel>
  populationMap?: Map<string, number>
}

export default function CharacterSystem({ map, locations, congestionMap, populationMap }: CharacterSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  const hotspotsRef = useRef<Map<string, HotspotState>>(new Map())
  const stageContainerRef = useRef<Container | null>(null)
  const frameCountRef = useRef(0)
  const mapRef = useRef<MaplibreMap | null>(null)

  // Keep mapRef in sync with the map prop (no re-render needed)
  useEffect(() => {
    mapRef.current = map
  }, [map])

  const initPixi = useCallback(async (width: number, height: number) => {
    if (!canvasRef.current) return
    if (appRef.current) return

    const app = new Application()
    await app.init({
      canvas: canvasRef.current,
      backgroundAlpha: 0,
      width,
      height,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app

    const stageContainer = new Container()
    app.stage.addChild(stageContainer)
    stageContainerRef.current = stageContainer

    app.ticker.add((ticker: Ticker) => {
      const m = mapRef.current
      if (!m) return

      const dt = ticker.deltaTime
      const hotspots = hotspotsRef.current
      const frame = ++frameCountRef.current
      const doSpawnDespawn = frame % SPAWN_THROTTLE_FRAMES === 0
      const zoom = m.getZoom()
      const showDetail = zoom >= DETAIL_ZOOM_THRESHOLD

      const canvasWidth = canvasRef.current?.clientWidth ?? width
      const canvasHeight = canvasRef.current?.clientHeight ?? height

      hotspots.forEach(state => {
        const { characters, targetCount, location } = state
        // Update radius dynamically based on current zoom
        state.radius = getHotspotRadius(targetCount, zoom)

        if (doSpawnDespawn) {
          if (characters.length < targetCount) {
            const colorIdx = characters.length % BODY_COLORS.length
            const char = spawnCharacter(location.lng, location.lat, BODY_COLORS[colorIdx], state.radius)
            stageContainer.addChild(char.container)
            characters.push(char)
          }
          if (characters.length > targetCount) {
            const char = characters[characters.length - 1]
            if (char.state === 'walking') char.state = 'despawning'
          }
        }

        // Project home lng/lat to screen coords each frame (handles pan/zoom)
        const projected = m.project([location.lng, location.lat])

        for (let i = characters.length - 1; i >= 0; i--) {
          const char = characters[i]

          const screenX = projected.x + char.offsetX
          const screenY = projected.y + char.offsetY

          // Viewport culling: hide characters outside visible area
          const inViewport = screenX >= -20 && screenX <= canvasWidth + 20 &&
                             screenY >= -20 && screenY <= canvasHeight + 20
          char.container.visible = inViewport

          if (!inViewport) continue

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
            const dx = char.targetOffsetX - char.offsetX
            const dy = char.targetOffsetY - char.offsetY
            const dist = Math.hypot(dx, dy)

            if (dist < 2) {
              const target = randomOffset(state.radius)
              char.targetOffsetX = target.x
              char.targetOffsetY = target.y
            } else {
              char.offsetX += (dx / dist) * WALK_SPEED * dt
              char.offsetY += (dy / dist) * WALK_SPEED * dt
            }

            // Bounce phase advances while walking
            char.bouncePhase += 0.2 * dt
          }

          // Bounce effect: slight vertical oscillation while walking
          const bounceY = char.state === 'walking' ? Math.sin(char.bouncePhase * 2) * 0.8 : 0

          // Always update screen position (including despawning chars)
          char.container.x = projected.x + char.offsetX
          char.container.y = projected.y + char.offsetY + bounceY

          if (char.state === 'walking' || char.state === 'spawning') {
            if (showDetail) {
              char.phase += 0.18 * dt
              drawLegs(char.graphics, char.phase, char.bodyColor)
            } else {
              // Simplified: colored circle for zoom < DETAIL_ZOOM_THRESHOLD
              char.graphics.clear()
              char.graphics.circle(0, -2, 4)
              char.graphics.fill({ color: char.bodyColor })
            }
          }
        }
      })
    })
  }, [])

  useEffect(() => {
    const container = canvasRef.current?.parentElement
    const width = container?.clientWidth ?? 800
    const height = container?.clientHeight ?? 700
    initPixi(width, height)
    return () => {
      appRef.current?.destroy(false)
      appRef.current = null
    }
  }, [initPixi])

  // Resize PixiJS renderer when MapLibre map resizes
  useEffect(() => {
    if (!map) return
    const handleResize = () => {
      const app = appRef.current
      if (!app) return
      const container = canvasRef.current?.parentElement
      if (!container) return
      app.renderer.resize(container.clientWidth, container.clientHeight)
    }
    map.on('resize', handleResize)
    return () => {
      map.off('resize', handleResize)
    }
  }, [map])

  // Update hotspot data when locations/congestion/population changes
  useEffect(() => {
    const hotspots = hotspotsRef.current

    locations.forEach(loc => {
      const congestion = congestionMap.get(loc.code) ?? '여유'
      const population = populationMap?.get(loc.code)
      const targetCount = populationToCharCount(population, congestion)
      const radius = getHotspotRadius(targetCount, mapRef.current?.getZoom() ?? 11)

      const existing = hotspots.get(loc.code)
      if (existing) {
        existing.congestion = congestion
        existing.targetCount = targetCount
        // radius is updated dynamically per frame in the ticker based on zoom
        existing.location = loc
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
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
