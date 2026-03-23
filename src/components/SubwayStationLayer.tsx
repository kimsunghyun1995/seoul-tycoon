import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl'
import { SUBWAY_STATIONS, SUBWAY_ROUTE_LINES } from '../services/SubwayStationRegistry'

export const SUBWAY_LINE_COLORS: Record<number, string> = {
  1: '#0052A4',
  2: '#00A84D',
  3: '#EF7C1C',
  4: '#00A5DE',
  5: '#996CAC',
  6: '#CD7C2F',
  7: '#747F00',
  8: '#E6186C',
  9: '#BDB092',
}

const STYLE_ID = 'subway-station-layer-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // Use 'top' instead of 'transform' for bounce to avoid conflicting with MapLibre marker transforms
  style.textContent = `
    @keyframes trainBounce {
      0%, 100% { margin-top: 0; }
      50% { margin-top: -2px; }
    }

    .subway-station-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }

    .subway-station-marker .train-wrapper {
      animation: trainBounce 2s ease-in-out infinite;
    }

    .subway-station-marker:hover .train-wrapper {
      animation: none;
    }

    .subway-station-marker:hover .train-body {
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
    }

    .subway-station-marker .train-body {
      width: 24px;
      height: 16px;
      background-color: var(--line-color, #0052A4);
      border-radius: 4px 4px 2px 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 2px 3px;
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      border: 1.5px solid rgba(255,255,255,0.7);
    }

    .subway-station-marker .train-window {
      width: 5px;
      height: 6px;
      background: rgba(255,255,255,0.85);
      border-radius: 1.5px;
      flex-shrink: 0;
    }

    .subway-station-marker .line-badge {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background-color: var(--line-color, #0052A4);
      color: white;
      font-size: 7px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      border: 1.5px solid white;
      line-height: 1;
    }

    .subway-station-marker .station-tooltip {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #333;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      padding: 2px 6px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10;
    }

    .subway-station-marker .station-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 3px solid transparent;
      border-top-color: white;
    }

    .subway-station-marker:hover .station-tooltip {
      opacity: 1;
    }
  `
  document.head.appendChild(style)
}

interface SubwayStationLayerProps {
  map: MaplibreMap | null
}

export default function SubwayStationLayer({ map }: SubwayStationLayerProps) {
  const markersRef = useRef<maplibregl.Marker[]>([])
  const routeAddedRef = useRef(false)

  // Add route lines between stations
  useEffect(() => {
    if (!map) return
    routeAddedRef.current = false

    const addLines = () => {
      if (routeAddedRef.current) return
      try {
        if (map.getSource('subway-routes')) return
      } catch { return }

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: SUBWAY_ROUTE_LINES.map(route => ({
          type: 'Feature' as const,
          properties: { lineNumber: route.lineNumber, color: route.color },
          geometry: {
            type: 'LineString' as const,
            coordinates: route.coordinates.map(([lat, lng]) => [lng, lat]),
          },
        })),
      }

      try {
        map.addSource('subway-routes', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'subway-routes-line',
          type: 'line',
          source: 'subway-routes',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3,
            'line-opacity': 0.6,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          minzoom: 11,
        })
        routeAddedRef.current = true
      } catch {
        // Style may not be ready yet
      }
    }

    // Try immediately, on load, and on styledata
    if (map.isStyleLoaded()) {
      addLines()
    }
    map.on('load', addLines)
    map.on('styledata', addLines)

    return () => {
      map.off('load', addLines)
      map.off('styledata', addLines)
      try {
        if (map.getLayer('subway-routes-line')) map.removeLayer('subway-routes-line')
        if (map.getSource('subway-routes')) map.removeSource('subway-routes')
      } catch {
        // Map may already be destroyed
      }
    }
  }, [map])

  // Create station markers
  useEffect(() => {
    if (!map) return

    injectStyles()

    for (const station of SUBWAY_STATIONS) {
      const primaryLine = station.lines[0] ?? 1
      const lineColor = SUBWAY_LINE_COLORS[primaryLine] ?? '#666666'

      const el = document.createElement('div')
      el.className = 'subway-station-marker'
      el.style.setProperty('--line-color', lineColor)

      const tooltip = document.createElement('div')
      tooltip.className = 'station-tooltip'
      tooltip.textContent = `${station.name} (${station.lines.map(l => `${l}호선`).join(', ')})`

      const trainWrapper = document.createElement('div')
      trainWrapper.className = 'train-wrapper'

      const trainBody = document.createElement('div')
      trainBody.className = 'train-body'

      const w1 = document.createElement('div')
      w1.className = 'train-window'
      const w2 = document.createElement('div')
      w2.className = 'train-window'

      trainBody.appendChild(w1)
      trainBody.appendChild(w2)
      trainWrapper.appendChild(trainBody)

      const lineBadge = document.createElement('div')
      lineBadge.className = 'line-badge'
      lineBadge.textContent = String(primaryLine)

      el.appendChild(tooltip)
      el.appendChild(trainWrapper)
      el.appendChild(lineBadge)

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([station.lng, station.lat])
        .addTo(map)

      markersRef.current.push(marker)
    }

    return () => {
      for (const m of markersRef.current) m.remove()
      markersRef.current = []
    }
  }, [map])

  // Zoom-dependent visibility
  useEffect(() => {
    if (!map) return

    const update = () => {
      const zoom = map.getZoom()
      const show = zoom >= 12
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
