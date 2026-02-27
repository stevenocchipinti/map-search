/**
 * API Client - Wrapper functions for backend endpoints
 *
 * All API endpoints run on localhost:3001 during development (Vercel CLI)
 * and on the deployed domain in production.
 *
 * Responses are cached in localStorage with TTL-based expiration so that
 * page refreshes and repeat searches don't hit the network unnecessarily.
 * The service worker cannot cache these because they use POST requests
 * (Cache API only supports GET).
 */

import type {
  GeocodeResponse,
  SupermarketsResponse,
  WalkingRoutesResponse,
  RouteRequest,
} from "../types"
import {
  getCached,
  setCached,
  geocodeCacheKey,
  supermarketsCacheKey,
  walkingRouteCacheKey,
} from "./api-cache"

const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3001" : ""

/**
 * Geocode an address to get coordinates and Australian state
 *
 * @param address - Full address string (e.g., "123 Main St, Sydney NSW")
 * @param options - Optional configuration including abort signal
 * @returns Coordinates, state, and display name
 */
export async function geocodeAddress(
  address: string,
  options?: { signal?: AbortSignal }
): Promise<GeocodeResponse> {
  // Check cache first
  const cacheKey = geocodeCacheKey(address)
  const cached = getCached<GeocodeResponse>("geocode", cacheKey)
  if (cached) {
    console.log("[API] Geocode cache hit:", address)
    return cached
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
      signal: options?.signal, // Pass abort signal
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Geocoding failed")
    }

    const data = await response.json()

    // Cache successful response
    if (!data.error) {
      setCached("geocode", cacheKey, data)
    }

    return data
  } catch (error) {
    // Re-throw abort errors so they can be handled separately
    if (error instanceof Error && error.name === "AbortError") {
      throw error
    }

    console.error("Geocode API error:", error)
    throw error
  }
}

/**
 * Fetch nearby supermarkets within a given radius
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param radius - Search radius in meters (default: 2000)
 * @returns List of supermarkets with distances
 */
export async function fetchSupermarkets(
  lat: number,
  lng: number,
  radius: number = 2000
): Promise<SupermarketsResponse> {
  // Check cache first
  const cacheKey = supermarketsCacheKey(lat, lng, radius)
  const cached = getCached<SupermarketsResponse>("supermarkets", cacheKey)
  if (cached) {
    console.log("[API] Supermarkets cache hit:", cacheKey)
    return cached
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/supermarkets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, radius }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Supermarkets fetch failed")
    }

    const data = await response.json()

    // Cache successful response
    if (!data.error) {
      setCached("supermarkets", cacheKey, data)
    }

    return data
  } catch (error) {
    console.error("Supermarkets API error:", error)
    throw error
  }
}

/**
 * Fetch walking routes for multiple POIs
 *
 * Each individual route within the batch is cached separately so that
 * different searches sharing the same origin→destination pair can reuse
 * cached routes without re-fetching the entire batch.
 *
 * @param routes - Array of route requests
 * @returns Array of walking routes (null for failed routes)
 */
export async function fetchWalkingRoutes(
  routes: RouteRequest[]
): Promise<WalkingRoutesResponse> {
  // Check if ALL routes in this batch are cached
  const cachedResults: (WalkingRoutesResponse["routes"][number] | undefined)[] =
    routes.map(route => {
      const key = walkingRouteCacheKey(
        route.fromLat,
        route.fromLng,
        route.toLat,
        route.toLng
      )
      return getCached<WalkingRoutesResponse["routes"][number]>(
        "walkingRoutes",
        key
      )
    })

  const allCached = cachedResults.every(r => r !== null && r !== undefined)

  if (allCached) {
    console.log("[API] Walking routes cache hit (all routes)")
    return {
      routes: cachedResults as WalkingRoutesResponse["routes"],
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/walking-routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routes }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Walking routes fetch failed")
    }

    const data: WalkingRoutesResponse = await response.json()

    // Cache each individual route
    if (!data.error && data.routes) {
      data.routes.forEach((route, i) => {
        if (route && routes[i]) {
          const key = walkingRouteCacheKey(
            routes[i].fromLat,
            routes[i].fromLng,
            routes[i].toLat,
            routes[i].toLng
          )
          setCached("walkingRoutes", key, route)
        }
      })
    }

    return data
  } catch (error) {
    console.error("Walking routes API error:", error)
    throw error
  }
}
