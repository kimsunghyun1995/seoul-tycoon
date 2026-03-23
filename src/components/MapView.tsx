import { useEffect, useRef } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  mapRef?: React.MutableRefObject<Map | null>
  onMapLoaded?: (map: Map) => void
}

export default function MapView({ mapRef, onMapLoaded }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const onMapLoadedRef = useRef(onMapLoaded)
  onMapLoadedRef.current = onMapLoaded

  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [126.978, 37.5665],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
    })

    mapInstanceRef.current = map
    if (mapRef) mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

    map.on('error', (e) => console.error('[MapView] Map error:', e))

    map.on('load', () => {
      console.log('[MapView] Map loaded, calling onMapLoaded')
      onMapLoadedRef.current?.(map)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      if (mapRef) mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-testid="map-container"
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  )
}
