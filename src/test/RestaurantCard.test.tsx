import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RestaurantCard from '../components/RestaurantCard'
import type { HotRestaurant } from '../types'

const mockRestaurant: HotRestaurant = {
  id: 'r001',
  name: '맛있는 한식당',
  address: '서울특별시 마포구 합정동 123',
  lat: 37.55,
  lng: 126.92,
  google_rating: 4.5,
  google_review_count: 120,
  google_place_id: 'ChIJ_test_place_id',
  instagram_mentions: 12,
  threads_mentions: 5,
  source_urls: ['https://instagram.com/p/xxx'],
  trending_score: 87.5,
  category: '한식',
  image_url: null,
  created_at: '2026-03-24T00:00:00Z', emoji: '🍜', llm_reason: null,
}

describe('RestaurantCard', () => {
  it('renders with data-testid', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByTestId('restaurant-card')).toBeInTheDocument()
  })

  it('displays restaurant name', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByText('맛있는 한식당')).toBeInTheDocument()
  })

  it('displays google rating and review count', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(120 reviews)')).toBeInTheDocument()
  })

  it('shows -- when google_rating is null', () => {
    const noRating: HotRestaurant = { ...mockRestaurant, google_rating: null }
    render(<RestaurantCard restaurant={noRating} onClose={vi.fn()} />)
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('displays instagram and threads mentions', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByText('12 mentions')).toBeInTheDocument()
    expect(screen.getByText('5 mentions')).toBeInTheDocument()
  })

  it('displays address', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByText('서울특별시 마포구 합정동 123')).toBeInTheDocument()
  })

  it('displays category', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    expect(screen.getByText('한식')).toBeInTheDocument()
  })

  it('does not render category row when category is null', () => {
    const noCategory: HotRestaurant = { ...mockRestaurant, category: null }
    render(<RestaurantCard restaurant={noCategory} onClose={vi.fn()} />)
    expect(screen.queryByText(/요즘 핫한 맛집/)).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<RestaurantCard restaurant={mockRestaurant} onClose={onClose} />)
    const btn = screen.getByRole('button', { name: '닫기' })
    fireEvent.click(btn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders Google Maps link with place_id', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onClose={vi.fn()} />)
    const link = screen.getByRole('link', { name: /Google Maps/ })
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/place/?q=place_id:ChIJ_test_place_id',
    )
  })

  it('renders Google Maps search link when place_id is null', () => {
    const noPlaceId: HotRestaurant = { ...mockRestaurant, google_place_id: null }
    render(<RestaurantCard restaurant={noPlaceId} onClose={vi.fn()} />)
    const link = screen.getByRole('link', { name: /Google Maps/ })
    expect(link.getAttribute('href')).toContain('google.com/maps/search')
  })
})
