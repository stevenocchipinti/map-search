/**
 * Test script for API endpoints
 * Runs the API functions directly without HTTP layer
 */

import { haversineDistance, estimateWalkingTime } from './src/lib/haversine.js';
import { findNearbySupermarkets } from './src/lib/overpass.js';
import { getWalkingRoutesBatch } from './src/lib/openroute.js';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, ...args: any[]) {
  console.log(color, ...args, colors.reset);
}

async function testGeocoding() {
  log(colors.cyan, '\n=== Testing Geocoding (Nominatim) ===');
  
  const testAddress = '123 Elizabeth St, Sydney NSW';
  log(colors.blue, `Address: ${testAddress}`);
  
  try {
    const params = new URLSearchParams({
      q: testAddress,
      format: 'json',
      addressdetails: '1',
      countrycodes: 'au',
      limit: '1',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'MapSearchApp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results = await response.json();
    
    if (results && results.length > 0) {
      const result = results[0];
      log(colors.green, '✅ Geocoding successful!');
      console.log('   Coordinates:', parseFloat(result.lat).toFixed(6), parseFloat(result.lon).toFixed(6));
      console.log('   Display Name:', result.display_name);
      console.log('   State:', result.address?.state);
    } else {
      log(colors.red, '❌ No results found');
    }
  } catch (error) {
    log(colors.red, '❌ Geocoding failed:', error instanceof Error ? error.message : error);
  }
}

async function testSupermarkets() {
  log(colors.cyan, '\n=== Testing Supermarkets (Overpass) ===');
  
  // Sydney coordinates
  const lat = -33.8688;
  const lng = 151.2093;
  const radius = 2000;
  
  log(colors.blue, `Location: ${lat}, ${lng}`);
  log(colors.blue, `Radius: ${radius}m`);
  
  try {
    const supermarkets = await findNearbySupermarkets(lat, lng, radius);
    
    log(colors.green, `✅ Found ${supermarkets.length} supermarkets`);
    
    // Calculate distances and show top 5
    const withDistances = supermarkets.map(s => ({
      ...s,
      distance: haversineDistance(lat, lng, s.lat, s.lng),
      walkingTime: estimateWalkingTime(haversineDistance(lat, lng, s.lat, s.lng)),
    }));
    
    withDistances.sort((a, b) => a.distance - b.distance);
    
    console.log('\n   Top 5 nearest:');
    withDistances.slice(0, 5).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name}`);
      console.log(`      Distance: ${s.distance.toFixed(2)}km (~${s.walkingTime} min walk)`);
      if (s.suburb || s.postcode) {
        console.log(`      Location: ${[s.suburb, s.postcode].filter(Boolean).join(', ')}`);
      }
    });
  } catch (error) {
    log(colors.red, '❌ Supermarkets fetch failed:', error instanceof Error ? error.message : error);
  }
}

async function testWalkingRoutes() {
  log(colors.cyan, '\n=== Testing Walking Routes (OpenRouteService) ===');
  
  // Check for API key
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    log(colors.red, '❌ ORS_API_KEY not found in environment');
    log(colors.yellow, '   Please ensure .env file has ORS_API_KEY set');
    return;
  }
  
  log(colors.blue, 'API Key: ' + apiKey.substring(0, 10) + '...');
  
  // Test route: Sydney CBD to nearby location
  const from = { lat: -33.8688, lng: 151.2093 };
  const destinations = [
    { lat: -33.8700, lng: 151.2100, category: 'school' as const, itemId: 'test-1' },
  ];
  
  log(colors.blue, `From: ${from.lat}, ${from.lng}`);
  log(colors.blue, `To: ${destinations[0].lat}, ${destinations[0].lng}`);
  
  try {
    const results = await getWalkingRoutesBatch(apiKey, from, destinations);
    
    if (results.length > 0 && results[0].route) {
      const route = results[0].route;
      log(colors.green, '✅ Walking route calculated!');
      console.log(`   Distance: ${route.distanceMeters}m`);
      console.log(`   Duration: ${route.durationMinutes} minutes`);
      console.log(`   Polyline: ${route.encodedPolyline?.substring(0, 50)}...`);
    } else {
      log(colors.yellow, '⚠️ No route returned (might be rate limited)');
    }
  } catch (error) {
    log(colors.red, '❌ Walking routes failed:', error instanceof Error ? error.message : error);
  }
}

async function runTests() {
  console.log(colors.cyan, '\n╔════════════════════════════════════════╗');
  console.log(colors.cyan, '║  API Endpoints Test Suite              ║');
  console.log(colors.cyan, '╚════════════════════════════════════════╝', colors.reset);
  
  await testGeocoding();
  
  // Wait 1 second (rate limiting)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testSupermarkets();
  
  // Wait 1 second (rate limiting)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testWalkingRoutes();
  
  log(colors.cyan, '\n=== Test Suite Complete ===\n');
}

// Run tests
runTests().catch(error => {
  log(colors.red, '\n❌ Test suite failed:', error);
  process.exit(1);
});
