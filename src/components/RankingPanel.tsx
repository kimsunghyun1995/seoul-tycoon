import type { RankedArea } from '../types'
import type { SortMode } from '../hooks/useRanking'
import RankingCard from './RankingCard'

interface RankingPanelProps {
  isOpen: boolean
  onClose: () => void
  rankings: RankedArea[]
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
  onSelectArea: (code: string) => void
  loading: boolean
}

export default function RankingPanel({
  isOpen,
  onClose,
  rankings,
  sortMode,
  onSortChange,
  onSelectArea,
  loading,
}: RankingPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          data-testid="ranking-panel-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 25,
          }}
          onClick={onClose}
        />
      )}

      {/* Panel — desktop: right drawer, mobile: bottom panel */}
      <div
        data-testid="ranking-panel"
        style={{
          position: 'fixed',
          zIndex: 26,
          background: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',

          // Desktop: right side drawer
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className="ranking-panel-desktop"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid #f0f0f0',
            flexShrink: 0,
          }}
        >
          <h2 className="text-base font-bold text-gray-800">
            실시간 혼잡 순위
          </h2>

          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              data-testid="ranking-panel-sort"
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
              className="text-sm text-gray-600 font-medium"
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '4px 8px',
                background: 'white',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="congestion">혼잡도순</option>
              <option value="population">인구순</option>
              <option value="events">행사순</option>
            </select>

            {/* Close button */}
            <button
              data-testid="ranking-panel-close"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
              aria-label="닫기"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 12px 0',
          }}
        >
          {loading ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ paddingTop: '40px', color: '#999', gap: '12px' }}
            >
              {/* Spinner */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid #f0f0f0',
                  borderTop: '3px solid #1976d2',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span className="text-sm">행사 정보 불러오는 중...</span>
            </div>
          ) : (
            rankings.map((area, i) => (
              <RankingCard
                key={area.code}
                rank={i + 1}
                area={area}
                onSelect={onSelectArea}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f0f0f0',
              flexShrink: 0,
            }}
          >
            <p className="text-xs text-gray-400">총 {rankings.length}개 지역</p>
          </div>
        )}
      </div>

      {/* Mobile override via style tag */}
      <style>{`
        @media (max-width: 767px) {
          .ranking-panel-desktop {
            top: auto !important;
            right: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 85vh !important;
            border-radius: 20px 20px 0 0 !important;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15) !important;
            transform: ${isOpen ? 'translateY(0)' : 'translateY(110%)'} !important;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
