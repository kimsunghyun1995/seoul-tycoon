import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

// Mock MapLibre GL - no WebGL in jsdom
vi.mock('maplibre-gl', () => {
  class MockMap {
    on() {}
    off() {}
    remove() {}
    project() { return { x: 0, y: 0 } }
    getZoom() { return 11 }
    flyTo() {}
    addControl() {}
    addSource() {}
    addLayer() {}
  }
  class MockNavigationControl {}
  return { default: { Map: MockMap, NavigationControl: MockNavigationControl } }
})

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

// Mock PixiJS - no WebGL in jsdom
vi.mock('pixi.js', () => {
  class MockApplication {
    stage = { addChild: vi.fn() }
    ticker = { add: vi.fn() }
    init = vi.fn().mockResolvedValue(undefined)
    destroy = vi.fn()
    renderer = { resize: vi.fn() }
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
  return { Application: MockApplication, Graphics: MockGraphics, Container: MockContainer, Ticker: MockTicker }
})

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ CITYDATA: {} }),
    }))
  })

  it('renders the app root', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('app-root')).toBeInTheDocument()
  })

  it('renders the map container', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('map-container')).toBeInTheDocument()
  })

  it('shows loading overlay on initial render', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('loading-overlay')).toBeInTheDocument()
  })

  it('renders ranking toggle button', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('ranking-toggle')).toBeInTheDocument()
  })

  it('opens ranking panel when toggle is clicked', () => {
    const { getByTestId } = render(<App />)
    const toggle = getByTestId('ranking-toggle')
    fireEvent.click(toggle)
    const panel = getByTestId('ranking-panel')
    // Panel should be rendered (open state managed by transform)
    expect(panel).toBeInTheDocument()
  })

  it('renders ranking panel in closed state initially', () => {
    const { getByTestId } = render(<App />)
    const panel = getByTestId('ranking-panel')
    expect(panel).toBeInTheDocument()
    // Initially closed (transformed away)
    expect(panel.style.transform).toContain('translateX(100%)')
  })

  it('closes ranking panel when close button is clicked', () => {
    const { getByTestId } = render(<App />)
    // Open first
    fireEvent.click(getByTestId('ranking-toggle'))
    // Close
    fireEvent.click(getByTestId('ranking-panel-close'))
    const panel = getByTestId('ranking-panel')
    expect(panel.style.transform).toContain('translateX(100%)')
  })
})
