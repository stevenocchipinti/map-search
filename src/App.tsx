/**
 * Main App Component
 * 
 * This is the basic structure for Phase 3. UI components will be added in Phase 5.
 */

import { useState, useEffect } from 'react';
import type { SearchResponse, SelectedPOIs, POI, School, Station } from './types';
import { useDataLoader } from './hooks/useDataLoader';
import { useWalkingRoutes } from './hooks/useWalkingRoutes';
import { useGeolocation } from './hooks/useGeolocation';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSectorPreferences } from './hooks/useSectorPreferences';
import { geocodeAddress, fetchSupermarkets } from './lib/api-client';
import { haversineDistance } from './lib/haversine';
import { estimateWalkingTime } from './utils/format';
import './App.css';

const MAX_WALKING_DISTANCE_KM = 2.5;
const MAX_RESULTS_PER_CATEGORY = 10;

function App() {
  // Hooks
  const { loadState, getSchools, getStations, isStateLoaded } = useDataLoader();
  const { fetchRoutesSequentially } = useWalkingRoutes();
  const { getCurrentLocation } = useGeolocation();
  const isOnline = useOnlineStatus();
  const { sectors } = useSectorPreferences();

  // State
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<SelectedPOIs>({
    school: 0,
    station: 0,
    supermarket: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState('');

  // Check for shared address from PWA share target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('text');

    if (sharedText) {
      console.group('🔗 Share Target Activated');
      console.log('Raw shared text:', sharedText);
      console.log('Contains URL:', /https?:\/\//.test(sharedText));

      const cleanedAddress = sharedText
        .replace(/https?:\/\/[^\s]+/g, '')
        .trim();
      console.log('Cleaned address (preview):', cleanedAddress);
      console.groupEnd();

      // TODO Phase 5: Auto-populate and search
      setSearchAddress(cleanedAddress);
    }
  }, []);

  /**
   * Main search handler
   */
  const handleSearch = async (address: string): Promise<void> => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Geocode the address
      console.log('Step 1: Geocoding address:', address);
      const geocodeResult = await geocodeAddress(address);

      if (geocodeResult.error) {
        throw new Error(geocodeResult.error);
      }

      const { lat, lng, state, displayName } = geocodeResult;
      console.log('Geocoded:', { lat, lng, state });

      // Step 2: Load state data if not already loaded
      console.log('Step 2: Loading state data:', state);
      if (!isStateLoaded(state)) {
        await loadState(state);
      }

      // Step 3: Fetch supermarkets in parallel with data processing
      console.log('Step 3: Fetching supermarkets');
      const supermarketsPromise = fetchSupermarkets(lat, lng);

      // Step 4: Filter and sort schools
      console.log('Step 4: Filtering schools');
      const schools = filterAndSortSchools(
        getSchools(state),
        lat,
        lng,
        sectors
      );

      // Step 5: Filter and sort stations
      console.log('Step 5: Filtering stations');
      const stations = filterAndSortStations(
        getStations(state),
        lat,
        lng
      );

      // Wait for supermarkets
      const supermarketsResult = await supermarketsPromise;
      const supermarkets = supermarketsResult.supermarkets || [];

      console.log('Search results:', {
        schools: schools.length,
        stations: stations.length,
        supermarkets: supermarkets.length,
      });

      // Step 6: Set results (with estimated times)
      const results: SearchResponse = {
        location: { lat, lng, state, displayName },
        schools,
        stations,
        supermarkets,
      };

      setSearchResults(results);
      setSelectedPOIs({ school: 0, station: 0, supermarket: 0 });

      // Step 7: Fetch accurate walking routes in background
      console.log('Step 7: Fetching walking routes sequentially');
      const topPOIs = [
        ...(schools.length > 0 ? [{ from: results.location, to: schools[0] }] : []),
        ...(stations.length > 0 ? [{ from: results.location, to: stations[0] }] : []),
        ...(supermarkets.length > 0 ? [{ from: results.location, to: supermarkets[0] }] : []),
      ];

      // Don't await - let this happen in background
      if (topPOIs.length > 0) {
        fetchRoutesSequentially(topPOIs).catch(err => {
          console.error('Background route fetching failed:', err);
        });
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Search failed';
      console.error('Search error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle "Use my location"
   */
  const handleUseMyLocation = async (): Promise<void> => {
    const coords = await getCurrentLocation();
    if (coords) {
      // Reverse geocode coordinates to address
      const address = `${coords.latitude},${coords.longitude}`;
      await handleSearch(address);
    }
  };

  /**
   * Filter and sort schools by distance and sector
   */
  function filterAndSortSchools(
    schools: School[],
    lat: number,
    lng: number,
    selectedSectors: Set<string>
  ): POI[] {
    return schools
      .map(school => {
        const distance = haversineDistance(
          lat,
          lng,
          school.latitude,
          school.longitude
        );

        return {
          id: `school-${school.name}-${school.postcode}`,
          name: school.name,
          category: 'school' as const,
          latitude: school.latitude,
          longitude: school.longitude,
          distance,
          estimatedWalkingTime: estimateWalkingTime(distance),
          details: `${school.suburb}, ${school.sector}, ${school.type}`,
          sector: school.sector,
        };
      })
      .filter(poi => 
        poi.distance <= MAX_WALKING_DISTANCE_KM &&
        poi.sector &&
        selectedSectors.has(poi.sector)
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS_PER_CATEGORY);
  }

  /**
   * Filter and sort stations by distance
   */
  function filterAndSortStations(
    stations: Station[],
    lat: number,
    lng: number
  ): POI[] {
    return stations
      .map(station => {
        const distance = haversineDistance(
          lat,
          lng,
          station.latitude,
          station.longitude
        );

        return {
          id: `station-${station.name}-${station.state}`,
          name: station.name,
          category: 'station' as const,
          latitude: station.latitude,
          longitude: station.longitude,
          distance,
          estimatedWalkingTime: estimateWalkingTime(distance),
          details: station.state,
        };
      })
      .filter(poi => poi.distance <= MAX_WALKING_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS_PER_CATEGORY);
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Map Search</h1>
        <p className="text-sm opacity-90">
          {isOnline ? 'Online' : 'Offline'} • Phase 3 Complete
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchAddress)}
              placeholder="Enter an address..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => handleSearch(searchAddress)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <button
            onClick={handleUseMyLocation}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Use My Location
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Results Display */}
        {searchResults && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">
              Results for: {searchResults.location.displayName}
            </h2>

            {/* Schools */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Schools ({searchResults.schools.length})
              </h3>
              {searchResults.schools.length === 0 ? (
                <p className="text-gray-500">No schools found within walking distance</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.schools.map((school, index) => (
                    <li
                      key={school.id}
                      className={`p-4 border rounded-lg ${
                        selectedPOIs.school === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{school.name}</div>
                      <div className="text-sm text-gray-600">{school.details}</div>
                      <div className="text-sm text-gray-500">
                        {school.distance.toFixed(2)} km • ~{school.estimatedWalkingTime} min (estimated)
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Stations */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Train Stations ({searchResults.stations.length})
              </h3>
              {searchResults.stations.length === 0 ? (
                <p className="text-gray-500">No stations found within walking distance</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.stations.map((station, index) => (
                    <li
                      key={station.id}
                      className={`p-4 border rounded-lg ${
                        selectedPOIs.station === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{station.name}</div>
                      <div className="text-sm text-gray-500">
                        {station.distance.toFixed(2)} km • ~{station.estimatedWalkingTime} min (estimated)
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Supermarkets */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Supermarkets ({searchResults.supermarkets.length})
              </h3>
              {searchResults.supermarkets.length === 0 ? (
                <p className="text-gray-500">No supermarkets found within walking distance</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.supermarkets.map((supermarket, index) => (
                    <li
                      key={supermarket.id}
                      className={`p-4 border rounded-lg ${
                        selectedPOIs.supermarket === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{supermarket.name}</div>
                      <div className="text-sm text-gray-600">{supermarket.details}</div>
                      <div className="text-sm text-gray-500">
                        {supermarket.distance.toFixed(2)} km • ~{supermarket.estimatedWalkingTime} min (estimated)
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <footer className="bg-gray-100 p-2 text-xs text-gray-600 text-center">
        Phase 3: Core Hooks Complete • All 8 hooks implemented • {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
      </footer>
    </div>
  );
}

export default App;
