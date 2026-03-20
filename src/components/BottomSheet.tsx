import type { AreaData, CongestionLevel } from '../types'

const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  '여유': '#4caf50',
  '보통': '#ffc107',
  '약간 붐빔': '#ff9800',
  '붐빔': '#f44336',
}

const CONGESTION_BG: Record<CongestionLevel, string> = {
  '여유': '#e8f5e9',
  '보통': '#fff8e1',
  '약간 붐빔': '#fff3e0',
  '붐빔': '#ffebee',
}

const AGE_LABELS = ['0대', '10대', '20대', '30대', '40대', '50대', '60대', '70대+']

interface AgeBarProps {
  rates: number[]
}

function AgeBar({ rates }: AgeBarProps) {
  const max = Math.max(...rates, 1)
  return (
    <div data-testid="age-bar" className="flex gap-1 items-end h-12">
      {rates.map((rate, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div
            style={{
              height: `${(rate / max) * 40}px`,
              background: `hsl(${120 + i * 20}, 60%, 65%)`,
              borderRadius: '2px 2px 0 0',
              width: '100%',
            }}
          />
          <span className="text-xs text-gray-500 mt-0.5" style={{ fontSize: '8px' }}>
            {AGE_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

interface GenderBarProps {
  maleRate: number
  femaleRate: number
}

function GenderBar({ maleRate, femaleRate }: GenderBarProps) {
  return (
    <div data-testid="gender-bar" className="flex rounded-full overflow-hidden h-4">
      <div
        style={{ width: `${maleRate}%`, background: '#64b5f6' }}
        title={`남성 ${maleRate.toFixed(1)}%`}
      />
      <div
        style={{ width: `${femaleRate}%`, background: '#f48fb1' }}
        title={`여성 ${femaleRate.toFixed(1)}%`}
      />
    </div>
  )
}

interface BottomSheetProps {
  areaData: AreaData | null
  onDismiss: () => void
}

export default function BottomSheet({ areaData, onDismiss }: BottomSheetProps) {
  const isVisible = areaData !== null
  const pop = areaData?.population ?? null
  const congestion = pop?.areaCongestLvl ?? '여유'
  const congestionColor = CONGESTION_COLOR[congestion]
  const congestionBg = CONGESTION_BG[congestion]

  const ageRates = pop
    ? [
        pop.ageGroup.rate0,
        pop.ageGroup.rate10,
        pop.ageGroup.rate20,
        pop.ageGroup.rate30,
        pop.ageGroup.rate40,
        pop.ageGroup.rate50,
        pop.ageGroup.rate60,
        pop.ageGroup.rate70,
      ]
    : []

  return (
    <>
      {/* Backdrop tap to dismiss */}
      {isVisible && (
        <div
          data-testid="bottom-sheet-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 19,
          }}
          onClick={onDismiss}
        />
      )}

      <div
        data-testid="bottom-sheet"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          transform: isVisible ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          background: 'white',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          padding: '20px 20px 32px',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 40,
            height: 4,
            background: '#e0e0e0',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        {areaData && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800" data-testid="area-name">
                {areaData.areaName}
              </h2>
              <span
                data-testid="congestion-badge"
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: congestionBg, color: congestionColor }}
              >
                {congestion}
              </span>
            </div>

            {pop ? (
              <>
                {/* Population estimate */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: '#f5f5f5' }}>
                  <p className="text-xs text-gray-500 mb-1">예상 인구</p>
                  <p data-testid="population-range" className="text-lg font-bold text-gray-700">
                    {pop.areaPopMin.toLocaleString()} ~ {pop.areaPopMax.toLocaleString()}명
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{pop.areaCongestMsg}</p>
                </div>

                {/* Gender ratio */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>성별 비율</span>
                    <span>
                      <span style={{ color: '#64b5f6' }}>남 {pop.malePopRate.toFixed(1)}%</span>
                      {' / '}
                      <span style={{ color: '#f48fb1' }}>여 {pop.femalePopRate.toFixed(1)}%</span>
                    </span>
                  </div>
                  <GenderBar maleRate={pop.malePopRate} femaleRate={pop.femalePopRate} />
                </div>

                {/* Age distribution */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">연령대 분포</p>
                  <AgeBar rates={ageRates} />
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">데이터 없음</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
