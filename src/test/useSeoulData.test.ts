import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSeoulData } from '../hooks/useSeoulData'

const makeAreaResponse = () => ({
  CITYDATA: {
    AREA_CD: 'CODE',
    LIVE_PPLTN_STTS: [
      {
        AREA_CD: 'CODE',
        AREA_NM: 'test',
        AREA_CONGEST_LVL: '보통',
        AREA_CONGEST_MSG: 'test',
        AREA_PPLTN_MIN: 10000,
        AREA_PPLTN_MAX: 20000,
        MALE_PPLTN_RATE: 50,
        FEMALE_PPLTN_RATE: 50,
        RESNT_PPLTN_RATE: 30,
        NON_RESNT_PPLTN_RATE: 70,
        PPLTN_RATE_0: 2, PPLTN_RATE_10: 8, PPLTN_RATE_20: 25,
        PPLTN_RATE_30: 22, PPLTN_RATE_40: 18, PPLTN_RATE_50: 14,
        PPLTN_RATE_60: 8, PPLTN_RATE_70: 3,
      },
    ],
    WEATHER_STTS: [
      {
        WEATHER_TIME: '2026-03-20 10:00',
        TEMP: '15', SENSIBLE_TEMP: '14', MAX_TEMP: '18', MIN_TEMP: '8',
        HUMIDITY: '60', WIND: '북서', WIND_SPD: '3.5',
        PRECIPITATION: '0', PRECPT_TYPE: '없음', SKY_STTS: '맑음',
        UV_INDEX: '2', UV_INDEX_LVL: '낮음',
        PM25: 12, PM25_INDEX: '좋음', PM10: 25, PM10_INDEX: '좋음',
      },
    ],
  },
})

describe('useSeoulData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeAreaResponse(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state', () => {
    const { result } = renderHook(() => useSeoulData('test-key'))
    expect(result.current.loading).toBe(true)
  })

  it('transitions to non-loading after fetch', async () => {
    const { result } = renderHook(() => useSeoulData('test-key'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 30000 })
  }, 35000)

  it('populates data map after successful fetch', async () => {
    const { result } = renderHook(() => useSeoulData('test-key'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 30000 })

    expect(result.current.data.size).toBeGreaterThan(0)
  }, 35000)

  it('sets isOffline on network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useSeoulData('test-key'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 30000 })

    expect(result.current.isOffline).toBe(true)
  }, 35000)

  it('sets lastUpdated after fetch', async () => {
    const { result } = renderHook(() => useSeoulData('test-key'))

    await waitFor(() => {
      expect(result.current.lastUpdated).not.toBeNull()
    }, { timeout: 30000 })
  }, 35000)

  it('refresh function resets loading state', async () => {
    const { result } = renderHook(() => useSeoulData('test-key'))

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 30000 })

    act(() => {
      result.current.refresh()
    })

    expect(result.current.loading).toBe(true)
  }, 35000)
})
