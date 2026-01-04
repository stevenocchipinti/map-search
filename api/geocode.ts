/**
 * Geocoding API endpoint
 * Converts address to coordinates using Nominatim (OpenStreetMap)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node"
import type { AustralianState } from "../src/types"

const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search"

// Rate limiting
let lastNominatimCall = 0
const NOMINATIM_RATE_LIMIT_MS = 1000 // 1 request per second

interface GeocodeResponse {
  lat: number
  lng: number
  state: AustralianState
  displayName: string
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address?: {
    state?: string
    postcode?: string
    suburb?: string
    city?: string
    town?: string
  }
}

/**
 * Extract Australian state from Nominatim address components
 */
function extractState(result: NominatimResult): AustralianState {
  const stateName = result.address?.state

  // Map state names to abbreviations
  const stateMap: Record<string, AustralianState> = {
    "New South Wales": "NSW",
    NSW: "NSW",
    Victoria: "VIC",
    VIC: "VIC",
    Queensland: "QLD",
    QLD: "QLD",
    "Western Australia": "WA",
    WA: "WA",
    "South Australia": "SA",
    SA: "SA",
    Tasmania: "TAS",
    TAS: "TAS",
    "Australian Capital Territory": "ACT",
    ACT: "ACT",
    "Northern Territory": "NT",
    NT: "NT",
  }

  if (stateName && stateMap[stateName]) {
    return stateMap[stateName]
  }

  // Fallback: Try to extract from display_name
  const displayName = result.display_name
  for (const [name, abbr] of Object.entries(stateMap)) {
    if (displayName.includes(name)) {
      return abbr
    }
  }

  // Last resort: Use postcode ranges to guess state
  const postcode = result.address?.postcode
  if (postcode) {
    const pc = parseInt(postcode)
    if (pc >= 2000 && pc <= 2999) return "NSW"
    if (pc >= 3000 && pc <= 3999) return "VIC"
    if (pc >= 4000 && pc <= 4999) return "QLD"
    if (pc >= 5000 && pc <= 5999) return "SA"
    if (pc >= 6000 && pc <= 6999) return "WA"
    if (pc >= 7000 && pc <= 7999) return "TAS"
    if (pc === 800 || pc === 900) return "NT"
    if (pc >= 2600 && pc <= 2620) return "ACT"
  }

  // Default to NSW if we can't determine
  console.warn("Could not determine state, defaulting to NSW:", result)
  return "NSW"
}

/**
 * Geocode endpoint handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { address } = req.body

    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "Address is required" })
    }

    // Rate limiting
    const now = Date.now()
    const timeSinceLastCall = now - lastNominatimCall
    if (timeSinceLastCall < NOMINATIM_RATE_LIMIT_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastCall)
      )
    }
    lastNominatimCall = Date.now()

    // Call Nominatim API
    const params = new URLSearchParams({
      q: address,
      format: "json",
      addressdetails: "1",
      countrycodes: "au", // Australia only
      limit: "1",
    })

    const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
      headers: {
        "User-Agent": "MapSearchApp/1.0", // Nominatim requires User-Agent
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const results: NominatimResult[] = await response.json()

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Address not found" })
    }

    const result = results[0]
    const state = extractState(result)

    const geocoded: GeocodeResponse = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      state,
      displayName: result.display_name,
    }

    return res.status(200).json(geocoded)
  } catch (error) {
    console.error("Geocoding error:", error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Geocoding failed",
    })
  }
}
