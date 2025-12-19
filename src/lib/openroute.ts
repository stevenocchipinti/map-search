/**
 * OpenRouteService API client for walking routes
 */

const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking';

export interface WalkingRoute {
  durationMinutes: number;
  distanceMeters: number;
  geometry: GeoJSON.LineString | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Decode polyline encoded geometry from ORS API
 * ORS uses Google's polyline encoding algorithm
 * @param encoded The encoded polyline string
 * @returns GeoJSON LineString or null if unable to decode
 */
function decodePolyline(encoded: string | undefined): GeoJSON.LineString | null {
  if (!encoded) return null;

  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }

  return {
    type: 'LineString',
    coordinates: points,
  };
}

/**
 * Get walking route between two points
 * @param apiKey OpenRouteService API key
 * @param from Starting coordinates
 * @param to Destination coordinates
 * @returns Walking route with duration, distance, and path geometry
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
    format: 'geojson',
    units: 'm',
    geometry: true,
    instructions: false,
  };

  console.log('[ORS] Request initiated');
  console.log('[ORS] From coordinates:', { lat: from.lat, lng: from.lng });
  console.log('[ORS] To coordinates:', { lat: to.lat, lng: to.lng });
  console.log('[ORS] Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(ORS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[ORS] Response status:', response.status);
  console.log('[ORS] Response statusText:', response.statusText);
  console.log('[ORS] Response headers:', {
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ORS] API error - status not OK');
    console.error('[ORS] Error response:', errorText);
    
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error(`ORS API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[ORS] Parsed response:', JSON.stringify(data, null, 2));

  // ORS returns routes array, not features array
  // The format parameter doesn't actually affect the response format for this endpoint
  if (!data.routes || data.routes.length === 0) {
    console.error('[ORS] No routes in response');
    console.error('[ORS] data.routes:', data.routes);
    console.error('[ORS] data.routes?.length:', data.routes?.length);
    throw new Error('No route found');
  }

  const route = data.routes[0];
  const summary = route.summary;

  console.log('[ORS] Route found');
  console.log('[ORS] Route summary:', summary);
  console.log('[ORS] Duration (seconds):', summary?.duration);
  console.log('[ORS] Distance (meters):', summary?.distance);
  console.log('[ORS] Geometry type:', typeof route.geometry);
  console.log('[ORS] Geometry (encoded polyline):', route.geometry);

  return {
    durationMinutes: Math.round((summary?.duration || 0) / 60),
    distanceMeters: Math.round(summary?.distance || 0),
    geometry: decodePolyline(route.geometry) || null,
  };
}

/**
 * Get walking routes for multiple destinations
 * Processes sequentially to avoid rate limiting
 * @param apiKey OpenRouteService API key
 * @param from Starting coordinates
 * @param destinations Array of destination coordinates with metadata
 * @returns Array of results with route data or null if failed
 */
export async function getWalkingRoutesBatch<T extends { lat: number; lng: number }>(
  apiKey: string,
  from: Coordinates,
  destinations: T[]
): Promise<(T & { walkingTime: number | null; walkingPath: GeoJSON.LineString | null; routeError?: string })[]> {
  const results: (T & { walkingTime: number | null; walkingPath: GeoJSON.LineString | null; routeError?: string })[] = [];
  
  let rateLimitHit = false;

  for (const dest of destinations) {
    if (rateLimitHit) {
      // Skip remaining if we hit rate limit
      results.push({
        ...dest,
        walkingTime: null,
        walkingPath: null,
        routeError: 'Rate limit exceeded',
      });
      continue;
    }

    try {
      const route = await getWalkingRoute(apiKey, from, { lat: dest.lat, lng: dest.lng });
      results.push({
        ...dest,
        walkingTime: route.durationMinutes,
        walkingPath: route.geometry,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMIT') {
        rateLimitHit = true;
      }
      results.push({
        ...dest,
        walkingTime: null,
        walkingPath: null,
        routeError: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Small delay between requests to be nice to the API and avoid rate limiting
    // ORS free tier is rate limited, so we use a 500ms delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
