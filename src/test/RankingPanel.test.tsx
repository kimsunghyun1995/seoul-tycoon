import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RankingPanel from '../components/RankingPanel'
import type { RankedArea } from '../types'

const mockRankings: RankedArea[] = [
  {
    code: 'POI001',
    name: '경복궁',
    congestionLevel: '붐빔',
    populationAvg: 45000,
    events: [],
  },
  {
    code: 'POI002',
    name: '홍대입구',
    congestionLevel: '보통',
    populationAvg: 20000,
    events: [],
  },
]

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  rankings: mockRankings,
  sortMode: 'congestion' as const,
  onSortChange: vi.fn(),
  onSelectArea: vi.fn(),
  loading: false,
}

describe('RankingPanel', () => {
  it('renders ranking panel with testid', () => {
    render(<RankingPanel {...defaultProps} />)
    expect(screen.getByTestId('ranking-panel')).toBeInTheDocument()
  })

  it('shows panel title', () => {
    render(<RankingPanel {...defaultProps} />)
    expect(screen.getByTestId('ranking-panel')).toHaveTextContent('실시간 혼잡 순위')
  })

  it('shows sort dropdown', () => {
    render(<RankingPanel {...defaultProps} />)
    expect(screen.getByTestId('ranking-panel-sort')).toBeInTheDocument()
  })

  it('shows close button', () => {
    render(<RankingPanel {...defaultProps} />)
    expect(screen.getByTestId('ranking-panel-close')).toBeInTheDocument()
  })

  it('shows all ranking cards when not loading', () => {
    render(<RankingPanel {...defaultProps} />)
    const cards = screen.getAllByTestId('ranking-card')
    expect(cards).toHaveLength(2)
  })

  it('shows footer with area count', () => {
    render(<RankingPanel {...defaultProps} />)
    expect(screen.getByTestId('ranking-panel')).toHaveTextContent('총 2개 지역')
  })

  it('shows loading spinner when loading is true', () => {
    render(<RankingPanel {...defaultProps} loading={true} />)
    expect(screen.getByTestId('ranking-panel')).toHaveTextContent('행사 정보 불러오는 중...')
    expect(screen.queryByTestId('ranking-card')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<RankingPanel {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('ranking-panel-close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    render(<RankingPanel {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('ranking-panel-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSortChange with new value when sort changed', () => {
    const onSortChange = vi.fn()
    render(<RankingPanel {...defaultProps} onSortChange={onSortChange} />)
    fireEvent.change(screen.getByTestId('ranking-panel-sort'), { target: { value: 'population' } })
    expect(onSortChange).toHaveBeenCalledWith('population')
  })

  it('has correct sort value selected', () => {
    render(<RankingPanel {...defaultProps} sortMode="events" />)
    const select = screen.getByTestId('ranking-panel-sort') as HTMLSelectElement
    expect(select.value).toBe('events')
  })

  it('does not show backdrop when closed', () => {
    render(<RankingPanel {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('ranking-panel-backdrop')).not.toBeInTheDocument()
  })

  it('calls onSelectArea when a ranking card area is selected', () => {
    const onSelectArea = vi.fn()
    render(<RankingPanel {...defaultProps} onSelectArea={onSelectArea} />)
    // Click on area name in first card
    fireEvent.click(screen.getByText('경복궁'))
    expect(onSelectArea).toHaveBeenCalledWith('POI001')
  })
})
