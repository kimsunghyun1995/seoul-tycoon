interface RankingToggleProps {
  onClick: () => void
  busyCount: number
}

export default function RankingToggle({ onClick, busyCount }: RankingToggleProps) {
  return (
    <button
      data-testid="ranking-toggle"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        zIndex: 15,
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg, #ff9800, #f57c00)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'scale(1.1)'
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'scale(1)'
        el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)'
      }}
      aria-label="혼잡 순위 보기"
    >
      🏆

      {/* Busy count badge */}
      {busyCount > 0 && (
        <span
          data-testid="ranking-toggle-badge"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#f44336',
            color: 'white',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
          }}
        >
          {busyCount}
        </span>
      )}
    </button>
  )
}
