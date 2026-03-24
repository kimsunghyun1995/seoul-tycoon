import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl'
import type { HotRestaurant } from '../types'

const STYLE_ID = 'restaurant-layer-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes restaurantPulse {
      0%, 100% { transform: scale(1.0); }
      50% { transform: scale(1.05); }
    }

    .restaurant-marker {
      position: relative;
      width: 28px;
      height: 28px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      animation: restaurantPulse 2.5s ease-in-out infinite;
    }

    .restaurant-marker:hover {
      animation: none;
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(255, 100, 0, 0.4);
      z-index: 10;
    }

    .restaurant-marker .fire-icon {
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .restaurant-marker .restaurant-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #333;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      padding: 3px 7px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10;
    }

    .restaurant-marker .restaurant-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 3px solid transparent;
      border-top-color: white;
    }

    .restaurant-marker:hover .restaurant-tooltip {
      opacity: 1;
    }
  `
  document.head.appendChild(style)
}

interface RestaurantLayerProps {
  map: MaplibreMap | null
  restaurants: HotRestaurant[]
  onSelect: (restaurant: HotRestaurant) => void
}

export default function RestaurantLayer({ map, restaurants, onSelect }: RestaurantLayerProps) {
  const markersRef = useRef<maplibregl.Marker[]>([])

  // Create/recreate markers when map or restaurants change
  useEffect(() => {
    if (!map) return

    injectStyles()

    // Remove old markers
    for (const m of markersRef.current) m.remove()
    markersRef.current = []

    for (const restaurant of restaurants) {
      const el = document.createElement('div')
      el.className = 'restaurant-marker'
      el.setAttribute('data-testid', 'restaurant-marker')

      const fireIcon = document.createElement('div')
      fireIcon.className = 'fire-icon'
      fireIcon.textContent = restaurant.emoji || '🍽️'

      const tooltip = document.createElement('div')
      tooltip.className = 'restaurant-tooltip'
      const rating = restaurant.google_rating != null
        ? `⭐${restaurant.google_rating.toFixed(1)} (${restaurant.google_review_count})`
        : ''
      tooltip.textContent = rating
        ? `${restaurant.name} ${rating}`
        : restaurant.name

      el.appendChild(fireIcon)
      el.appendChild(tooltip)

      el.addEventListener('click', () => onSelect(restaurant))

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([restaurant.lng, restaurant.lat])
        .addTo(map)

      markersRef.current.push(marker)
    }

    return () => {
      for (const m of markersRef.current) m.remove()
      markersRef.current = []
    }
  }, [map, restaurants, onSelect])

  // Zoom-dependent visibility (only show at zoom >= 13)
  useEffect(() => {
    if (!map) return

    const update = () => {
      const zoom = map.getZoom()
      const show = zoom >= 13
      markersRef.current.forEach(m => {
        m.getElement().style.display = show ? '' : 'none'
      })
    }

    map.on('zoom', update)
    update()
    return () => { map.off('zoom', update) }
  }, [map])

  return null
}
