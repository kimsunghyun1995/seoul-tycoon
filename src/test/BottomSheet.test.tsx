import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BottomSheet from '../components/BottomSheet'
import type { AreaData, CulturalEvent, SubwayStation, SubwayArrivalInfo } from '../types'

const mockAreaData: AreaData = {
  areaCd: 'POI001',
  areaName: '경복궁',
  fetchedAt: Date.now(),
  population: {
    areaCd: 'POI001',
    areaName: '경복궁',
    areaCongestLvl: '보통',
    areaCongestMsg: '사람이 적당히 있습니다',
    areaPopMin: 30000,
    areaPopMax: 40000,
    malePopRate: 48.5,
    femalePopRate: 51.5,
    residentPopRate: 30.0,
    nonResidentPopRate: 70.0,
    ageGroup: {
      rate0: 2.0,
      rate10: 8.0,
      rate20: 25.0,
      rate30: 22.0,
      rate40: 18.0,
      rate50: 14.0,
      rate60: 8.0,
      rate70: 3.0,
    },
  },
  weather: null,
}

describe('BottomSheet', () => {
  it('is hidden when areaData is null', () => {
    render(<BottomSheet areaData={null} onDismiss={vi.fn()} />)
    const sheet = screen.getByTestId('bottom-sheet')
    expect(sheet.style.transform).toContain('translateY(110%)')
  })

  it('slides up when areaData is provided', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    const sheet = screen.getByTestId('bottom-sheet')
    expect(sheet.style.transform).toBe('translateY(0)')
  })

  it('shows area name', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('area-name')).toHaveTextContent('경복궁')
  })

  it('shows congestion level badge', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('congestion-badge')).toHaveTextContent('보통')
  })

  it('shows population range', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('population-range')).toHaveTextContent('30,000')
    expect(screen.getByTestId('population-range')).toHaveTextContent('40,000')
  })

  it('renders gender ratio bar', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('gender-bar')).toBeInTheDocument()
  })

  it('renders age distribution bar chart', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('age-bar')).toBeInTheDocument()
  })

  it('calls onDismiss when backdrop is tapped', () => {
    const onDismiss = vi.fn()
    render(<BottomSheet areaData={mockAreaData} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not show backdrop when areaData is null', () => {
    render(<BottomSheet areaData={null} onDismiss={vi.fn()} />)
    expect(screen.queryByTestId('bottom-sheet-backdrop')).not.toBeInTheDocument()
  })

  it('does not show events section when events prop is empty', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} events={[]} />)
    expect(screen.queryByTestId('events-section-title')).not.toBeInTheDocument()
  })

  it('shows events section when events are provided', () => {
    const mockEvents: CulturalEvent[] = [
      {
        title: '경복궁 야간 개장',
        category: '문화행사',
        place: '경복궁',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        lat: 37.577,
        lng: 126.977,
        guName: '종로구',
        orgLink: 'https://example.com',
        mainImg: '',
        useFee: '무료',
      },
    ]
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} events={mockEvents} />)
    expect(screen.getByTestId('events-section-title')).toHaveTextContent('진행 중인 행사 (1)')
    expect(screen.getByTestId('bottom-sheet-event')).toBeInTheDocument()
    expect(screen.getByText('경복궁 야간 개장')).toBeInTheDocument()
  })

  it('shows multiple events when provided', () => {
    const mockEvents: CulturalEvent[] = [
      {
        title: '행사 1',
        category: '공연',
        place: '장소 1',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        lat: 37.577,
        lng: 126.977,
        guName: '종로구',
        orgLink: '',
        mainImg: '',
        useFee: '무료',
      },
      {
        title: '행사 2',
        category: '전시',
        place: '장소 2',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        lat: 37.578,
        lng: 126.978,
        guName: '종로구',
        orgLink: 'https://example.com',
        mainImg: '',
        useFee: '유료',
      },
    ]
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} events={mockEvents} />)
    expect(screen.getByTestId('events-section-title')).toHaveTextContent('진행 중인 행사 (2)')
    expect(screen.getAllByTestId('bottom-sheet-event')).toHaveLength(2)
  })

  it('accepts events prop without breaking existing behavior', () => {
    // events prop is optional, should not break without it
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('area-name')).toHaveTextContent('경복궁')
    expect(screen.queryByTestId('events-section-title')).not.toBeInTheDocument()
  })

  it('does not show subway section when nearbyStations is empty', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} nearbyStations={[]} />)
    expect(screen.queryByTestId('subway-section-title')).not.toBeInTheDocument()
  })

  it('does not show subway section when nearbyStations is undefined', () => {
    render(<BottomSheet areaData={mockAreaData} onDismiss={vi.fn()} />)
    expect(screen.queryByTestId('subway-section-title')).not.toBeInTheDocument()
  })

  it('shows subway section when nearbyStations are provided', () => {
    const mockStations: SubwayStation[] = [
      {
        id: 'station-001',
        name: '경복궁',
        nameEn: 'Gyeongbokgung',
        lines: [3],
        lat: 37.5765,
        lng: 126.9769,
        nearbyHotspots: ['POI001'],
      },
    ]
    render(
      <BottomSheet
        areaData={mockAreaData}
        onDismiss={vi.fn()}
        nearbyStations={mockStations}
      />
    )
    expect(screen.getByTestId('subway-section-title')).toBeInTheDocument()
    expect(screen.getByTestId('subway-station-card')).toBeInTheDocument()
    expect(screen.getByText('Gyeongbokgung')).toBeInTheDocument()
  })

  it('shows loading message when subwayLoading is true', () => {
    const mockStations: SubwayStation[] = [
      {
        id: 'station-001',
        name: '경복궁',
        nameEn: 'Gyeongbokgung',
        lines: [3],
        lat: 37.5765,
        lng: 126.9769,
        nearbyHotspots: ['POI001'],
      },
    ]
    render(
      <BottomSheet
        areaData={mockAreaData}
        onDismiss={vi.fn()}
        nearbyStations={mockStations}
        subwayLoading={true}
      />
    )
    expect(screen.getByText('도착 정보 불러오는 중...')).toBeInTheDocument()
  })

  it('shows arrival info in subway station card', () => {
    const mockStations: SubwayStation[] = [
      {
        id: 'station-001',
        name: '경복궁',
        nameEn: 'Gyeongbokgung',
        lines: [3],
        lat: 37.5765,
        lng: 126.9769,
        nearbyHotspots: ['POI001'],
      },
    ]
    const mockArrivals: SubwayArrivalInfo[] = [
      {
        stationName: '경복궁',
        lineNumber: '3호선',
        direction: '대화방면',
        destination: '대화',
        arrivalMessage: '2분 후',
        arrivalSeconds: 120,
        congestion: 'unknown',
        updatedAt: new Date().toISOString(),
      },
    ]
    const arrivalsMap = new Map<string, SubwayArrivalInfo[]>([['station-001', mockArrivals]])
    render(
      <BottomSheet
        areaData={mockAreaData}
        onDismiss={vi.fn()}
        nearbyStations={mockStations}
        subwayArrivals={arrivalsMap}
      />
    )
    expect(screen.getByTestId('subway-arrival-row')).toBeInTheDocument()
    expect(screen.getByText('2분 후')).toBeInTheDocument()
  })

  it('shows transfer tag for multi-line station', () => {
    const mockStations: SubwayStation[] = [
      {
        id: 'station-002',
        name: '시청',
        nameEn: 'City Hall',
        lines: [1, 2],
        lat: 37.5657,
        lng: 126.9769,
        nearbyHotspots: ['POI002'],
      },
    ]
    render(
      <BottomSheet
        areaData={mockAreaData}
        onDismiss={vi.fn()}
        nearbyStations={mockStations}
      />
    )
    expect(screen.getByText('환승 Transfer')).toBeInTheDocument()
  })
})
