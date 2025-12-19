import type { APIRoute } from 'astro';
import { getWalkingRoute } from '../../lib/openroute';

// Mark this endpoint as server-rendered (not prerendered)
export const prerender = false;

interface WalkingRouteRequest {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  category: 'school' | 'station' | 'grocery';
  itemId: string;
}

interface WalkingRouteResponse {
  walkingTime: number | null;
  walkingPath: GeoJSON.LineString | null;
  distance: number | null;
  error?: string;
}

// Main handler
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as WalkingRouteRequest;

    console.log('[API] Walking routes request received');
    console.log('[API] Request body:', JSON.stringify(body, null, 2));

    // Validate request
    if (!body.from || !body.to || !body.from.lat || !body.from.lng || !body.to.lat || !body.to.lng) {
      console.error('[API] Invalid coordinates in request');
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orsApiKey = import.meta.env.ORS_API_KEY;

    if (!orsApiKey) {
      console.error('[API] ORS API key not configured');
      return new Response(
        JSON.stringify({ error: 'ORS API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[API] ORS API key found, calling getWalkingRoute()');

    try {
      const route = await getWalkingRoute(orsApiKey, body.from, { lat: body.to.lat, lng: body.to.lng });

      console.log('[API] Route calculation successful');
      console.log('[API] Walking time:', route.durationMinutes, 'minutes');
      console.log('[API] Distance:', route.distanceMeters, 'meters');

      const response: WalkingRouteResponse = {
        walkingTime: route.durationMinutes,
        walkingPath: route.geometry,
        distance: route.distanceMeters
      };

      console.log('[API] Returning success response to client');
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Error in getWalkingRoute():', errorMessage);
      console.error('[API] Full error:', error);
      
      // If it's a rate limit error, return 429
      if (errorMessage === 'RATE_LIMIT' || errorMessage.includes('429')) {
        console.warn('[API] Rate limit detected');
        return new Response(
          JSON.stringify({ 
            walkingTime: null,
            walkingPath: null,
            distance: null,
            error: 'Rate limited - please try again in a moment'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // For other errors, return null values with error message
      console.log('[API] Returning error response to client:', errorMessage);
      return new Response(
        JSON.stringify({ 
          walkingTime: null,
          walkingPath: null,
          distance: null,
          error: errorMessage
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[API] Unexpected error parsing request:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
