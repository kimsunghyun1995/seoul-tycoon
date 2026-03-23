import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SubwayStationLayer, { SUBWAY_LINE_COLORS } from '../components/SubwayStationLayer'
import { SUBWAY_STATIONS } from '../services/SubwayStationRegistry'

// Collect created marker elements for inspection
const createdMarkerElements: HTMLElement[] = []

vi.mock('maplibre-gl', () => {
  class MockMarker {
    _element: HTMLElement
    constructor({ element }: { element: HTMLElement; anchor?: string }) {
      this._element = element
      createdMarkerElements.push(element)
    }
    setLngLat(_coords: [number, number]) { return this }
    addTo(_map: unknown) { return this }
    remove() {}
    getElement() { return this._element }
  }
  return {
    default: { Marker: MockMarker },
  }
})

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  isStyleLoaded: vi.fn().mockReturnValue(true),
  getZoom: vi.fn().mockReturnValue(13),
  getSource: vi.fn().mockReturnValue(null),
  getLayer: vi.fn().mockReturnValue(null),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeSource: vi.fn(),
  removeLayer: vi.fn(),
}

describe('SUBWAY_LINE_COLORS', () => {
  it('defines all 9 Seoul subway lines', () => {
    expect(Object.keys(SUBWAY_LINE_COLORS)).toHaveLength(9)
    for (let i = 1; i <= 9; i++) {
      expect(SUBWAY_LINE_COLORS[i]).toBeDefined()
      expect(SUBWAY_LINE_COLORS[i]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('line 2 is green', () => {
    expect(SUBWAY_LINE_COLORS[2]).toBe('#00A84D')
  })

  it('line 5 is purple', () => {
    expect(SUBWAY_LINE_COLORS[5]).toBe('#996CAC')
  })
})

describe('SubwayStationLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createdMarkerElements.length = 0
    const existing = document.getElementById('subway-station-layer-styles')
    if (existing) existing.remove()
  })

  afterEach(() => {
    const existing = document.getElementById('subway-station-layer-styles')
    if (existing) existing.remove()
    createdMarkerElements.length = 0
  })

  it('renders null (no DOM output from React)', () => {
    const { container } = render(<SubwayStationLayer map={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not throw when map is null', () => {
    expect(() => render(<SubwayStationLayer map={null} />)).not.toThrow()
  })

  it('injects CSS keyframe styles when map is provided', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    const styleEl = document.getElementById('subway-station-layer-styles')
    expect(styleEl).not.toBeNull()
    expect(styleEl?.textContent).toContain('trainBounce')
    expect(styleEl?.textContent).toContain('trainWobble')
  })

  it('does not inject duplicate style tags on re-render', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    // Re-render same component; injectStyles should be idempotent
    render(<SubwayStationLayer map={mockMap as any} />)
    const styleTags = document.querySelectorAll('#subway-station-layer-styles')
    expect(styleTags).toHaveLength(1)
  })

  it('creates one marker per SUBWAY_STATIONS entry', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    expect(createdMarkerElements).toHaveLength(SUBWAY_STATIONS.length)
  })

  it('each marker element has class subway-station-marker', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    for (const el of createdMarkerElements) {
      expect(el.classList.contains('subway-station-marker')).toBe(true)
    }
  })

  it('each marker has correct --line-color CSS variable', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    for (let i = 0; i < createdMarkerElements.length; i++) {
      const station = SUBWAY_STATIONS[i]
      const expectedColor = SUBWAY_LINE_COLORS[station.lines[0]] ?? '#666666'
      expect(createdMarkerElements[i].style.getPropertyValue('--line-color')).toBe(expectedColor)
    }
  })

  it('each marker contains train-body with two windows and a line-badge', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    for (const el of createdMarkerElements) {
      expect(el.querySelector('.train-body')).not.toBeNull()
      expect(el.querySelector('.line-badge')).not.toBeNull()
      expect(el.querySelectorAll('.train-window')).toHaveLength(2)
    }
  })

  it('tooltip contains station name', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    for (let i = 0; i < createdMarkerElements.length; i++) {
      const station = SUBWAY_STATIONS[i]
      const tooltip = createdMarkerElements[i].querySelector('.station-tooltip')
      expect(tooltip).not.toBeNull()
      expect(tooltip?.textContent).toContain(station.name)
    }
  })

  it('line-badge shows primary line number', () => {
    render(<SubwayStationLayer map={mockMap as any} />)
    for (let i = 0; i < createdMarkerElements.length; i++) {
      const station = SUBWAY_STATIONS[i]
      const badge = createdMarkerElements[i].querySelector('.line-badge')
      expect(badge?.textContent).toBe(String(station.lines[0]))
    }
  })

  it('no markers are created when map is null', () => {
    render(<SubwayStationLayer map={null} />)
    expect(createdMarkerElements).toHaveLength(0)
  })
})
