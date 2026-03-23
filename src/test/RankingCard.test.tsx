import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RankingCard from '../components/RankingCard'
import type { RankedArea, CulturalEvent } from '../types'

const mockEvent: CulturalEvent = {
  title: '봄 축제',
  category: '축제/행사',
  place: '광화문광장',
  startDate: '2024-03-20 00:00:00.0',
  endDate: '2024-03-25 00:00:00.0',
  lat: 37.5759,
  lng: 126.9769,
  guName: '종로구',
  orgLink: 'https://example.com',
  mainImg: '',
  useFee: '무료',
}

const areaWithEvents: RankedArea = {
  code: 'POI001',
  name: '경복궁',
  congestionLevel: '붐빔',
  populationAvg: 45000,
  events: [mockEvent],
}

const areaNoEvents: RankedArea = {
  code: 'POI002',
  name: '홍대입구',
  congestionLevel: '보통',
  populationAvg: 20000,
  events: [],
}

describe('RankingCard', () => {
  it('renders ranking card with testid', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toBeInTheDocument()
  })

  it('shows rank number', () => {
    render(<RankingCard rank={3} area={areaNoEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toHaveTextContent('#3')
  })

  it('shows area name', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toHaveTextContent('경복궁')
  })

  it('shows congestion level badge', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toHaveTextContent('붐빔')
  })

  it('shows formatted population', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toHaveTextContent('45,000명')
  })

  it('shows event count badge when events exist', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card')).toHaveTextContent('행사 1')
  })

  it('does not show event count badge when no events', () => {
    render(<RankingCard rank={2} area={areaNoEvents} onSelect={vi.fn()} />)
    expect(screen.queryByText(/행사/)).not.toBeInTheDocument()
  })

  it('shows expand button when area has events', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.getByTestId('ranking-card-expand')).toBeInTheDocument()
  })

  it('does not show expand button when no events', () => {
    render(<RankingCard rank={2} area={areaNoEvents} onSelect={vi.fn()} />)
    expect(screen.queryByTestId('ranking-card-expand')).not.toBeInTheDocument()
  })

  it('calls onSelect with area code when main row clicked', () => {
    const onSelect = vi.fn()
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={onSelect} />)
    // Click on area name text
    fireEvent.click(screen.getByText('경복궁'))
    expect(onSelect).toHaveBeenCalledWith('POI001')
  })

  it('expands to show event cards when expand button clicked', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    expect(screen.queryByTestId('event-card')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('ranking-card-expand'))
    expect(screen.getByTestId('event-card')).toBeInTheDocument()
  })

  it('collapses event list when expand button clicked again', () => {
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ranking-card-expand'))
    expect(screen.getByTestId('event-card')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('ranking-card-expand'))
    expect(screen.queryByTestId('event-card')).not.toBeInTheDocument()
  })

  it('does not call onSelect when expand button clicked', () => {
    const onSelect = vi.fn()
    render(<RankingCard rank={1} area={areaWithEvents} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('ranking-card-expand'))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
