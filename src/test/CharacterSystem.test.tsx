import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CharacterSystem from '../components/CharacterSystem'
import type { Location, CongestionLevel } from '../types'

// Mock PixiJS - it requires WebGL which isn't available in jsdom
vi.mock('pixi.js', () => {
  class MockApplication {
    stage = { addChild: vi.fn() }
    ticker = { add: vi.fn() }
    init = vi.fn().mockResolvedValue(undefined)
    destroy = vi.fn()
  }

  class MockGraphics {
    circle() { return this }
    fill() { return this }
    roundRect() { return this }
    moveTo() { return this }
    lineTo() { return this }
    stroke() { return this }
    clear() { return this }
  }

  class MockContainer {
    addChild = vi.fn()
    removeChild = vi.fn()
    alpha = 1
    x = 0
    y = 0
    scale = { set: vi.fn() }
    destroy = vi.fn()
  }

  class MockTicker {}

  return {
    Application: MockApplication,
    Graphics: MockGraphics,
    Container: MockContainer,
    Ticker: MockTicker,
  }
})

// Minimal mock MapLibre map instance
const mockMap = {
  project: vi.fn().mockReturnValue({ x: 300, y: 200 }),
  getZoom: vi.fn().mockReturnValue(11),
  on: vi.fn(),
  off: vi.fn(),
}

const mockLocations: Location[] = [
  { code: 'POI001', name: '경복궁', lng: 126.977, lat: 37.579 },
  { code: 'POI035', name: '강남역', lng: 127.028, lat: 37.498 },
]

describe('CharacterSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a canvas element', () => {
    const { getByTestId } = render(
      <CharacterSystem
        map={mockMap as any}
        locations={mockLocations}
        congestionMap={new Map()}
      />
    )
    expect(getByTestId('character-canvas')).toBeInTheDocument()
  })

  it('canvas is positioned absolute and fills parent with pointer-events none', () => {
    const { getByTestId } = render(
      <CharacterSystem
        map={mockMap as any}
        locations={mockLocations}
        congestionMap={new Map()}
      />
    )
    const canvas = getByTestId('character-canvas')
    expect(canvas.style.position).toBe('absolute')
    expect(canvas.style.width).toBe('100%')
    expect(canvas.style.height).toBe('100%')
    expect(canvas.style.pointerEvents).toBe('none')
  })

  it('renders with congestion map data', () => {
    const congestionMap = new Map<string, CongestionLevel>([
      ['POI001', '붐빔'],
      ['POI035', '여유'],
    ])
    const { getByTestId } = render(
      <CharacterSystem
        map={mockMap as any}
        locations={mockLocations}
        congestionMap={congestionMap}
      />
    )
    expect(getByTestId('character-canvas')).toBeInTheDocument()
  })

  it('renders without a map (map=null)', () => {
    const { getByTestId } = render(
      <CharacterSystem
        map={null}
        locations={mockLocations}
        congestionMap={new Map()}
      />
    )
    expect(getByTestId('character-canvas')).toBeInTheDocument()
  })
})
