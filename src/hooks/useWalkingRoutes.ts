/**
 * Hook for managing walking routes with progressive enhancement
 *
 * Features:
 * - Sequential fetching with delays to respect API rate limits
 * - Route caching to avoid duplicate requests
 * - Loading states per route
 * - Automatic retry on failure
 */

import { useState, useCallback } from "react"
import type { WalkingRoute, RouteRequest, POI, SearchLocation } from "../types"
import { fetchWalkingRoutes } from "../lib/api-client"
import { getCacheKey } from "../utils/format"

interface WalkingRoutesResult {
  routeCache: Map<string, WalkingRoute>
  loading: Map<string, boolean>
  errors: Map<string, string>
  fetchRoute: (from: SearchLocation, to: POI) => Promise<WalkingRoute | null>
  fetchRoutesSequentially: (
    requests: Array<{ from: SearchLocation; to: POI }>
  ) => Promise<void>
  getCachedRoute: (from: SearchLocation, to: POI) => WalkingRoute | undefined
  clearCache: () => void
  isLoading: (from: SearchLocation, to: POI) => boolean
}

const FETCH_DELAY_MS = 1000 // 1 second delay between requests

export function useWalkingRoutes(): WalkingRoutesResult {
  const [routeCache, setRouteCache] = useState<Map<string, WalkingRoute>>(
    new Map()
  )
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  const setRouteLoading = useCallback((key: string, isLoading: boolean) => {
    setLoading(prev => {
      const next = new Map(prev)
      if (isLoading) {
        next.set(key, true)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])

  const setRouteError = useCallback((key: string, error: string | null) => {
    setErrors(prev => {
      const next = new Map(prev)
      if (error) {
        next.set(key, error)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])

  const getCachedRoute = useCallback(
    (from: SearchLocation, to: POI): WalkingRoute | undefined => {
      const key = getCacheKey(from, to)
      return routeCache.get(key)
    },
    [routeCache]
  )

  const isLoading = useCallback(
    (from: SearchLocation, to: POI): boolean => {
      const key = getCacheKey(from, to)
      return loading.get(key) || false
    },
    [loading]
  )

  const fetchRoute = useCallback(
    async (from: SearchLocation, to: POI): Promise<WalkingRoute | null> => {
      const key = getCacheKey(from, to)

      // Check cache first
      const cached = routeCache.get(key)
      if (cached) {
        return cached
      }

      // Check if already loading
      if (loading.get(key)) {
        console.log(`Route ${key} already loading, skipping duplicate request`)
        return null
      }

      setRouteLoading(key, true)
      setRouteError(key, null)

      try {
        const request: RouteRequest = {
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.latitude,
          toLng: to.longitude,
          category: to.category,
          itemId: to.id,
        }

        const response = await fetchWalkingRoutes([request])

        if (response.error) {
          throw new Error(response.error)
        }

        const route = response.routes[0]

        if (!route) {
          throw new Error("No route returned from API")
        }

        // Cache the route
        setRouteCache(prev => new Map(prev).set(key, route))

        console.log(`Fetched route for ${to.name}:`, {
          duration: route.duration,
          distance: route.distance,
        })

        return route
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch route"
        console.error(`Route fetch error for ${to.name}:`, err)
        setRouteError(key, errorMsg)
        return null
      } finally {
        setRouteLoading(key, false)
      }
    },
    [routeCache, loading, setRouteLoading, setRouteError]
  )

  const fetchRoutesSequentially = useCallback(
    async (
      requests: Array<{ from: SearchLocation; to: POI }>
    ): Promise<void> => {
      console.log(
        `Fetching ${requests.length} routes sequentially with ${FETCH_DELAY_MS}ms delays`
      )

      for (let i = 0; i < requests.length; i++) {
        const { from, to } = requests[i]

        // Check cache first
        const key = getCacheKey(from, to)
        if (routeCache.has(key)) {
          console.log(`Route ${i + 1}/${requests.length} cached: ${to.name}`)
          continue
        }

        console.log(`Fetching route ${i + 1}/${requests.length}: ${to.name}`)
        await fetchRoute(from, to)

        // Delay before next request (except for the last one)
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, FETCH_DELAY_MS))
        }
      }

      console.log("Sequential route fetching complete")
    },
    [routeCache, fetchRoute]
  )

  const clearCache = useCallback(() => {
    setRouteCache(new Map())
    setLoading(new Map())
    setErrors(new Map())
    console.log("Route cache cleared")
  }, [])

  return {
    routeCache,
    loading,
    errors,
    fetchRoute,
    fetchRoutesSequentially,
    getCachedRoute,
    clearCache,
    isLoading,
  }
}
