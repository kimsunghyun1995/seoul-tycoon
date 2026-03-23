import type { CulturalEvent, Location } from '../types'

const DISTANCE_THRESHOLD_KM = 1

/**
 * Haversine formula to calculate distance between two coordinates in km.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Match events to hotspot areas using three-tier priority:
 * 1. Coordinate proximity (within 1km)
 * 2. Place name contains area name
 * 3. Same gu (district) name
 *
 * Only matches currently active events (assumes caller passes active events,
 * but we skip events with invalid coordinates as an extra guard).
 *
 * @returns Map where key = location code, value = matched events array
 */
export function matchEventsToAreas(
  events: CulturalEvent[],
  locations: Location[],
): Map<string, CulturalEvent[]> {
  const result = new Map<string, CulturalEvent[]>()

  // Initialize all location codes with empty arrays
  for (const loc of locations) {
    result.set(loc.code, [])
  }

  for (const event of events) {
    for (const loc of locations) {
      const matched = isEventMatchedToLocation(event, loc)
      if (matched) {
        result.get(loc.code)!.push(event)
      }
    }
  }

  return result
}

function isEventMatchedToLocation(event: CulturalEvent, loc: Location): boolean {
  // Priority 1: Coordinate proximity (1km threshold)
  if (event.lat !== 0 && event.lng !== 0) {
    const dist = haversineDistance(event.lat, event.lng, loc.lat, loc.lng)
    if (dist <= DISTANCE_THRESHOLD_KM) {
      return true
    }
  }

  // Priority 2: Place name contains area name (or vice versa)
  if (event.place && loc.name) {
    const eventPlace = event.place.toLowerCase()
    const locName = loc.name.toLowerCase()
    if (eventPlace.includes(locName) || locName.includes(eventPlace)) {
      return true
    }
  }

  // Priority 3: Same gu (district) name
  if (event.guName && loc.name) {
    const guName = event.guName.toLowerCase()
    const locName = loc.name.toLowerCase()
    if (locName.includes(guName) || guName.includes(locName)) {
      return true
    }
  }

  return false
}
