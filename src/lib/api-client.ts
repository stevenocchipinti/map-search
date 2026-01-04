/**
 * API Client - Wrapper functions for backend endpoints
 *
 * All API endpoints run on localhost:3001 during development (Vercel CLI)
 * and on the deployed domain in production.
 */

import type {
  GeocodeResponse,
  SupermarketsResponse,
  WalkingRoutesResponse,
  RouteRequest,
} from "../types"

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
    return data
  } catch (error) {
    console.error("Supermarkets API error:", error)
    throw error
  }
}

/**
 * Fetch walking routes for multiple POIs
 *
 * @param routes - Array of route requests
 * @returns Array of walking routes (null for failed routes)
 */
export async function fetchWalkingRoutes(
  routes: RouteRequest[]
): Promise<WalkingRoutesResponse> {
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

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Walking routes API error:", error)
    throw error
  }
}
