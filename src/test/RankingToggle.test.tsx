import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RankingToggle from '../components/RankingToggle'

describe('RankingToggle', () => {
  it('renders toggle button with testid', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={0} />)
    expect(screen.getByTestId('ranking-toggle')).toBeInTheDocument()
  })

  it('shows trophy emoji', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={0} />)
    expect(screen.getByTestId('ranking-toggle')).toHaveTextContent('🏆')
  })

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn()
    render(<RankingToggle onClick={onClick} busyCount={0} />)
    fireEvent.click(screen.getByTestId('ranking-toggle'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not show badge when busyCount is 0', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={0} />)
    expect(screen.queryByTestId('ranking-toggle-badge')).not.toBeInTheDocument()
  })

  it('shows badge with count when busyCount > 0', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={5} />)
    expect(screen.getByTestId('ranking-toggle-badge')).toBeInTheDocument()
    expect(screen.getByTestId('ranking-toggle-badge')).toHaveTextContent('5')
  })

  it('shows correct busy count in badge', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={12} />)
    expect(screen.getByTestId('ranking-toggle-badge')).toHaveTextContent('12')
  })

  it('has correct fixed positioning style', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={0} />)
    const btn = screen.getByTestId('ranking-toggle')
    expect(btn.style.position).toBe('fixed')
    expect(btn.style.bottom).toBe('80px')
    expect(btn.style.right).toBe('16px')
  })

  it('has correct z-index', () => {
    render(<RankingToggle onClick={vi.fn()} busyCount={0} />)
    const btn = screen.getByTestId('ranking-toggle')
    expect(btn.style.zIndex).toBe('15')
  })
})
