import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useRanking } from '../hooks/useRanking'
import type { AreaData, CulturalEvent } from '../types'

// Helper to build a minimal AreaData with population
function makeAreaData(
  name: string,
  congestLvl: '여유' | '보통' | '약간 붐빔' | '붐빔',
  popMin: number,
  popMax: number
): AreaData {
  return {
    areaCd: name,
    areaName: name,
    population: {
      areaCd: name,
      areaName: name,
      areaCongestLvl: congestLvl,
      areaCongestMsg: '',
      areaPopMin: popMin,
      areaPopMax: popMax,
      malePopRate: 50,
      femalePopRate: 50,
      residentPopRate: 30,
      nonResidentPopRate: 70,
      ageGroup: { rate0: 2, rate10: 8, rate20: 25, rate30: 22, rate40: 18, rate50: 14, rate60: 8, rate70: 3 },
    },
    weather: null,
    fetchedAt: Date.now(),
  }
}

function makeEvent(title: string): CulturalEvent {
  return {
    title,
    category: '축제/행사',
    place: '',
    startDate: '',
    endDate: '',
    lat: 0,
    lng: 0,
    guName: '',
    orgLink: '',
    mainImg: '',
    useFee: '',
  }
}

// LOCATIONS uses names, so we use exact location names from LocationRegistry
// '경복궁' = POI001, '광화문·덕수궁' = POI002, '여의도' = POI022
const LOC_GYEONGBOKGUNG = '경복궁'       // POI001
const LOC_GWANGHWAMUN = '광화문·덕수궁'  // POI002
const LOC_YEOUIDO = '여의도'              // POI022
const CODE_GYEONGBOKGUNG = 'POI001'
const CODE_GWANGHWAMUN = 'POI002'
const CODE_YEOUIDO = 'POI022'

describe('useRanking', () => {
  it('returns empty array when data map is empty', () => {
    const { result } = renderHook(() =>
      useRanking(new Map(), new Map(), 'congestion')
    )
    expect(result.current).toEqual([])
  })

  it('filters out areas with no population data', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, { areaCd: LOC_GYEONGBOKGUNG, areaName: LOC_GYEONGBOKGUNG, population: null, weather: null, fetchedAt: 0 }],
    ])
    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'congestion')
    )
    expect(result.current).toHaveLength(0)
  })

  it('builds RankedArea with correct fields', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '보통', 10000, 20000)],
    ])
    const events = [makeEvent('경복궁 야간개장')]
    const eventsByArea = new Map([[CODE_GYEONGBOKGUNG, events]])

    const { result } = renderHook(() =>
      useRanking(data, eventsByArea, 'congestion')
    )

    expect(result.current).toHaveLength(1)
    const area = result.current[0]
    expect(area.code).toBe(CODE_GYEONGBOKGUNG)
    expect(area.name).toBe(LOC_GYEONGBOKGUNG)
    expect(area.congestionLevel).toBe('보통')
    expect(area.populationAvg).toBe(15000)
    expect(area.events).toEqual(events)
  })

  it('uses empty array for events when area has no events', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '보통', 10000, 20000)],
    ])
    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'congestion')
    )
    expect(result.current[0].events).toEqual([])
  })

  it('sorts by congestion descending (붐빔 > 약간 붐빔 > 보통 > 여유)', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '여유', 1000, 2000)],
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '붐빔', 50000, 60000)],
      [LOC_YEOUIDO, makeAreaData(LOC_YEOUIDO, '보통', 10000, 20000)],
    ])

    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'congestion')
    )

    const levels = result.current.map(a => a.congestionLevel)
    expect(levels[0]).toBe('붐빔')
    expect(levels[levels.length - 1]).toBe('여유')
  })

  it('sorts by populationAvg desc as tiebreaker in congestion mode', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '보통', 5000, 15000)],  // avg=10000
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '보통', 20000, 40000)],     // avg=30000
    ])

    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'congestion')
    )

    expect(result.current[0].name).toBe(LOC_GWANGHWAMUN)
    expect(result.current[1].name).toBe(LOC_GYEONGBOKGUNG)
  })

  it('sorts by populationAvg desc in population mode', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '붐빔', 5000, 10000)],   // avg=7500
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '여유', 30000, 50000)],      // avg=40000
    ])

    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'population')
    )

    expect(result.current[0].name).toBe(LOC_GWANGHWAMUN)
    expect(result.current[1].name).toBe(LOC_GYEONGBOKGUNG)
  })

  it('sorts by events count desc in events mode', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '보통', 10000, 20000)],
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '보통', 10000, 20000)],
      [LOC_YEOUIDO, makeAreaData(LOC_YEOUIDO, '보통', 10000, 20000)],
    ])

    const eventsByArea = new Map([
      [CODE_GYEONGBOKGUNG, [makeEvent('A'), makeEvent('B'), makeEvent('C')]],
      [CODE_GWANGHWAMUN, [makeEvent('D')]],
      [CODE_YEOUIDO, [makeEvent('E'), makeEvent('F')]],
    ])

    const { result } = renderHook(() =>
      useRanking(data, eventsByArea, 'events')
    )

    expect(result.current[0].code).toBe(CODE_GYEONGBOKGUNG)   // 3 events
    expect(result.current[1].code).toBe(CODE_YEOUIDO)          // 2 events
    expect(result.current[2].code).toBe(CODE_GWANGHWAMUN)      // 1 event
  })

  it('uses congestion as tiebreaker in events mode', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '여유', 10000, 20000)],
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '붐빔', 10000, 20000)],
    ])

    const eventsByArea = new Map([
      [CODE_GYEONGBOKGUNG, [makeEvent('A')]],
      [CODE_GWANGHWAMUN, [makeEvent('B')]],
    ])

    const { result } = renderHook(() =>
      useRanking(data, eventsByArea, 'events')
    )

    // Same event count (1 each), congestion tiebreaker: 붐빔 > 여유
    expect(result.current[0].code).toBe(CODE_GWANGHWAMUN)
    expect(result.current[1].code).toBe(CODE_GYEONGBOKGUNG)
  })

  it('defaults to congestion sortMode', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '여유', 1000, 2000)],
      [LOC_GWANGHWAMUN, makeAreaData(LOC_GWANGHWAMUN, '붐빔', 50000, 60000)],
    ])

    const { result } = renderHook(() =>
      useRanking(data, new Map())
    )

    expect(result.current[0].congestionLevel).toBe('붐빔')
  })

  it('computes populationAvg as (min + max) / 2', () => {
    const data = new Map<string, AreaData>([
      [LOC_GYEONGBOKGUNG, makeAreaData(LOC_GYEONGBOKGUNG, '보통', 8000, 12000)],
    ])

    const { result } = renderHook(() =>
      useRanking(data, new Map(), 'congestion')
    )

    expect(result.current[0].populationAvg).toBe(10000)
  })
})
