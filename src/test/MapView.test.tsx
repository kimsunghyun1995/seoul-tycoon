import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MapView from '../components/MapView'

vi.mock('maplibre-gl', () => {
  class MockMap {
    on() {}
    remove() {}
    project() { return { x: 0, y: 0 } }
    flyTo() {}
    addControl() {}
    addSource() {}
    addLayer() {}
  }
  class MockNavigationControl {}
  return { default: { Map: MockMap, NavigationControl: MockNavigationControl } }
})

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

describe('MapView', () => {
  it('renders map container', () => {
    const { getByTestId } = render(<MapView />)
    expect(getByTestId('map-container')).toBeInTheDocument()
  })

  it('map container fills viewport', () => {
    const { getByTestId } = render(<MapView />)
    const container = getByTestId('map-container')
    expect(container).toBeInTheDocument()
    // Container has absolute positioning class
    expect(container.className).toContain('absolute')
  })
})
