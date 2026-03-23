import type { AreaData, CulturalEvent, SubwayStation, SubwayArrivalInfo } from '../types'
import { CONGESTION_COLOR, CONGESTION_BG } from '../constants/colors'

const LINE_COLORS: Record<number, string> = {
  1: '#0052A4', 2: '#00A84D', 3: '#EF7C1C', 4: '#00A5DE',
  5: '#996CAC', 6: '#CD7C2F', 7: '#747F00', 8: '#E6186C', 9: '#BDB092',
}

interface SubwayStationCardProps {
  station: SubwayStation
  arrivals: SubwayArrivalInfo[]
}

function SubwayStationCard({ station, arrivals }: SubwayStationCardProps) {
  const walkMinutes = Math.round(
    Math.sqrt(
      Math.pow((station.lat - 0) * 111000, 2) + Math.pow((station.lng - 0) * 88000, 2)
    ) / 80
  )
  const hasMultipleLines = station.lines.length > 1

  return (
    <div
      data-testid="subway-station-card"
      className="p-2 rounded-lg text-sm mb-2"
      style={{ background: '#f8f9fa' }}
    >
      <div className="flex items-center gap-1 mb-1">
        {/* Line badges */}
        <div className="flex gap-1">
          {station.lines.map(line => (
            <span
              key={line}
              style={{
                background: LINE_COLORS[line] ?? '#888',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {line}
            </span>
          ))}
        </div>
        {/* Station name */}
        <span className="font-medium text-gray-800">{station.name}</span>
        {station.nameEn && (
          <span className="text-xs text-gray-400">{station.nameEn}</span>
        )}
        {hasMultipleLines && (
          <span
            className="text-xs px-1 rounded"
            style={{ background: '#e8f4fd', color: '#1976d2', marginLeft: 'auto' }}
          >
            환승 Transfer
          </span>
        )}
      </div>
      {/* Arrivals */}
      {arrivals.length > 0 ? (
        <div className="flex flex-col gap-0.5 mt-1">
          {arrivals.map((arrival, idx) => (
            <div
              key={idx}
              data-testid="subway-arrival-row"
              className="flex items-center gap-1 text-xs"
            >
              <span className="text-gray-500">{arrival.direction ?? arrival.destination}</span>
              <span
                style={{
                  color: (arrival.arrivalSeconds ?? 999) < 60 ? '#e53935' : '#1565c0',
                  fontWeight: (arrival.arrivalSeconds ?? 999) < 60 ? 'bold' : 'normal',
                }}
              >
                {arrival.arrivalMessage}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">도보 근처</p>
      )}
    </div>
  )
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
  events?: CulturalEvent[]
  nearbyStations?: SubwayStation[]
  subwayArrivals?: Map<string, SubwayArrivalInfo[]>
  subwayLoading?: boolean
}

export default function BottomSheet({ areaData, onDismiss, events = [], nearbyStations, subwayArrivals, subwayLoading }: BottomSheetProps) {
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

            {/* Events section - only if there are events */}
            {events.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #eee' }}>
                <p className="text-sm font-bold text-gray-700 mb-2" data-testid="events-section-title">
                  📅 진행 중인 행사 ({events.length})
                </p>
                <div className="flex flex-col gap-2">
                  {events.map((event, idx) => (
                    <div
                      key={idx}
                      data-testid="bottom-sheet-event"
                      className="p-2 rounded-lg text-sm"
                      style={{ background: '#f8f9fa' }}
                    >
                      <p className="font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.place}</p>
                      {event.orgLink && (
                        <a
                          href={event.orgLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 mt-0.5 inline-block"
                        >
                          상세보기 →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subway section */}
            {(nearbyStations?.length ?? 0) > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #eee' }}>
                <p className="text-sm font-bold text-gray-700 mb-2" data-testid="subway-section-title">
                  🚇 Nearby Stations · 가까운 역
                </p>
                {subwayLoading && <p className="text-xs text-gray-400">도착 정보 불러오는 중...</p>}
                {nearbyStations!.map(station => {
                  const arrivals = subwayArrivals?.get(station.id) ?? []
                  return <SubwayStationCard key={station.id} station={station} arrivals={arrivals} />
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
