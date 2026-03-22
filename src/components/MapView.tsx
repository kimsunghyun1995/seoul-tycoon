import { useEffect, useRef } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapStyle from '../assets/map-style.json'

interface MapViewProps {
  mapRef?: React.MutableRefObject<Map | null>
}

export default function MapView({ mapRef }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: mapStyle as any,
      center: [126.978, 37.5665],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
    })

    if (mapRef) mapRef.current = map

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
