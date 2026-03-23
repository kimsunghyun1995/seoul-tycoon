import type { CulturalEvent } from '../types'

interface EventCardProps {
  event: CulturalEvent
}

function formatDateRange(startDate: string, endDate: string): string {
  // Input format: "2024-03-20 00:00:00.0" or similar
  const parseDate = (d: string) => {
    const match = d.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return d
    const month = parseInt(match[2], 10)
    const day = parseInt(match[3], 10)
    return `${month}/${day}`
  }
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (start === end) return start
  return `${start} ~ ${end}`
}

export default function EventCard({ event }: EventCardProps) {
  const dateRange = formatDateRange(event.startDate, event.endDate)
  const hasFee = event.useFee && event.useFee.trim() !== '' && event.useFee !== '무료'

  return (
    <div
      data-testid="event-card"
      style={{
        background: 'white',
        borderRadius: '10px',
        padding: '12px',
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Title */}
      <p
        className="font-semibold text-gray-800 text-sm"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '6px',
        }}
        title={event.title}
      >
        {event.title}
      </p>

      {/* Category badge */}
      <span
        className="text-xs font-medium"
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          background: '#e3f2fd',
          color: '#1565c0',
          borderRadius: '999px',
          marginBottom: '6px',
        }}
      >
        {event.category}
      </span>

      {/* Date range */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        <span>📅</span>
        <span>{dateRange}</span>
      </div>

      {/* Place */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        <span>📍</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.place}
        </span>
      </div>

      {/* Fee */}
      {hasFee && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <span>💰</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.useFee}
          </span>
        </div>
      )}

      {/* Link */}
      {event.orgLink && (
        <a
          href={event.orgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium"
          style={{
            display: 'inline-block',
            marginTop: '6px',
            color: '#1976d2',
            textDecoration: 'none',
          }}
        >
          자세히 보기 →
        </a>
      )}
    </div>
  )
}
