import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl'

interface Landmark {
  name: string
  lng: number
  lat: number
  icon: string
}

const LANDMARKS: Landmark[] = [
  { name: '경복궁', lng: 126.977, lat: 37.579, icon: '🏯' },
  { name: '남산타워', lng: 126.988, lat: 37.551, icon: '🗼' },
  { name: '롯데월드타워', lng: 127.103, lat: 37.513, icon: '🏢' },
  { name: '63빌딩', lng: 126.940, lat: 37.520, icon: '🏛️' },
  { name: 'DDP', lng: 127.009, lat: 37.567, icon: '🏟️' },
  { name: '코엑스', lng: 127.059, lat: 37.512, icon: '🏬' },
  { name: '김포공항', lng: 126.801, lat: 37.559, icon: '✈️' },
  { name: '올림픽공원', lng: 127.122, lat: 37.521, icon: '🏅' },
  { name: '월드컵경기장', lng: 126.897, lat: 37.568, icon: '⚽' },
  { name: '국회의사당', lng: 126.918, lat: 37.532, icon: '🏛️' },
]

interface LandmarkLayerProps {
  map: MaplibreMap | null
}

export default function LandmarkLayer({ map }: LandmarkLayerProps) {
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!map) return

    const addMarkers = () => {
      for (const landmark of LANDMARKS) {
        const el = document.createElement('div')
        el.style.cssText = [
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'pointer-events:none',
          'user-select:none',
        ].join(';')

        const iconEl = document.createElement('div')
        iconEl.textContent = landmark.icon
        iconEl.style.cssText = 'font-size:24px;line-height:1;'

        const labelEl = document.createElement('div')
        labelEl.textContent = landmark.name
        labelEl.style.cssText = [
          'font-size:10px',
          'font-weight:600',
          'color:#333',
          'text-shadow:0 0 3px white,0 0 3px white,0 0 3px white',
          'white-space:nowrap',
          'margin-top:1px',
        ].join(';')

        el.appendChild(iconEl)
        el.appendChild(labelEl)

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([landmark.lng, landmark.lat])
          .addTo(map)

        markersRef.current.push(marker)
      }
    }

    if (map.isStyleLoaded()) {
      addMarkers()
    } else {
      map.once('load', addMarkers)
    }

    return () => {
      for (const marker of markersRef.current) {
        marker.remove()
      }
      markersRef.current = []
    }
  }, [map])

  return null
}
