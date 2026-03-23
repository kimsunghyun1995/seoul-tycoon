import { useState } from 'react'
import type { RankedArea } from '../types'
import { CONGESTION_COLOR, CONGESTION_BG } from '../constants/colors'
import EventCard from './EventCard'

interface RankingCardProps {
  rank: number
  area: RankedArea
  onSelect: (code: string) => void
}

export default function RankingCard({ rank, area, onSelect }: RankingCardProps) {
  const [expanded, setExpanded] = useState(false)

  const congestionColor = CONGESTION_COLOR[area.congestionLevel]
  const congestionBg = CONGESTION_BG[area.congestionLevel]
  const hasEvents = area.events.length > 0

  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32']
  const rankBg = rank <= 3 ? rankColors[rank - 1] : '#e0e0e0'

  return (
    <div
      data-testid="ranking-card"
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginBottom: '8px',
      }}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3"
        style={{ padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => onSelect(area.code)}
      >
        {/* Rank circle */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: rankBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontWeight: 700,
            fontSize: '13px',
            color: rank <= 3 ? '#333' : '#666',
          }}
        >
          #{rank}
        </div>

        {/* Area name + congestion badge */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-gray-800 text-sm"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '3px',
            }}
          >
            {area.name}
          </p>
          <span
            className="text-xs font-bold"
            style={{
              padding: '2px 8px',
              background: congestionBg,
              color: congestionColor,
              borderRadius: '999px',
            }}
          >
            {area.congestionLevel}
          </span>
        </div>

        {/* Right: population + event count */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-600">
            {area.populationAvg.toLocaleString()}명
          </span>
          {hasEvents && (
            <span
              className="text-xs font-bold"
              style={{
                padding: '1px 7px',
                background: '#fff3e0',
                color: '#e65100',
                borderRadius: '999px',
              }}
            >
              행사 {area.events.length}
            </span>
          )}
        </div>

        {/* Expand/collapse chevron */}
        {hasEvents && (
          <button
            data-testid="ranking-card-expand"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => !prev)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#999',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={expanded ? '접기' : '펼치기'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded event list */}
      {expanded && hasEvents && (
        <div
          style={{
            borderTop: '1px solid #f5f5f5',
            padding: '10px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {area.events.map((event, i) => (
            <EventCard key={i} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
