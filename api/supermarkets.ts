/**
 * Supermarkets API endpoint
 * Fetches nearby supermarkets using Overpass API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findNearbySupermarkets } from '../src/lib/overpass';
import { haversineDistance, estimateWalkingTime } from '../src/lib/haversine';

interface SupermarketRequest {
  lat: number;
  lng: number;
  radius?: number;
}

interface SupermarketPOI {
  id: string;
  name: string;
  category: 'supermarket';
  latitude: number;
  longitude: number;
  distance: number; // Haversine km
  estimatedWalkingTime: number; // Minutes
  details?: string;
}

/**
 * Supermarkets endpoint handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow both GET and POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lat, lng, radius = 2000 } = req.method === 'POST' ? req.body : req.query;

    // Validate input
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string) || 2000;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid lat/lng parameters' });
    }

    if (latitude < -90 || latitude > -10) {
      return res.status(400).json({ error: 'Latitude out of range for Australia' });
    }

    if (longitude < 110 || longitude > 155) {
      return res.status(400).json({ error: 'Longitude out of range for Australia' });
    }

    // Fetch supermarkets from Overpass
    const supermarkets = await findNearbySupermarkets(latitude, longitude, searchRadius);

    // Convert to POI format with distance and estimated time
    const pois: SupermarketPOI[] = supermarkets.map(supermarket => {
      const distance = haversineDistance(latitude, longitude, supermarket.lat, supermarket.lng);
      const estimatedTime = estimateWalkingTime(distance);

      return {
        id: supermarket.id,
        name: supermarket.name,
        category: 'supermarket' as const,
        latitude: supermarket.lat,
        longitude: supermarket.lng,
        distance,
        estimatedWalkingTime: estimatedTime,
        details: [supermarket.suburb, supermarket.postcode].filter(Boolean).join(', ') || undefined,
      };
    });

    // Sort by distance
    pois.sort((a, b) => a.distance - b.distance);

    // Return top 10
    const topPOIs = pois.slice(0, 10);

    return res.status(200).json({ supermarkets: topPOIs });

  } catch (error) {
    console.error('Supermarkets error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch supermarkets' 
    });
  }
}
