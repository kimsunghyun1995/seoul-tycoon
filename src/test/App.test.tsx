import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

// Mock MapLibre GL - no WebGL in jsdom
vi.mock('maplibre-gl', () => {
  class MockMap {
    on() {}
    remove() {}
    project() { return { x: 0, y: 0 } }
    flyTo() {}
  }
  return { default: { Map: MockMap } }
})

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

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
})
