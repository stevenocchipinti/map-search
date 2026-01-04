/**
 * Walking Routes API endpoint
 * Calculates walking routes using OpenRouteService
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getWalkingRoutesBatch } from "../src/lib/openroute.js"
import type { POICategory } from "../src/types/index.js"

interface RouteRequest {
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  category: POICategory
  itemId: string
}

interface RouteResponse {
  duration: number // Minutes
  distance: number // Meters
  polyline: string // Encoded polyline
}

/**
 * Walking routes endpoint handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { routes } = req.body

    // Validate input
    if (!Array.isArray(routes)) {
      return res.status(400).json({ error: "Routes must be an array" })
    }

    if (routes.length === 0) {
      return res.status(400).json({ error: "At least one route is required" })
    }

    if (routes.length > 10) {
      return res.status(400).json({ error: "Maximum 10 routes per request" })
    }

    // Validate each route
    for (const route of routes) {
      if (
        typeof route.fromLat !== "number" ||
        typeof route.fromLng !== "number" ||
        typeof route.toLat !== "number" ||
        typeof route.toLng !== "number"
      ) {
        return res.status(400).json({ error: "Invalid route coordinates" })
      }
    }

    // Get API key from environment
    const apiKey = process.env.ORS_API_KEY
    if (!apiKey) {
      console.error("ORS_API_KEY not configured")
      return res.status(500).json({ error: "API key not configured" })
    }

    // Prepare destinations for batch processing
    const destinations = routes.map(route => ({
      lat: route.toLat,
      lng: route.toLng,
      category: route.category,
      itemId: route.itemId,
    }))

    // Use the first route's origin as the "from" point
    const from = {
      lat: routes[0].fromLat,
      lng: routes[0].fromLng,
    }

    // Fetch routes in batch (sequential with delays)
    const results = await getWalkingRoutesBatch(apiKey, from, destinations)

    // Convert to response format
    const routeResponses: (RouteResponse | null)[] = results.map(result => {
      if (!result.route) {
        return null // Route failed or rate limited
      }

      return {
        duration: result.route.durationMinutes,
        distance: result.route.distanceMeters,
        polyline: result.route.encodedPolyline || "",
      }
    })

    return res.status(200).json({ routes: routeResponses })
  } catch (error) {
    console.error("Walking routes error:", error)

    // Special handling for rate limit errors
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Please try again later." })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to calculate routes",
    })
  }
}
