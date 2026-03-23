import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EventCard from '../components/EventCard'
import type { CulturalEvent } from '../types'

const mockEvent: CulturalEvent = {
  title: '2024 서울 봄 축제',
  category: '축제/행사',
  place: '광화문광장',
  startDate: '2024-03-20 00:00:00.0',
  endDate: '2024-03-25 00:00:00.0',
  lat: 37.5759,
  lng: 126.9769,
  guName: '종로구',
  orgLink: 'https://example.com/event',
  mainImg: 'https://example.com/image.jpg',
  useFee: '무료',
}

const paidEvent: CulturalEvent = {
  ...mockEvent,
  title: '유료 공연',
  useFee: '성인 10,000원',
}

const noLinkEvent: CulturalEvent = {
  ...mockEvent,
  orgLink: '',
}

describe('EventCard', () => {
  it('renders event card with testid', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).toBeInTheDocument()
  })

  it('shows event title', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('2024 서울 봄 축제')
  })

  it('shows category badge', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('축제/행사')
  })

  it('shows formatted date range', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('3/20 ~ 3/25')
  })

  it('shows place name', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('광화문광장')
  })

  it('does not show fee info when event is free', () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByTestId('event-card')).not.toHaveTextContent('무료')
  })

  it('shows fee info when event has a fee', () => {
    render(<EventCard event={paidEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('성인 10,000원')
  })

  it('shows external link when orgLink is provided', () => {
    render(<EventCard event={mockEvent} />)
    const link = screen.getByRole('link', { name: /자세히 보기/ })
    expect(link).toHaveAttribute('href', 'https://example.com/event')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not show link when orgLink is empty', () => {
    render(<EventCard event={noLinkEvent} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows same date when start and end are the same', () => {
    const singleDayEvent = { ...mockEvent, startDate: '2024-04-01 00:00:00.0', endDate: '2024-04-01 00:00:00.0' }
    render(<EventCard event={singleDayEvent} />)
    expect(screen.getByTestId('event-card')).toHaveTextContent('4/1')
  })
})
