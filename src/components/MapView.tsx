import { useEffect, useRef } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import seoulBoundary from '../assets/seoul-boundary.json'

// Use the proven OpenFreeMap liberty style directly - it works out of the box
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

interface MapViewProps {
  mapRef?: React.MutableRefObject<Map | null>
  onMapLoaded?: (map: Map) => void
}

export default function MapView({ mapRef, onMapLoaded }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onMapLoadedRef = useRef(onMapLoaded)
  onMapLoadedRef.current = onMapLoaded

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [126.978, 37.5665],
      zoom: 9,
      minZoom: 9,
      maxZoom: 18,
    })

    if (mapRef) mapRef.current = map

    // Add navigation control (zoom +/-, compass)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

    map.on('load', () => {
      // Fly-in animation from zoom 9 to 11 over 2 seconds
      map.flyTo({ center: [126.978, 37.5665], zoom: 11, duration: 2000, essential: true })

      // Seoul boundary outline layer
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
  }, [mapRef])

  return (
    <div
      data-testid="map-container"
      ref={containerRef}
      className="absolute inset-0"
    />
  )
}
