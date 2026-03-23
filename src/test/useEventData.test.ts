import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEventData } from '../hooks/useEventData'
import * as EventApiServiceModule from '../services/EventApiService'
import * as EventMatcherModule from '../services/EventMatcher'
import type { CulturalEvent } from '../types'

const mockEvent: CulturalEvent = {
  title: '서울 봄 축제',
  category: '축제/행사',
  place: '여의도 공원',
  startDate: '2026-03-01 00:00:00',
  endDate: '2026-03-31 23:59:59',
  lat: 37.5283,
  lng: 126.9241,
  guName: '영등포구',
  orgLink: 'http://example.com',
  mainImg: 'http://example.com/img.jpg',
  useFee: '무료',
}

describe('useEventData', () => {
  const mockFetchEvents = vi.fn()
  const mockMatchEventsToAreas = vi.fn()

  beforeEach(() => {
    mockFetchEvents.mockResolvedValue([mockEvent])
    mockMatchEventsToAreas.mockReturnValue(new Map([['POI022', [mockEvent]]]))

    vi.spyOn(EventApiServiceModule, 'getEventApiService').mockReturnValue({
      fetchEvents: mockFetchEvents,
      getCachedEvents: vi.fn().mockReturnValue([]),
      isCacheFresh: vi.fn().mockReturnValue(false),
    } as unknown as EventApiServiceModule.EventApiService)

    vi.spyOn(EventMatcherModule, 'matchEventsToAreas').mockImplementation(mockMatchEventsToAreas)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with empty events and not loading', () => {
    const { result } = renderHook(() => useEventData())

    expect(result.current.events).toEqual([])
    expect(result.current.eventsByArea.size).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading true while fetching', async () => {
    let resolveEvents!: (v: CulturalEvent[]) => void
    mockFetchEvents.mockReturnValue(new Promise<CulturalEvent[]>(res => { resolveEvents = res }))

    const { result } = renderHook(() => useEventData())

    act(() => {
      void result.current.fetch()
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveEvents([mockEvent])
    })

    expect(result.current.loading).toBe(false)
  })

  it('populates events and eventsByArea after fetch', async () => {
    const { result } = renderHook(() => useEventData())

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].title).toBe('서울 봄 축제')
    expect(result.current.eventsByArea.size).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => useEventData())

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.error).toBe('Network failed')
    expect(result.current.loading).toBe(false)
    expect(result.current.events).toEqual([])
  })

  it('sets generic error message for non-Error throws', async () => {
    mockFetchEvents.mockRejectedValue('string error')

    const { result } = renderHook(() => useEventData())

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.error).toBe('Unknown error')
  })

  it('clears error on subsequent successful fetch', async () => {
    mockFetchEvents.mockRejectedValueOnce(new Error('First failure'))
    mockFetchEvents.mockResolvedValueOnce([mockEvent])

    const { result } = renderHook(() => useEventData())

    await act(async () => {
      await result.current.fetch()
    })
    expect(result.current.error).toBe('First failure')

    await act(async () => {
      await result.current.fetch()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.events).toHaveLength(1)
  })

  it('calls matchEventsToAreas with fetched events and LOCATIONS', async () => {
    const { result } = renderHook(() => useEventData())

    await act(async () => {
      await result.current.fetch()
    })

    expect(mockMatchEventsToAreas).toHaveBeenCalledWith([mockEvent], expect.any(Array))
  })

  it('does not fetch automatically on mount (lazy)', () => {
    const freshFetch = vi.fn().mockResolvedValue([])
    vi.spyOn(EventApiServiceModule, 'getEventApiService').mockReturnValue({
      fetchEvents: freshFetch,
      getCachedEvents: vi.fn().mockReturnValue([]),
      isCacheFresh: vi.fn().mockReturnValue(false),
    } as unknown as EventApiServiceModule.EventApiService)

    renderHook(() => useEventData())
    expect(freshFetch).not.toHaveBeenCalled()
  })
})
