import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the map', () => {
    render(<App />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
