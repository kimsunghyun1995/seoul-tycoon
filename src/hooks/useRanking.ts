import { useMemo } from 'react'
import type { AreaData, CulturalEvent, RankedArea, CongestionLevel } from '../types'
import { LOCATIONS } from '../services/LocationRegistry'

export type SortMode = 'congestion' | 'population' | 'events'

const CONGESTION_ORDER: Record<CongestionLevel, number> = {
  '붐빔': 4,
  '약간 붐빔': 3,
  '보통': 2,
  '여유': 1,
}

export function useRanking(
  data: Map<string, AreaData>,
  eventsByArea: Map<string, CulturalEvent[]>,
  sortMode: SortMode = 'congestion'
): RankedArea[] {
  return useMemo(() => {
    const ranked: RankedArea[] = []

    for (const loc of LOCATIONS) {
      const areaData = data.get(loc.name)
      if (!areaData?.population) continue

      const { areaCongestLvl, areaPopMin, areaPopMax } = areaData.population
      const populationAvg = (areaPopMin + areaPopMax) / 2
      const events = eventsByArea.get(loc.code) ?? []

      ranked.push({
        code: loc.code,
        name: loc.name,
        congestionLevel: areaCongestLvl,
        populationAvg,
        events,
      })
    }

    ranked.sort((a, b) => {
      if (sortMode === 'congestion') {
        const diff = CONGESTION_ORDER[b.congestionLevel] - CONGESTION_ORDER[a.congestionLevel]
        if (diff !== 0) return diff
        return b.populationAvg - a.populationAvg
      }
      if (sortMode === 'population') {
        return b.populationAvg - a.populationAvg
      }
      // 'events'
      const evDiff = b.events.length - a.events.length
      if (evDiff !== 0) return evDiff
      return CONGESTION_ORDER[b.congestionLevel] - CONGESTION_ORDER[a.congestionLevel]
    })

    return ranked
  }, [data, eventsByArea, sortMode])
}
