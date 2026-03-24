import type { HotRestaurant } from '../types'

// Use same Supabase URL base
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

let cache: HotRestaurant[] = []
let lastFetch = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function fetchHotRestaurants(): Promise<HotRestaurant[]> {
  if (cache.length > 0 && Date.now() - lastFetch < CACHE_TTL) return cache

  if (!SUPABASE_URL) return []

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-restaurants`)
  if (!res.ok) return cache // fallback to old cache

  const data = await res.json()
  cache = Array.isArray(data) ? data : []
  lastFetch = Date.now()
  return cache
}

/** Reset cache (useful for testing) */
export function resetRestaurantCache(): void {
  cache = []
  lastFetch = 0
}
