import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SeoulMap from '../components/SeoulMap'

describe('SeoulMap', () => {
  it('renders the SVG map', () => {
    render(<SeoulMap />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders Han River label', () => {
    render(<SeoulMap />)
    expect(screen.getByText('한강')).toBeInTheDocument()
  })

  it('renders all 24 district paths', () => {
    render(<SeoulMap />)
    const paths = document.querySelectorAll('svg path')
    // Han river + major roads + districts
    expect(paths.length).toBeGreaterThan(20)
  })

  it('renders district labels', () => {
    render(<SeoulMap />)
    expect(screen.getByText('강남')).toBeInTheDocument()
    expect(screen.getByText('종로')).toBeInTheDocument()
    expect(screen.getByText('마포')).toBeInTheDocument()
  })
})
