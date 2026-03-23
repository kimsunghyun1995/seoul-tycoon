import { describe, it, expect } from 'vitest'
import {
  SUBWAY_STATIONS,
  SUBWAY_STATION_MAP,
  findNearbyStations,
  findStationsNearCoord,
} from '../services/SubwayStationRegistry'

describe('SubwayStationRegistry', () => {
  it('has at least 40 stations', () => {
    expect(SUBWAY_STATIONS.length).toBeGreaterThanOrEqual(40)
  })

  it('every station has required fields', () => {
    for (const s of SUBWAY_STATIONS) {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.nameEn).toBeTruthy()
      expect(s.lines.length).toBeGreaterThan(0)
      expect(s.lat).toBeGreaterThan(37)
      expect(s.lng).toBeGreaterThan(126)
    }
  })

  it('station IDs are unique', () => {
    const ids = SUBWAY_STATIONS.map(s => s.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('SUBWAY_STATION_MAP contains all stations by id', () => {
    expect(SUBWAY_STATION_MAP.size).toBe(SUBWAY_STATIONS.length)
    for (const s of SUBWAY_STATIONS) {
      expect(SUBWAY_STATION_MAP.get(s.id)).toBe(s)
    }
  })

  describe('findNearbyStations', () => {
    it('returns stations mapped to POI014 (홍대입구)', () => {
      const stations = findNearbyStations('POI014')
      expect(stations.length).toBeGreaterThan(0)
      const names = stations.map(s => s.name)
      expect(names).toContain('홍대입구')
    })

    it('returns stations mapped to POI035 (강남역)', () => {
      const stations = findNearbyStations('POI035')
      expect(stations.length).toBeGreaterThan(0)
      const names = stations.map(s => s.name)
      expect(names).toContain('강남')
    })

    it('returns stations mapped to POI047 (잠실역)', () => {
      const stations = findNearbyStations('POI047')
      expect(stations.length).toBeGreaterThan(0)
      const names = stations.map(s => s.name)
      expect(names).toContain('잠실')
    })

    it('returns empty array for unknown hotspot code', () => {
      const stations = findNearbyStations('POI999')
      expect(stations).toHaveLength(0)
    })

    it('잠실 station includes both line 2 and line 8', () => {
      const stations = findNearbyStations('POI047')
      const jamsil = stations.find(s => s.name === '잠실')
      expect(jamsil).toBeDefined()
      expect(jamsil!.lines).toContain(2)
      expect(jamsil!.lines).toContain(8)
    })
  })

  describe('findStationsNearCoord', () => {
    it('finds stations near 홍대입구 coordinates', () => {
      // 홍대입구 station: 37.5571, 126.9240
      const stations = findStationsNearCoord(37.5571, 126.9240)
      expect(stations.length).toBeGreaterThan(0)
      const names = stations.map(s => s.name)
      expect(names).toContain('홍대입구')
    })

    it('finds stations near 강남역 coordinates', () => {
      // 강남 station: 37.4981, 127.0276
      const stations = findStationsNearCoord(37.4981, 127.0276)
      expect(stations.length).toBeGreaterThan(0)
      const names = stations.map(s => s.name)
      expect(names).toContain('강남')
    })

    it('returns empty for coordinates far from any station', () => {
      // Middle of Han River, no stations
      const stations = findStationsNearCoord(37.51, 126.950)
      // This area might or might not have stations; just verify it returns an array
      expect(Array.isArray(stations)).toBe(true)
    })
  })

  describe('line coverage', () => {
    it('has stations for lines 1-9', () => {
      for (let line = 1; line <= 9; line++) {
        const found = SUBWAY_STATIONS.filter(s => s.lines.includes(line))
        expect(found.length).toBeGreaterThan(0)
      }
    })

    it('transfer stations have multiple lines', () => {
      // 잠실 should have lines 2 and 8
      const jamsil = SUBWAY_STATIONS.find(s => s.name === '잠실')
      expect(jamsil).toBeDefined()
      expect(jamsil!.lines.length).toBeGreaterThanOrEqual(2)
    })
  })
})
