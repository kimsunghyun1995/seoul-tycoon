import { useEffect, useRef, useState } from 'react'
import maplibregl, { type Map, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import seoulBoundary from '../assets/seoul-boundary.json'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

interface MapViewProps {
  mapRef?: React.MutableRefObject<Map | null>
  onMapLoaded?: (map: Map) => void
}

export default function MapView({ mapRef, onMapLoaded }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onMapLoadedRef = useRef(onMapLoaded)
  onMapLoadedRef.current = onMapLoaded
  const [style, setStyle] = useState<StyleSpecification | null>(null)

  // Fetch style JSON and patch for MapLibre v5 compatibility
  useEffect(() => {
    fetch(STYLE_URL)
      .then(res => res.json())
      .then((json: StyleSpecification) => {
        // Ensure projection field exists (required by MapLibre v5)
        if (!json.projection) {
          json.projection = { type: 'mercator' }
        }
        setStyle(json)
      })
      .catch(err => {
        console.error('Failed to fetch map style:', err)
        // Fallback: minimal working style
        setStyle({
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap',
            },
          },
          layers: [
            { id: 'osm', type: 'raster', source: 'osm' },
          ],
          projection: { type: 'mercator' },
        } as unknown as StyleSpecification)
      })
  }, [])

  // Initialize map once style is loaded
  useEffect(() => {
    if (!containerRef.current || !style) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [126.978, 37.5665],
      zoom: 9,
      minZoom: 9,
      maxZoom: 18,
    })

    if (mapRef) mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

    map.on('load', () => {
      map.flyTo({ center: [126.978, 37.5665], zoom: 11, duration: 2000, essential: true })

      map.addSource('seoul-boundary', {
        type: 'geojson',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: seoulBoundary as any,
      })
      map.addLayer({
        id: 'seoul-boundary-line',
        type: 'line',
        source: 'seoul-boundary',
        paint: {
          'line-color': '#ff6b6b',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.5,
        },
      })

      onMapLoadedRef.current?.(map)
    })

    return () => {
      map.remove()
      if (mapRef) mapRef.current = null
    }
  }, [mapRef, style])

  return (
    <div
      data-testid="map-container"
      ref={containerRef}
      className="absolute inset-0"
    />
  )
}
