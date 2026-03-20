import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BottomSheet from '../components/BottomSheet'
import type { AreaData } from '../types'

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
})
