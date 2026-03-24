import type { HotRestaurant } from '../types'

interface RestaurantCardProps {
  restaurant: HotRestaurant
  onClose: () => void
}

export default function RestaurantCard({ restaurant, onClose }: RestaurantCardProps) {
  const googleMapsUrl = restaurant.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`

  const rating = restaurant.google_rating != null
    ? `${restaurant.google_rating.toFixed(1)}`
    : null

  return (
    <div
      data-testid="restaurant-card"
      style={{
        position: 'absolute',
        bottom: 280,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        width: 'min(360px, calc(100vw - 32px))',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: '#111',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {restaurant.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            fontSize: 13,
            fontWeight: 600,
            padding: '2px 0 2px 12px',
            flexShrink: 0,
          }}
          aria-label="닫기"
        >
          ✕ 닫기
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Rating row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 8,
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13 }}>⭐</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
              {rating ?? '--'}
            </span>
            <span style={{ color: '#888', fontSize: 12 }}>
              ({restaurant.google_review_count} reviews)
            </span>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: '#4285F4',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Google Maps ↗
          </a>
        </div>

        {/* Social mentions */}
        <div
          style={{
            paddingBottom: 8,
            borderBottom: '1px solid #f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>📸</span>
            <span style={{ fontSize: 13, color: '#444' }}>Instagram</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E1306C', marginLeft: 'auto' }}>
              {restaurant.instagram_mentions} mentions
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>💬</span>
            <span style={{ fontSize: 13, color: '#444' }}>Threads</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#000', marginLeft: 'auto' }}>
              {restaurant.threads_mentions} mentions
            </span>
          </div>
        </div>

        {/* Address & category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📍</span>
            <span style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>
              {restaurant.address}
            </span>
          </div>
          {(restaurant.category != null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>🏷️</span>
              <span style={{ fontSize: 12, color: '#666' }}>
                {restaurant.category} · 요즘 핫한 맛집
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
