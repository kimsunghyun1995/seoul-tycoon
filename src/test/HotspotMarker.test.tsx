import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HotspotLayer } from '../components/HotspotMarker'
import { LOCATIONS } from '../services/LocationRegistry'
import type { CongestionLevel } from '../types'

vi.mock('maplibre-gl', () => {
  class MockPopup {
    setLngLat() { return this }
    setHTML() { return this }
    addTo() { return this }
    remove() {}
  }
  return { default: { Popup: MockPopup } }
})

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

function createMockMap() {
  const layers = new Map<string, unknown>()
  const sources = new Map<string, unknown>()

  return {
    isStyleLoaded: vi.fn().mockReturnValue(true),
    addSource: vi.fn((id: string, data: unknown) => sources.set(id, data)),
    getSource: vi.fn((id: string) => sources.has(id) ? { setData: vi.fn() } : undefined),
    addLayer: vi.fn((layer: { id: string }) => layers.set(layer.id, layer)),
    getLayer: vi.fn((id: string) => layers.has(id) ? layers.get(id) : undefined),
    setPaintProperty: vi.fn(),
    getCanvas: vi.fn().mockReturnValue({ style: { cursor: '' } }),
    on: vi.fn(),
    off: vi.fn(),
    _sources: sources,
    _layers: layers,
  }
}

describe('HotspotLayer', () => {
  it('renders nothing (null)', () => {
    const { container } = render(<HotspotLayer map={null} locations={LOCATIONS} />)
    expect(container.firstChild).toBeNull()
  })

  it('adds GeoJSON source and 4 layers when map is ready', () => {
    const map = createMockMap()
    render(<HotspotLayer map={map as unknown as import('maplibre-gl').Map} locations={LOCATIONS} />)
    expect(map.addSource).toHaveBeenCalledWith('hotspots', expect.objectContaining({ type: 'geojson' }))
    expect(map.addLayer).toHaveBeenCalledTimes(4)
  })

  it('includes all 122 locations in GeoJSON source', () => {
    const map = createMockMap()
    render(<HotspotLayer map={map as unknown as import('maplibre-gl').Map} locations={LOCATIONS} />)
    const sourceData = map.addSource.mock.calls[0][1] as { data: { features: unknown[] } }
    expect(sourceData.data.features).toHaveLength(122)
  })

  it('uses correct congestion color in GeoJSON features', () => {
    const map = createMockMap()
    const congestionMap = new Map<string, CongestionLevel>([['POI001', '붐빔']])
    render(
      <HotspotLayer
        map={map as unknown as import('maplibre-gl').Map}
        locations={[LOCATIONS[0]]}
        congestionMap={congestionMap}
      />
    )
    const sourceData = map.addSource.mock.calls[0][1] as { data: { features: { properties: { color: string } }[] } }
    expect(sourceData.data.features[0].properties.color).toBe('#f44336')
  })

  it('updates paint properties when selectedCode changes', () => {
    const map = createMockMap()
    const { rerender } = render(
      <HotspotLayer map={map as unknown as import('maplibre-gl').Map} locations={LOCATIONS} />
    )
    rerender(
      <HotspotLayer
        map={map as unknown as import('maplibre-gl').Map}
        locations={LOCATIONS}
        selectedCode="POI001"
      />
    )
    expect(map.setPaintProperty).toHaveBeenCalled()
  })

  it('registers click handler on the circle layer', () => {
    const map = createMockMap()
    render(
      <HotspotLayer
        map={map as unknown as import('maplibre-gl').Map}
        locations={LOCATIONS}
        onSelect={vi.fn()}
      />
    )
    const clickRegistration = map.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'click' && call[1] === 'hotspot-circles'
    )
    expect(clickRegistration).toBeDefined()
  })

  it('calls onSelect when click handler fires with a hotspot feature', () => {
    const map = createMockMap()
    const handler = vi.fn()
    render(
      <HotspotLayer
        map={map as unknown as import('maplibre-gl').Map}
        locations={LOCATIONS}
        onSelect={handler}
      />
    )

    const clickCall = map.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'click' && call[1] === 'hotspot-circles'
    )
    const clickHandler = clickCall![2] as (e: unknown) => void

    clickHandler({
      features: [{
        properties: { code: 'POI001', name: '경복궁' },
        geometry: { type: 'Point', coordinates: [126.9769, 37.5796] },
      }],
    })

    expect(handler).toHaveBeenCalledWith('POI001')
  })

  it('does not add layers when map is null', () => {
    const map = createMockMap()
    render(<HotspotLayer map={null} locations={LOCATIONS} />)
    expect(map.addSource).not.toHaveBeenCalled()
  })
})
