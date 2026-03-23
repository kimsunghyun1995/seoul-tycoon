import { describe, it, expect } from 'vitest'
import { haversineDistance, matchEventsToAreas } from '../services/EventMatcher'
import type { CulturalEvent, Location } from '../types'

// Test locations
const LOCATIONS: Location[] = [
  { code: 'POI001', name: '경복궁', lat: 37.5796, lng: 126.9769 },
  { code: 'POI008', name: '명동', lat: 37.5634, lng: 126.9849 },
  { code: 'POI014', name: '홍대입구', lat: 37.5571, lng: 126.9240 },
]

function makeEvent(overrides: Partial<CulturalEvent> = {}): CulturalEvent {
  return {
    title: '테스트 행사',
    category: '축제/행사',
    place: '테스트 장소',
    startDate: '2026-03-01 00:00:00',
    endDate: '2026-03-31 23:59:59',
    lat: 0,
    lng: 0,
    guName: '테스트구',
    orgLink: '',
    mainImg: '',
    useFee: '무료',
    ...overrides,
  }
}

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(37.5796, 126.9769, 37.5796, 126.9769)).toBe(0)
  })

  it('calculates known distance correctly (Seoul to Busan ~325km)', () => {
    const dist = haversineDistance(37.5665, 126.9780, 35.1796, 129.0756)
    expect(dist).toBeGreaterThan(320)
    expect(dist).toBeLessThan(340)
  })

  it('is symmetric', () => {
    const d1 = haversineDistance(37.5796, 126.9769, 37.5634, 126.9849)
    const d2 = haversineDistance(37.5634, 126.9849, 37.5796, 126.9769)
    expect(Math.abs(d1 - d2)).toBeLessThan(0.0001)
  })

  it('returns small distance for nearby points', () => {
    // ~200m apart
    const dist = haversineDistance(37.5796, 126.9769, 37.5810, 126.9780)
    expect(dist).toBeLessThan(1)
  })
})

describe('matchEventsToAreas', () => {
  it('initializes all location codes with empty arrays', () => {
    const result = matchEventsToAreas([], LOCATIONS)
    expect(result.size).toBe(LOCATIONS.length)
    for (const loc of LOCATIONS) {
      expect(result.get(loc.code)).toEqual([])
    }
  })

  it('matches event by coordinate proximity (within 1km)', () => {
    // Event very close to 경복궁 (POI001)
    const event = makeEvent({ lat: 37.5800, lng: 126.9760, place: '아무데나', guName: '강남구' })
    const result = matchEventsToAreas([event], LOCATIONS)

    expect(result.get('POI001')).toHaveLength(1)
    expect(result.get('POI008')).toHaveLength(0)
    expect(result.get('POI014')).toHaveLength(0)
  })

  it('does not match event farther than 1km when only coordinates available', () => {
    // Gangnam area, far from all 3 test locations
    const event = makeEvent({ lat: 37.4980, lng: 127.0280, place: '강남어딘가', guName: '강남구' })
    const result = matchEventsToAreas([event], LOCATIONS)

    expect(result.get('POI001')).toHaveLength(0)
    expect(result.get('POI008')).toHaveLength(0)
    expect(result.get('POI014')).toHaveLength(0)
  })

  it('matches event by place name containing area name', () => {
    const event = makeEvent({ lat: 0, lng: 0, place: '명동 중앙로', guName: '중구' })
    const result = matchEventsToAreas([event], LOCATIONS)

    expect(result.get('POI008')).toHaveLength(1) // 명동 match
    expect(result.get('POI001')).toHaveLength(0)
  })

  it('matches event by gu name', () => {
    // 홍대입구 is in 마포구 — use guName matching
    const mapoLoc: Location = { code: 'POI099', name: '마포구', lat: 37.5663, lng: 126.9015 }
    const event = makeEvent({ lat: 0, lng: 0, place: '상암동 어딘가', guName: '마포구' })
    const result = matchEventsToAreas([event], [mapoLoc])

    expect(result.get('POI099')).toHaveLength(1)
  })

  it('can match one event to multiple locations if eligible', () => {
    // Place near two locations
    const event = makeEvent({ lat: 37.5796, lng: 126.9769, place: '경복궁 근처', guName: '종로구' })
    const extraLoc: Location = { code: 'POI002', name: '광화문', lat: 37.5759, lng: 126.9765 }
    const result = matchEventsToAreas([event], [LOCATIONS[0], extraLoc])

    // Both locations are within 1km of 37.5796, 126.9769
    expect(result.get('POI001')).toHaveLength(1)
    expect(result.get('POI002')).toHaveLength(1)
  })

  it('handles events with zero coordinates gracefully (skips distance check)', () => {
    const event = makeEvent({ lat: 0, lng: 0, place: '홍대입구 클럽', guName: '마포구' })
    const result = matchEventsToAreas([event], LOCATIONS)

    // Should match POI014 (홍대입구) by place name
    expect(result.get('POI014')).toHaveLength(1)
  })

  it('returns correct results for multiple events and locations', () => {
    const events = [
      makeEvent({ lat: 37.5796, lng: 126.9769, title: '경복궁 행사', place: '경복궁', guName: '종로구' }),
      makeEvent({ lat: 37.5634, lng: 126.9849, title: '명동 행사', place: '명동', guName: '중구' }),
    ]
    const result = matchEventsToAreas(events, LOCATIONS)

    expect(result.get('POI001')!.map(e => e.title)).toContain('경복궁 행사')
    expect(result.get('POI008')!.map(e => e.title)).toContain('명동 행사')
  })
})
