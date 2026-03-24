import { useState, useEffect } from 'react'
import { fetchHotRestaurants } from '../services/RestaurantService'
import type { HotRestaurant } from '../types'

export function useHotRestaurants() {
  const [restaurants, setRestaurants] = useState<HotRestaurant[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchHotRestaurants()
      .then(setRestaurants)
      .finally(() => setLoading(false))
  }, [])

  return { restaurants, loading }
}
