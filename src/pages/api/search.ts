import type { APIRoute } from "astro"
import { readFileSync } from "fs"
import { join } from "path"
import {
  haversineDistance,
  estimateWalkingTime,
  MAX_WALKING_DISTANCE_KM,
} from "../../lib/haversine"
import {
  findNearbyGroceries,
  type Grocery,
} from "../../lib/overpass"

// Mark this endpoint as server-rendered (not prerendered)
export const prerender = false

// Types
interface School {
  name: string
  suburb: string
  state: string
  postcode: string
  sector: "Government" | "Catholic" | "Independent"
  type: string
  latitude: number
  longitude: number
}

interface Station {
  id: string
  name: string
  lat: number
  lng: number
  operationalStatus?: string
}

interface SchoolWithDistance extends School {
  distance: number
  walkingTime: number | null
  walkingPath: GeoJSON.LineString | null
}

interface POIWithDistance {
  id: string
  name: string
  lat: number
  lng: number
  type: "station" | "grocery"
  distance: number
  walkingTime: number | null
  walkingPath: GeoJSON.LineString | null
}

interface SearchRequest {
  address?: string
  latitude?: number
  longitude?: number
  sectors: string[]
}

interface SearchResponse {
  userLocation: {
    lat: number
    lng: number
    address: string
  }
  results: {
    schools: SchoolWithDistance[]
    stations: POIWithDistance[]
    groceries: POIWithDistance[]
  }
  errors: {
    schools?: string
    stations?: string
    groceries?: string
    routing?: string
  }
}

// Rate limiting storage
const userRequestLog = new Map<string, number[]>()
let lastNominatimCall = 0

// Constants
const USER_RATE_LIMIT = 50
const USER_RATE_WINDOW = 60000
const NOMINATIM_RATE_LIMIT = 1000
const MAX_SCHOOLS_FOR_ROUTING = 3
const MAX_POIS_FOR_ROUTING = 3
const MAX_WALKING_TIME_MINUTES = 20
const POI_SEARCH_RADIUS_METERS = 2000 // Reduced from 3000 to reduce Overpass server load and avoid 504 errors

// Load schools data (cached)
let schoolsCache: School[] | null = null

function loadSchools(): School[] {
  if (schoolsCache) return schoolsCache

  try {
    const schoolsPath = join(process.cwd(), "public", "schools.json")
    const data = readFileSync(schoolsPath, "utf-8")
    schoolsCache = JSON.parse(data)
    return schoolsCache!
  } catch (error) {
    console.error("Failed to load schools.json:", error)
    throw new Error("Failed to load school data")
  }
}

// Load stations data from GeoJSON (cached)
let stationsCache: Station[] | null = null

function loadStations(): Station[] {
  if (stationsCache) return stationsCache

  try {
    const stationsPath = join(process.cwd(), "public", "stations.geojson")
    const data = readFileSync(stationsPath, "utf-8")
    const geojson = JSON.parse(data)
    
    // Parse GeoJSON FeatureCollection and extract stations
    if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON format")
    }
    
    const stations: Station[] = geojson.features
      .filter((feature: any) => {
        // Only include operational stations with valid coordinates
        const isOperational = feature.properties?.operationalstatus === "Operational"
        const hasCoordinates = feature.geometry?.coordinates && 
                              Array.isArray(feature.geometry.coordinates) &&
                              feature.geometry.coordinates.length === 2
        return isOperational && hasCoordinates
      })
      .map((feature: any) => ({
        id: feature.properties?.objectid?.toString() || `station-${feature.properties?.name}`,
        name: feature.properties?.name || "Unknown Station",
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
        operationalStatus: feature.properties?.operationalstatus
      }))
    
    stationsCache = stations
    console.log(`Loaded ${stations.length} operational stations from GeoJSON`)
    return stations
  } catch (error) {
    console.error("Failed to load stations.geojson:", error)
    throw new Error("Failed to load station data")
  }
}

// Rate limiting
function checkUserRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = userRequestLog.get(ip) || []
  const recentRequests = requests.filter(time => now - time < USER_RATE_WINDOW)

  if (recentRequests.length >= USER_RATE_LIMIT) {
    return false
  }

  recentRequests.push(now)
  userRequestLog.set(ip, recentRequests)

  if (userRequestLog.size > 1000) {
    for (const [key, value] of userRequestLog.entries()) {
      const recent = value.filter(time => now - time < USER_RATE_WINDOW)
      if (recent.length === 0) {
        userRequestLog.delete(key)
      } else {
        userRequestLog.set(key, recent)
      }
    }
  }

  return true
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; displayName: string }> {
  const now = Date.now()
  const timeSinceLastCall = now - lastNominatimCall

  if (timeSinceLastCall < NOMINATIM_RATE_LIMIT) {
    await sleep(NOMINATIM_RATE_LIMIT - timeSinceLastCall)
  }

  lastNominatimCall = Date.now()

  const query = encodeURIComponent(`${address}, Australia`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=au`

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SchoolFinder/1.0 (Australian school and amenity search)",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error("Geocoding service unavailable. Please try again later.")
  }

  const data = await response.json()

  if (!data || data.length === 0) {
    throw new Error(
      "Address not found. Please try a different address, suburb, or postcode."
    )
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  }
}

// Main handler
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || "unknown"

  if (!checkUserRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const body = (await request.json()) as SearchRequest

    // Validate sectors
    if (
      !body.sectors ||
      !Array.isArray(body.sectors) ||
      body.sectors.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Please select at least one school sector." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const validSectors = ["Government", "Catholic", "Independent"]
    const sectors = body.sectors.filter(s => validSectors.includes(s))

    if (sectors.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid school sectors provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get user location
    let userLat: number
    let userLng: number
    let displayAddress: string

    if (
      typeof body.latitude === "number" &&
      typeof body.longitude === "number"
    ) {
      userLat = body.latitude
      userLng = body.longitude
      displayAddress = body.address || "Current location"
    } else if (body.address && body.address.trim()) {
      const geocoded = await geocodeAddress(body.address.trim())
      userLat = geocoded.lat
      userLng = geocoded.lng
      displayAddress = geocoded.displayName
    } else {
      return new Response(
        JSON.stringify({
          error: "Please provide an address or use your current location.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const errors: SearchResponse["errors"] = {}

    // ============================================
    // PHASE 1: Haversine filtering (local, fast)
    // ============================================

    // Filter and sort schools
    const allSchools = loadSchools()
    const filteredSchools = allSchools.filter(school =>
      sectors.includes(school.sector)
    )

    const schoolsWithDistance = filteredSchools.map(school => ({
      ...school,
      distance: haversineDistance(
        userLat,
        userLng,
        school.latitude,
        school.longitude
      ),
      walkingTime: null as number | null,
      walkingPath: null as GeoJSON.LineString | null,
    }))

    // Filter to walkable distance and sort
    const nearbySchools = schoolsWithDistance
      .filter(s => s.distance <= MAX_WALKING_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)

    // ============================================
    // PHASE 2: Find nearby POIs (stations, groceries)
    // ============================================
    // Stations are loaded from static GeoJSON file
    // Groceries still use Overpass API (could be converted to static later)
    // Accurate walking times will be fetched by the client later via /api/walking-routes

    // Load all stations and filter by distance
    const allStations = loadStations()
    const stationsWithDistance: POIWithDistance[] = allStations
      .map(station => ({
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        type: "station" as const,
        distance: haversineDistance(userLat, userLng, station.lat, station.lng),
        walkingTime: null,
        walkingPath: null,
      }))
      .filter(s => s.distance <= MAX_WALKING_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10) // Limit to top 10 nearest stations

    // Fetch groceries from Overpass API
    const [groceriesResult] = await Promise.allSettled([
      findNearbyGroceries(userLat, userLng, POI_SEARCH_RADIUS_METERS),
    ])

    const groceriesData: Grocery[] =
      groceriesResult.status === "fulfilled" ? groceriesResult.value : []

    if (groceriesResult.status === "rejected") {
      errors.groceries = "Could not find supermarkets"
      console.warn("Grocery search failed:", groceriesResult.reason)
    }

    // Convert groceries to distance format

    const groceriesWithDistance: POIWithDistance[] = groceriesData.map(
      grocery => ({
        id: grocery.id,
        name: grocery.name,
        lat: grocery.lat,
        lng: grocery.lng,
        type: "grocery",
        distance: haversineDistance(userLat, userLng, grocery.lat, grocery.lng),
        walkingTime: null,
        walkingPath: null,
      })
    )

    // ============================================
    // PHASE 3: Filter and format results
    // ============================================

    // Filter schools to those within walking time threshold
    const walkableSchools = nearbySchools
      .filter(s => {
        if (s.walkingTime !== null) {
          return s.walkingTime <= MAX_WALKING_TIME_MINUTES
        }
        // If no walking time, use estimated time
        return estimateWalkingTime(s.distance) <= MAX_WALKING_TIME_MINUTES * 1.5
      })
      .sort((a, b) => {
        // Sort by walking time if available, otherwise by distance
        if (a.walkingTime !== null && b.walkingTime !== null) {
          return a.walkingTime - b.walkingTime
        }
        return a.distance - b.distance
      })

    // Filter POIs similarly
    const walkableStations = stationsWithDistance
      .filter(s => {
        if (s.walkingTime !== null) {
          return s.walkingTime <= MAX_WALKING_TIME_MINUTES
        }
        return estimateWalkingTime(s.distance) <= MAX_WALKING_TIME_MINUTES * 1.5
      })
      .sort(
        (a, b) => (a.walkingTime ?? a.distance) - (b.walkingTime ?? b.distance)
      )

    const walkableGroceries = groceriesWithDistance
      .filter(g => {
        if (g.walkingTime !== null) {
          return g.walkingTime <= MAX_WALKING_TIME_MINUTES
        }
        return estimateWalkingTime(g.distance) <= MAX_WALKING_TIME_MINUTES * 1.5
      })
      .sort(
        (a, b) => (a.walkingTime ?? a.distance) - (b.walkingTime ?? b.distance)
      )

    // Set error messages for empty results
    if (walkableSchools.length === 0 && !errors.schools) {
      errors.schools =
        "No schools within walking distance for selected sectors."
    }
    if (walkableStations.length === 0 && !errors.stations) {
      errors.stations = "No train stations within walking distance."
    }
    if (walkableGroceries.length === 0 && !errors.groceries) {
      errors.groceries = "No supermarkets within walking distance."
    }

    // Round distances
    walkableSchools.forEach(s => {
      s.distance = Math.round(s.distance * 100) / 100
    })
    walkableStations.forEach(s => {
      s.distance = Math.round(s.distance * 100) / 100
    })
    walkableGroceries.forEach(g => {
      g.distance = Math.round(g.distance * 100) / 100
    })

    const response: SearchResponse = {
      userLocation: {
        lat: userLat,
        lng: userLng,
        address: displayAddress,
      },
      results: {
        schools: walkableSchools,
        stations: walkableStations,
        groceries: walkableGroceries,
      },
      errors,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Search error:", error)
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred."
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
