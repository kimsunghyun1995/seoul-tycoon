import { describe, it, expect } from 'vitest'
import { LOCATIONS, LOCATION_MAP, LOCATION_BY_NAME } from '../services/LocationRegistry'

describe('LocationRegistry', () => {
  it('exports 122 locations', () => {
    expect(LOCATIONS).toHaveLength(122)
  })

  it('all locations have valid SVG coordinates', () => {
    for (const loc of LOCATIONS) {
      expect(loc.x).toBeGreaterThanOrEqual(80)
      expect(loc.x).toBeLessThanOrEqual(680)
      expect(loc.y).toBeGreaterThanOrEqual(20)
      expect(loc.y).toBeLessThanOrEqual(650)
    }
  })

  it('all locations have code and name', () => {
    for (const loc of LOCATIONS) {
      expect(loc.code).toMatch(/^POI\d{3}$/)
      expect(loc.name.length).toBeGreaterThan(0)
    }
  })

  it('LOCATION_MAP indexes by code', () => {
    expect(LOCATION_MAP.size).toBe(122)
    const gangnam = LOCATION_MAP.get('POI035')
    expect(gangnam?.name).toBe('강남역')
  })

  it('LOCATION_BY_NAME indexes by name', () => {
    expect(LOCATION_BY_NAME.size).toBe(122)
    const loc = LOCATION_BY_NAME.get('경복궁')
    expect(loc?.code).toBe('POI001')
  })

  it('well-known locations are in correct relative positions', () => {
    // Gangnam should be south of Jongno
    const gangnam = LOCATION_MAP.get('POI035')!
    const jongno = LOCATION_MAP.get('POI004')!
    expect(gangnam.y).toBeGreaterThan(jongno.y)

    // Nowon (northeast) should be east of Eunpyeong (northwest)
    const nowon = LOCATION_MAP.get('POI064')!
    const eunpyeong = LOCATION_MAP.get('POI075')!
    expect(nowon.x).toBeGreaterThan(eunpyeong.x)
  })
})
