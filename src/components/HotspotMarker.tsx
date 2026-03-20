import type { CongestionLevel, Location } from '../types'
import { CONGESTION_COLOR } from '../constants/colors'

interface HotspotMarkerProps {
  location: Location
  congestionLevel?: CongestionLevel
  isSelected?: boolean
  onClick?: (code: string) => void
}

export default function HotspotMarker({
  location,
  congestionLevel = '여유',
  isSelected = false,
  onClick,
}: HotspotMarkerProps) {
  const color = CONGESTION_COLOR[congestionLevel]

  return (
    <g
      data-testid={`marker-${location.code}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(location.code)}
    >
      {/* Outer pulse ring */}
      <circle
        cx={location.x}
        cy={location.y}
        r={isSelected ? 14 : 10}
        fill={color}
        opacity={0.25}
      >
        <animate
          attributeName="r"
          values={isSelected ? '12;18;12' : '8;14;8'}
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.4;0.1;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Inner solid dot */}
      <circle
        cx={location.x}
        cy={location.y}
        r={isSelected ? 6 : 4}
        fill={color}
        stroke="white"
        strokeWidth={isSelected ? 2 : 1.5}
      />

      {/* Label */}
      <text
        x={location.x}
        y={location.y - 12}
        textAnchor="middle"
        fontSize={isSelected ? '9' : '7.5'}
        fontWeight={isSelected ? '700' : '500'}
        fill="#2d5a27"
        stroke="white"
        strokeWidth="2.5"
        paintOrder="stroke"
        opacity="0.95"
      >
        {location.name}
      </text>
    </g>
  )
}

interface HotspotLayerProps {
  locations: Location[]
  congestionMap?: Map<string, CongestionLevel>
  selectedCode?: string | null
  onSelect?: (code: string) => void
}

export function HotspotLayer({
  locations,
  congestionMap = new Map(),
  selectedCode = null,
  onSelect,
}: HotspotLayerProps) {
  return (
    <g data-testid="hotspot-layer">
      {locations.map(loc => (
        <HotspotMarker
          key={loc.code}
          location={loc}
          congestionLevel={congestionMap.get(loc.code)}
          isSelected={loc.code === selectedCode}
          onClick={onSelect}
        />
      ))}
    </g>
  )
}
