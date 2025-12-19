/**
 * Overpass API client for querying OpenStreetMap POIs
 * 
 * NOTE: Station queries are deprecated - stations are now loaded from static GeoJSON file
 * (see src/pages/api/search.ts loadStations() function)
 */

import { haversineDistance } from './haversine';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Rate limiting - Overpass has a soft limit, we'll be conservative
let lastOverpassCall = 0;
const OVERPASS_RATE_LIMIT_MS = 1000; // 1 second between calls

// Resource limits to avoid 504 errors
const OVERPASS_TIMEOUT_SECONDS = 60; // Increased from 10 to 60 for reliability
const OVERPASS_MAX_SIZE_BYTES = 268435456; // 256 MB - reasonable limit for POI queries

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'station';
}

export interface Grocery {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'grocery';
  suburb?: string;
  street?: string;
  postcode?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastOverpassCall;
  if (timeSinceLastCall < OVERPASS_RATE_LIMIT_MS) {
    await sleep(OVERPASS_RATE_LIMIT_MS - timeSinceLastCall);
  }
  lastOverpassCall = Date.now();
}

/**
 * Execute an Overpass query
 */
async function queryOverpass(query: string): Promise<any> {
  await enforceRateLimit();

  const response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Format grocery store name with location context
 * Priority: Name - Suburb > Name - Street > Name - Branch > Name - Postcode > Name (distance)
 * 
 * @param element The OSM element with tags
 * @param userLat User's latitude for distance calculation
 * @param userLng User's longitude for distance calculation
 * @returns Formatted name with location context
 */
function formatGroceryName(element: any, userLat: number, userLng: number): string {
  const baseName = element.tags?.name || 'Supermarket';
  
  // Remove store numbers/branch suffixes from base name
  const cleanName = baseName
    .replace(/\s+(Store|Branch|Outlet)\s*#?\d+/gi, '')
    .replace(/\s+#?\d+$/g, '')
    .trim() || baseName;
  
  // Extract location information
  const suburb = element.tags?.['addr:suburb'];
  const street = element.tags?.['addr:street'];
  const postcode = element.tags?.['addr:postcode'];
  const branch = element.tags?.branch;
  const fullName = element.tags?.full_name;
  
  // If full_name exists and is different from name, it might contain location info
  if (fullName && fullName !== baseName && fullName.includes(baseName)) {
    const locationPart = fullName.replace(baseName, '').trim();
    if (locationPart) {
      return fullName;
    }
  }
  
  // Priority 1: Suburb
  if (suburb) {
    return `${cleanName} - ${suburb}`;
  }
  
  // Priority 2: Street name
  if (street) {
    // Clean street name - remove "Street", "Road", etc. for brevity
    const shortStreet = street.replace(/\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Boulevard|Blvd)$/i, '');
    return `${cleanName} - ${shortStreet}`;
  }
  
  // Priority 3: Branch designation
  if (branch) {
    return `${cleanName} - ${branch}`;
  }
  
  // Priority 4: Postcode
  if (postcode) {
    return `${cleanName} - ${postcode}`;
  }
  
  // Fallback: Add distance to differentiate
  const elLat = element.center?.lat ?? element.lat;
  const elLng = element.center?.lon ?? element.lon;
  const distance = haversineDistance(userLat, userLng, elLat, elLng);
  return `${cleanName} (${distance.toFixed(2)}km)`;
}

/**
 * Find nearby train stations
 * @deprecated This function is no longer used - stations are loaded from static GeoJSON file.
 * See src/pages/api/search.ts loadStations() function instead.
 * @param lat Latitude
 * @param lng Longitude
 * @param radiusMeters Search radius in meters
 */
export async function findNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number = 2000 // Reduced from 3000 to 2000m for efficiency
): Promise<Station[]> {
  console.warn('findNearbyStations() is deprecated. Use static GeoJSON file instead.');
  const query = `
    [out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}][maxsize:${OVERPASS_MAX_SIZE_BYTES}];
    (
      node(around:${radiusMeters},${lat},${lng})["railway"="station"];
    );
    out center;
  `;

  try {
    const data = await queryOverpass(query);
    
    return data.elements
      .filter((el: any) => {
        // Exclude subway/metro-only stations, keep heavy rail
        const station = el.tags?.station;
        return station !== 'subway' && station !== 'monorail';
      })
      .map((el: any) => ({
        id: `station-${el.id}`,
        name: el.tags?.name || 'Train Station',
        lat: el.center?.lat ?? el.lat,
        lng: el.center?.lon ?? el.lon,
        type: 'station' as const,
      }))
      .filter((s: Station) => s.lat && s.lng); // Ensure valid coordinates
  } catch (error) {
    console.error('Overpass stations query failed:', error);
    throw error;
  }
}

/**
 * Find nearby grocery stores (supermarkets)
 * @param lat Latitude
 * @param lng Longitude
 * @param radiusMeters Search radius in meters
 */
export async function findNearbyGroceries(
  lat: number,
  lng: number,
  radiusMeters: number = 2000 // Reduced from 3000 to 2000m for efficiency
): Promise<Grocery[]> {
  const query = `
    [out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}][maxsize:${OVERPASS_MAX_SIZE_BYTES}];
    (
      node(around:${radiusMeters},${lat},${lng})["shop"="supermarket"];
      way(around:${radiusMeters},${lat},${lng})["shop"="supermarket"];
    );
    out tags center;
  `;

  try {
    const data = await queryOverpass(query);
    
    return data.elements.map((el: any) => {
      const elLat = el.center?.lat ?? el.lat;
      const elLng = el.center?.lon ?? el.lon;
      
      return {
        id: `grocery-${el.id}`,
        name: formatGroceryName(el, lat, lng),
        lat: elLat,
        lng: elLng,
        type: 'grocery' as const,
        suburb: el.tags?.['addr:suburb'],
        street: el.tags?.['addr:street'],
        postcode: el.tags?.['addr:postcode']
      };
    })
    .filter((g: Grocery) => g.lat && g.lng); // Ensure valid coordinates
  } catch (error) {
    console.error('Overpass groceries query failed:', error);
    throw error;
  }
}
