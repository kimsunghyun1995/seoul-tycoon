import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MaplibreMap, type GeoJSONSource } from 'maplibre-gl'
import type { CongestionLevel, Location } from '../types'
import { CONGESTION_COLOR } from '../constants/colors'

const SOURCE_ID = 'hotspots'
const SHADOW_LAYER_ID = 'hotspot-shadows'
const RING_LAYER_ID = 'hotspot-rings'
const CIRCLE_LAYER_ID = 'hotspot-circles'
const LABEL_LAYER_ID = 'hotspot-labels'

interface HotspotLayerProps {
  map: MaplibreMap | null
  locations: Location[]
  congestionMap?: globalThis.Map<string, CongestionLevel>
  selectedCode?: string | null
  onSelect?: (code: string) => void
}

function buildGeoJSON(locations: Location[], congestionMap: globalThis.Map<string, CongestionLevel>) {
  return {
    type: 'FeatureCollection' as const,
    features: locations.map(loc => {
      const congestion = congestionMap.get(loc.code) ?? '여유'
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat],
        },
        properties: {
          code: loc.code,
          name: loc.name,
          color: CONGESTION_COLOR[congestion],
        },
      }
    }),
  }
}

export function HotspotLayer({
  map,
  locations,
  congestionMap = new globalThis.Map(),
  selectedCode = null,
  onSelect,
}: HotspotLayerProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null)

  // Add or update source and layers
  useEffect(() => {
    if (!map) return

    const geoJson = buildGeoJSON(locations, congestionMap)

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) {
        const source = map.getSource(SOURCE_ID) as GeoJSONSource
        source.setData(geoJson)
        return
      }

      map.addSource(SOURCE_ID, { type: 'geojson', data: geoJson })

      // Shadow layer (behind everything, slight blur effect via opacity+size)
      map.addLayer({
        id: SHADOW_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 22, 16],
          'circle-color': '#000000',
          'circle-opacity': 0.12,
          'circle-translate': [1, 2],
        },
      })

      // Outer pulse ring
      map.addLayer({
        id: RING_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 26, 20],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      })

      // Inner solid dot
      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 16, 12],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 3, 2.5],
          'circle-stroke-color': 'white',
          'circle-pitch-alignment': 'map',
        },
      })

      // Labels at higher zoom levels
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 11,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
          'text-font': ['Noto Sans Regular'],
        },
        paint: {
          'text-color': '#555',
          'text-halo-color': 'white',
          'text-halo-width': 1.5,
        },
      })
    }

    if (map.isStyleLoaded()) {
      addLayers()
    } else {
      map.on('load', addLayers)
      return () => { map.off('load', addLayers) }
    }
  }, [map, locations, congestionMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected marker size
  useEffect(() => {
    if (!map || !map.getLayer(CIRCLE_LAYER_ID)) return

    map.setPaintProperty(SHADOW_LAYER_ID, 'circle-radius',
      ['case', ['==', ['get', 'code'], selectedCode ?? ''], 22, 16])
    map.setPaintProperty(RING_LAYER_ID, 'circle-radius',
      ['case', ['==', ['get', 'code'], selectedCode ?? ''], 26, 20])
    map.setPaintProperty(CIRCLE_LAYER_ID, 'circle-radius',
      ['case', ['==', ['get', 'code'], selectedCode ?? ''], 16, 12])
    map.setPaintProperty(CIRCLE_LAYER_ID, 'circle-stroke-width',
      ['case', ['==', ['get', 'code'], selectedCode ?? ''], 3, 2.5])
  }, [map, selectedCode])

  // Click and cursor handlers
  useEffect(() => {
    if (!map) return

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const feature = e.features[0]
      const code = feature.properties?.code as string | undefined
      const name = feature.properties?.name as string | undefined
      if (!code) return

      onSelect?.(code)

      popupRef.current?.remove()
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(coords)
        .setHTML(`<div style="font-size:12px;font-weight:600;color:#333;padding:2px 4px">${name ?? code}</div>`)
        .addTo(map)
    }

    const handleMouseEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const handleMouseLeave = () => { map.getCanvas().style.cursor = '' }

    map.on('click', CIRCLE_LAYER_ID, handleClick)
    map.on('mouseenter', CIRCLE_LAYER_ID, handleMouseEnter)
    map.on('mouseleave', CIRCLE_LAYER_ID, handleMouseLeave)

    return () => {
      map.off('click', CIRCLE_LAYER_ID, handleClick)
      map.off('mouseenter', CIRCLE_LAYER_ID, handleMouseEnter)
      map.off('mouseleave', CIRCLE_LAYER_ID, handleMouseLeave)
    }
  }, [map, onSelect])

  // Cleanup popup on unmount
  useEffect(() => {
    return () => { popupRef.current?.remove() }
  }, [])

  return null
}

// Legacy default export removed — use HotspotLayer instead
export default HotspotLayer
