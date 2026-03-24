import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RestaurantLayer from '../components/RestaurantLayer'
import type { HotRestaurant } from '../types'

// Mock MapLibre GL
vi.mock('maplibre-gl', () => {
  class MockMarker {
    _el: HTMLElement
    constructor({ element }: { element: HTMLElement }) {
      this._el = element
    }
    setLngLat() { return this }
    addTo() { return this }
    remove() {}
    getElement() { return this._el }
  }

  return {
    default: {
      Marker: MockMarker,
    },
    Marker: MockMarker,
  }
})

const mockMap = {
  getZoom: vi.fn().mockReturnValue(14),
  on: vi.fn(),
  off: vi.fn(),
}

const mockRestaurants: HotRestaurant[] = [
  {
    id: 'r001',
    name: '맛집1',
    address: '서울특별시 강남구 123',
    lat: 37.5,
    lng: 127.0,
    google_rating: 4.3,
    google_review_count: 200,
    google_place_id: 'ChIJ_test',
    instagram_mentions: 30,
    threads_mentions: 10,
    source_urls: [],
    trending_score: 90,
    category: '양식',
    image_url: null,
    created_at: '2026-03-24T00:00:00Z', emoji: '🍜', llm_reason: null,
  },
  {
    id: 'r002',
    name: '맛집2',
    address: '서울특별시 마포구 456',
    lat: 37.55,
    lng: 126.92,
    google_rating: null,
    google_review_count: 0,
    google_place_id: null,
    instagram_mentions: 5,
    threads_mentions: 2,
    source_urls: [],
    trending_score: 60,
    category: null,
    image_url: null,
    created_at: '2026-03-24T00:00:00Z', emoji: '🍜', llm_reason: null,
  },
]

describe('RestaurantLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null (renders nothing to DOM)', () => {
    const { container } = render(
      <RestaurantLayer
        map={mockMap as any}
        restaurants={mockRestaurants}
        onSelect={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does nothing when map is null', () => {
    // Should not throw
    expect(() =>
      render(
        <RestaurantLayer
          map={null}
          restaurants={mockRestaurants}
          onSelect={vi.fn()}
        />
      )
    ).not.toThrow()
  })

  it('registers zoom event listener on map', () => {
    render(
      <RestaurantLayer
        map={mockMap as any}
        restaurants={mockRestaurants}
        onSelect={vi.fn()}
      />
    )
    expect(mockMap.on).toHaveBeenCalledWith('zoom', expect.any(Function))
  })

  it('renders with empty restaurants array', () => {
    expect(() =>
      render(
        <RestaurantLayer
          map={mockMap as any}
          restaurants={[]}
          onSelect={vi.fn()}
        />
      )
    ).not.toThrow()
  })
})
