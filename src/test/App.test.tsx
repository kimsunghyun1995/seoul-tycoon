import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

// Mock PixiJS - no WebGL in jsdom
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
  return { Application: MockApplication, Graphics: MockGraphics, Container: MockContainer, Ticker: MockTicker }
})

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ CITYDATA: {} }),
    }))
  })

  it('renders the map SVG', () => {
    render(<App />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('shows loading overlay on initial render', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('loading-overlay')).toBeInTheDocument()
  })
})
