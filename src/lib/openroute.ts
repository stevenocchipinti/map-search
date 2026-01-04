/**
 * OpenRouteService API client for walking routes
 */

const ORS_API_URL =
  "https://api.openrouteservice.org/v2/directions/foot-walking"

export interface WalkingRoute {
  durationMinutes: number
  distanceMeters: number
  encodedPolyline: string | null
}

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Get walking route between two points
 * @param apiKey OpenRouteService API key
 * @param from Starting coordinates
 * @param to Destination coordinates
 * @returns Walking route with duration, distance, and encoded polyline
 */
export async function getWalkingRoute(
  apiKey: string,
  from: Coordinates,
  to: Coordinates
): Promise<WalkingRoute> {
  const requestBody = {
    coordinates: [
      [from.lng, from.lat], // ORS uses [lng, lat] order
      [to.lng, to.lat],
    ],
    format: "geojson",
    units: "m",
    geometry: true,
    instructions: false,
  }

  const response = await fetch(ORS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT")
    }
    throw new Error(`ORS API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found")
  }

  const route = data.routes[0]
  const summary = route.summary

  return {
    durationMinutes: Math.round((summary?.duration || 0) / 60),
    distanceMeters: Math.round(summary?.distance || 0),
    encodedPolyline: route.geometry || null, // ORS returns encoded polyline
  }
}

/**
 * Get walking routes for multiple destinations
 * Processes sequentially to avoid rate limiting
 * @param apiKey OpenRouteService API key
 * @param from Starting coordinates
 * @param destinations Array of destination coordinates with metadata
 * @returns Array of results with route data or null if failed
 */
export async function getWalkingRoutesBatch<
  T extends { lat: number; lng: number },
>(
  apiKey: string,
  from: Coordinates,
  destinations: T[]
): Promise<(T & { route: WalkingRoute | null; error?: string })[]> {
  const results: (T & { route: WalkingRoute | null; error?: string })[] = []

  let rateLimitHit = false

  for (const dest of destinations) {
    if (rateLimitHit) {
      // Skip remaining if we hit rate limit
      results.push({
        ...dest,
        route: null,
        error: "Rate limit exceeded",
      })
      continue
    }

    try {
      const route = await getWalkingRoute(apiKey, from, {
        lat: dest.lat,
        lng: dest.lng,
      })
      results.push({
        ...dest,
        route,
      })
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMIT") {
        rateLimitHit = true
      }
      results.push({
        ...dest,
        route: null,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // Delay between requests to avoid rate limiting (ORS free tier)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}
