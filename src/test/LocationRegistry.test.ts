import { describe, it, expect } from 'vitest'
import { LOCATIONS, LOCATION_MAP, LOCATION_BY_NAME } from '../services/LocationRegistry'

describe('LocationRegistry', () => {
  it('exports 122 locations', () => {
    expect(LOCATIONS).toHaveLength(122)
  })

  it('all locations have valid geographic coordinates', () => {
    for (const loc of LOCATIONS) {
      // Seoul latitude range: roughly 37.43 ~ 37.70
      expect(loc.lat).toBeGreaterThanOrEqual(37.4)
      expect(loc.lat).toBeLessThanOrEqual(37.75)
      // Seoul longitude range: roughly 126.76 ~ 127.22
      expect(loc.lng).toBeGreaterThanOrEqual(126.7)
      expect(loc.lng).toBeLessThanOrEqual(127.25)
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

  it('well-known locations are in correct geographic positions', () => {
    // Gangnam (south) should have smaller lat than Jongno (north)
    const gangnam = LOCATION_MAP.get('POI035')!
    const jongno = LOCATION_MAP.get('POI004')!
    expect(gangnam.lat).toBeLessThan(jongno.lat)

    // Nowon (northeast) should have larger lng than Eunpyeong (northwest)
    const nowon = LOCATION_MAP.get('POI064')!
    const eunpyeong = LOCATION_MAP.get('POI075')!
    expect(nowon.lng).toBeGreaterThan(eunpyeong.lng)
  })
})
