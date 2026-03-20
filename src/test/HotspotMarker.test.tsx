import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HotspotMarker, { HotspotLayer } from '../components/HotspotMarker'
import { LOCATIONS } from '../services/LocationRegistry'
import type { CongestionLevel, Location } from '../types'

const mockLocation: Location = { code: 'POI001', name: '경복궁', x: 300, y: 200 }

describe('HotspotMarker', () => {
  it('renders a marker with label', () => {
    render(
      <svg>
        <HotspotMarker location={mockLocation} />
      </svg>
    )
    expect(screen.getByText('경복궁')).toBeInTheDocument()
  })

  it('calls onClick with code when clicked', () => {
    const handler = vi.fn()
    render(
      <svg>
        <HotspotMarker location={mockLocation} onClick={handler} />
      </svg>
    )
    fireEvent.click(screen.getByTestId('marker-POI001'))
    expect(handler).toHaveBeenCalledWith('POI001')
  })

  it.each<[CongestionLevel, string]>([
    ['여유', '#4caf50'],
    ['보통', '#ffc107'],
    ['약간붐빔', '#ff9800'],
    ['붐빔', '#f44336'],
  ])('renders correct color for %s', (level, color) => {
    const { container } = render(
      <svg>
        <HotspotMarker location={mockLocation} congestionLevel={level} />
      </svg>
    )
    const circles = container.querySelectorAll('circle')
    // inner dot is last circle
    const innerDot = circles[circles.length - 1]
    expect(innerDot.getAttribute('fill')).toBe(color)
  })

  it('applies selected styles when isSelected=true', () => {
    const { container } = render(
      <svg>
        <HotspotMarker location={mockLocation} isSelected={true} />
      </svg>
    )
    const circles = container.querySelectorAll('circle')
    const innerDot = circles[circles.length - 1]
    expect(innerDot.getAttribute('r')).toBe('6')
  })
})

describe('HotspotLayer', () => {
  it('renders all 122 markers', () => {
    render(
      <svg>
        <HotspotLayer locations={LOCATIONS} />
      </svg>
    )
    expect(screen.getByTestId('hotspot-layer')).toBeInTheDocument()
    expect(screen.getAllByText(/./)).toBeDefined()
    // Check a few known locations
    expect(screen.getByText('경복궁')).toBeInTheDocument()
    expect(screen.getByText('강남역')).toBeInTheDocument()
  })

  it('highlights selected marker', () => {
    render(
      <svg>
        <HotspotLayer locations={[mockLocation]} selectedCode="POI001" />
      </svg>
    )
    const { container } = render(
      <svg>
        <HotspotMarker location={mockLocation} isSelected={true} />
      </svg>
    )
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('calls onSelect when marker clicked', () => {
    const handler = vi.fn()
    render(
      <svg>
        <HotspotLayer locations={[mockLocation]} onSelect={handler} />
      </svg>
    )
    fireEvent.click(screen.getByTestId('marker-POI001'))
    expect(handler).toHaveBeenCalledWith('POI001')
  })
})
