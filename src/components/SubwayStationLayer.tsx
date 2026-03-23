import { useEffect, useRef } from 'react'
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl'
import { SUBWAY_STATIONS } from '../services/SubwayStationRegistry'

export const SUBWAY_LINE_COLORS: Record<number, string> = {
  1: '#0052A4', // Dark blue
  2: '#00A84D', // Green
  3: '#EF7C1C', // Orange
  4: '#00A5DE', // Light blue
  5: '#996CAC', // Purple
  6: '#CD7C2F', // Brown
  7: '#747F00', // Olive
  8: '#E6186C', // Pink
  9: '#BDB092', // Gold/beige
}

const STYLE_ID = 'subway-station-layer-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes trainBounce {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-2px); }
    }
    @keyframes trainWobble {
      0%, 100% { transform: rotate(0deg) translateY(0px); }
      25% { transform: rotate(-2deg) translateY(-1px); }
      75% { transform: rotate(2deg) translateY(-1px); }
    }

    .subway-station-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
    }

    .subway-station-marker .train-wrapper {
      animation: trainBounce 2s ease-in-out infinite;
    }

    .subway-station-marker:hover .train-wrapper {
      animation: trainWobble 0.5s ease-in-out infinite;
      transform: scale(1.2);
    }

    .subway-station-marker .train-body {
      width: 28px;
      height: 20px;
      background-color: var(--line-color, #0052A4);
      border-radius: 5px 5px 3px 3px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 3px 4px;
      box-sizing: border-box;
      position: relative;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
    }

    .subway-station-marker .train-body::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 4px;
      right: 4px;
      height: 3px;
      background: rgba(0,0,0,0.25);
      border-radius: 0 0 3px 3px;
    }

    .subway-station-marker .train-window {
      width: 7px;
      height: 8px;
      background: rgba(255,255,255,0.88);
      border-radius: 2px;
      flex-shrink: 0;
    }

    .subway-station-marker .line-badge {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: var(--line-color, #0052A4);
      color: white;
      font-size: 8px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.6);
      line-height: 1;
    }

    .subway-station-marker .station-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #333;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      padding: 3px 6px;
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
      border: 4px solid transparent;
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

  useEffect(() => {
    if (!map) return

    injectStyles()

    for (const station of SUBWAY_STATIONS) {
      const primaryLine = station.lines[0] ?? 1
      const lineColor = SUBWAY_LINE_COLORS[primaryLine] ?? '#666666'

      const el = document.createElement('div')
      el.className = 'subway-station-marker'
      el.style.setProperty('--line-color', lineColor)

      // Tooltip
      const tooltip = document.createElement('div')
      tooltip.className = 'station-tooltip'
      tooltip.textContent = `${station.name} (${station.lines.map(l => `${l}호선`).join(', ')})`

      // Train wrapper (holds the bouncing animation)
      const trainWrapper = document.createElement('div')
      trainWrapper.className = 'train-wrapper'

      // Train body
      const trainBody = document.createElement('div')
      trainBody.className = 'train-body'

      const window1 = document.createElement('div')
      window1.className = 'train-window'

      const window2 = document.createElement('div')
      window2.className = 'train-window'

      trainBody.appendChild(window1)
      trainBody.appendChild(window2)
      trainWrapper.appendChild(trainBody)

      // Line badge
      const lineBadge = document.createElement('div')
      lineBadge.className = 'line-badge'
      lineBadge.textContent = String(primaryLine)

      el.appendChild(tooltip)
      el.appendChild(trainWrapper)
      el.appendChild(lineBadge)

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([station.lng, station.lat])
        .addTo(map)

      markersRef.current.push(marker)
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
