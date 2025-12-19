import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";

// Types
interface School {
  name: string;
  suburb: string;
  state: string;
  postcode: string;
  sector: "Government" | "Catholic" | "Independent";
  type: string;
  latitude: number;
  longitude: number;
}

interface SchoolWithDistance extends School {
  distance: number;
}

interface SearchRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
  sectors: string[];
}

interface SearchResponse {
  userLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  schools: SchoolWithDistance[];
  nearest: SchoolWithDistance | null;
}

interface ErrorResponse {
  error: string;
}

// Rate limiting storage (per-instance, resets on cold start)
const userRequestLog = new Map<string, number[]>();
let lastNominatimCall = 0;

// Constants
const USER_RATE_LIMIT = 50; // requests per minute
const USER_RATE_WINDOW = 60000; // 1 minute in ms
const NOMINATIM_RATE_LIMIT = 1000; // 1 second between requests
const MAX_RESULTS = 10;

// Load schools data (cached after first load)
let schoolsCache: School[] | null = null;

function loadSchools(): School[] {
  if (schoolsCache) return schoolsCache;

  try {
    const schoolsPath = join(process.cwd(), "public", "schools.json");
    const data = readFileSync(schoolsPath, "utf-8");
    schoolsCache = JSON.parse(data);
    return schoolsCache!;
  } catch (error) {
    console.error("Failed to load schools.json:", error);
    throw new Error("Failed to load school data");
  }
}

// Rate limiting functions
function checkUserRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = userRequestLog.get(ip) || [];
  const recentRequests = requests.filter(
    (time) => now - time < USER_RATE_WINDOW
  );

  if (recentRequests.length >= USER_RATE_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  userRequestLog.set(ip, recentRequests);

  // Cleanup old entries periodically
  if (userRequestLog.size > 1000) {
    for (const [key, value] of userRequestLog.entries()) {
      const recent = value.filter((time) => now - time < USER_RATE_WINDOW);
      if (recent.length === 0) {
        userRequestLog.delete(key);
      } else {
        userRequestLog.set(key, recent);
      }
    }
  }

  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; displayName: string }> {
  const now = Date.now();
  const timeSinceLastCall = now - lastNominatimCall;

  // Enforce rate limit to Nominatim (1 req/sec)
  if (timeSinceLastCall < NOMINATIM_RATE_LIMIT) {
    await sleep(NOMINATIM_RATE_LIMIT - timeSinceLastCall);
  }

  lastNominatimCall = Date.now();

  const query = encodeURIComponent(`${address}, Australia`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=au`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SchoolFinder/1.0 (Australian school search application)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error("Nominatim response error:", response.status);
    throw new Error("Geocoding service unavailable. Please try again later.");
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(
      "Address not found. Please try a different address, suburb, or postcode."
    );
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// Haversine distance calculation
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Main handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get client IP for rate limiting
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // Check user rate limit
  if (!checkUserRateLimit(ip)) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment before searching again.",
    });
  }

  try {
    const body = req.body as SearchRequest;

    // Validate request
    if (!body.sectors || !Array.isArray(body.sectors) || body.sectors.length === 0) {
      return res.status(400).json({
        error: "Please select at least one school sector.",
      });
    }

    const validSectors = ["Government", "Catholic", "Independent"];
    const sectors = body.sectors.filter((s) => validSectors.includes(s));

    if (sectors.length === 0) {
      return res.status(400).json({
        error: "Invalid school sectors provided.",
      });
    }

    // Get user location
    let userLat: number;
    let userLng: number;
    let displayAddress: string;

    if (
      typeof body.latitude === "number" &&
      typeof body.longitude === "number"
    ) {
      // Use provided coordinates (from "Use My Location")
      userLat = body.latitude;
      userLng = body.longitude;
      displayAddress = body.address || "Current location";
    } else if (body.address && body.address.trim()) {
      // Geocode the address
      const geocoded = await geocodeAddress(body.address.trim());
      userLat = geocoded.lat;
      userLng = geocoded.lng;
      displayAddress = geocoded.displayName;
    } else {
      return res.status(400).json({
        error: "Please provide an address or use your current location.",
      });
    }

    // Load and filter schools
    const allSchools = loadSchools();
    const filteredSchools = allSchools.filter((school) =>
      sectors.includes(school.sector)
    );

    if (filteredSchools.length === 0) {
      return res.status(404).json({
        error: "No schools found matching the selected sectors.",
      });
    }

    // Calculate distances and sort
    const schoolsWithDistance: SchoolWithDistance[] = filteredSchools.map(
      (school) => ({
        ...school,
        distance: haversineDistance(
          userLat,
          userLng,
          school.latitude,
          school.longitude
        ),
      })
    );

    // Sort by distance and take top N
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);
    const nearestSchools = schoolsWithDistance.slice(0, MAX_RESULTS);

    // Round distances to 2 decimal places
    nearestSchools.forEach((school) => {
      school.distance = Math.round(school.distance * 100) / 100;
    });

    const response: SearchResponse = {
      userLocation: {
        lat: userLat,
        lng: userLng,
        address: displayAddress,
      },
      schools: nearestSchools,
      nearest: nearestSchools[0] || null,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Search error:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return res.status(500).json({ error: message });
  }
}
