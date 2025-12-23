/**
 * Main App Component
 * 
 * Phase 4: Integrated with interactive map visualization
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
import { estimateWalkingTime, formatDistance, formatDuration } from './utils/format';
import { Map } from './components/Map/Map';
import { MapMarker } from './components/Map/MapMarker';
import { MapPolyline } from './components/Map/MapPolyline';
import { latLngBounds, type LatLngBounds } from 'leaflet';
import './App.css';

const MAX_WALKING_DISTANCE_KM = 2.5;
const MAX_RESULTS_PER_CATEGORY = 10;

function App() {
  // Hooks
  const { loadState, getSchools, getStations, isStateLoaded } = useDataLoader();
  const { routeCache, fetchRoutesSequentially, getCachedRoute } = useWalkingRoutes();
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

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-33.8688, 151.2093]); // Sydney default
  const [mapZoom, setMapZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

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
      let schools: School[] = [];
      let stations: Station[] = [];
      
      if (!isStateLoaded(state)) {
        const data = await loadState(state);
        schools = data.schools;
        stations = data.stations;
      } else {
        schools = getSchools(state);
        stations = getStations(state);
      }

      // Step 3: Fetch supermarkets in parallel with data processing
      console.log('Step 3: Fetching supermarkets');
      const supermarketsPromise = fetchSupermarkets(lat, lng);

      // Step 4: Filter and sort schools
      const filteredSchools = filterAndSortSchools(
        schools,
        lat,
        lng,
        sectors
      );

      // Step 5: Filter and sort stations
      console.log('Step 5: Filtering stations');
      const filteredStations = filterAndSortStations(
        stations,
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
        schools: filteredSchools,
        stations: filteredStations,
        supermarkets,
      };

      setSearchResults(results);
      setSelectedPOIs({ school: 0, station: 0, supermarket: 0 });

      // Calculate map bounds to fit all POIs
      const allPOIs = [
        ...filteredSchools,
        ...filteredStations,
        ...supermarkets,
      ];

      if (allPOIs.length > 0) {
        // Create bounds that include user location and all POIs
        const bounds = latLngBounds([]);
        bounds.extend([lat, lng]); // User location
        
        allPOIs.forEach(poi => {
          bounds.extend([poi.latitude, poi.longitude]);
        });
        
        setMapBounds(bounds);
      } else {
        // No POIs found, just center on user location
        setMapCenter([lat, lng]);
        setMapZoom(14);
        setMapBounds(null);
      }

      // Step 7: Fetch accurate walking routes in background
      console.log('Step 7: Fetching walking routes sequentially');
      const topPOIs = [
        ...(filteredSchools.length > 0 ? [{ from: results.location, to: filteredSchools[0] }] : []),
        ...(filteredStations.length > 0 ? [{ from: results.location, to: filteredStations[0] }] : []),
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
   * Handle selecting an alternative POI
   */
  const handleSelectPOI = (category: 'school' | 'station' | 'supermarket', index: number): void => {
    setSelectedPOIs(prev => ({ ...prev, [category]: index }));
    
    // Fetch route if not cached
    if (searchResults) {
      const pois = category === 'school' 
        ? searchResults.schools 
        : category === 'station' 
        ? searchResults.stations 
        : searchResults.supermarkets;
      
      const poi = pois[index];
      const route = getCachedRoute(searchResults.location, poi);
      
      if (!route) {
        // Fetch route in background
        fetchRoutesSequentially([{ from: searchResults.location, to: poi }]).catch(err => {
          console.error('Failed to fetch route:', err);
        });
      }
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

  // Get selected POIs for map rendering
  const selectedSchool = searchResults?.schools[selectedPOIs.school];
  const selectedStation = searchResults?.stations[selectedPOIs.station];
  const selectedSupermarket = searchResults?.supermarkets[selectedPOIs.supermarket];

  // Get cached routes for selected POIs
  const schoolRoute = selectedSchool && searchResults 
    ? getCachedRoute(searchResults.location, selectedSchool)
    : null;
  const stationRoute = selectedStation && searchResults
    ? getCachedRoute(searchResults.location, selectedStation)
    : null;
  const supermarketRoute = selectedSupermarket && searchResults
    ? getCachedRoute(searchResults.location, selectedSupermarket)
    : null;

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10">
        <h1 className="text-2xl font-bold">Map Search</h1>
        <p className="text-sm opacity-90">
          {isOnline ? 'Online' : 'Offline'} • Phase 4: Map Components
        </p>
      </header>

      {/* Main Content - Desktop: Sidebar (40%) + Map (60%), Mobile: Stacked */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ flexDirection: window.innerWidth >= 768 ? 'row' : 'column' }}>
        {/* Sidebar */}
        <div className="w-full md:w-2/5 flex flex-col overflow-hidden bg-white" style={{ width: window.innerWidth >= 768 ? '40%' : '100%' }}>
          {/* Search Form */}
          <div className="p-4 border-b">
            <div className="flex gap-2 mb-2">
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
              <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-auto p-4">
            {searchResults && (
              <div>
                <h2 className="text-lg font-bold mb-4 text-gray-700">
                  Results for: {searchResults.location.displayName.split(',').slice(0, 2).join(',')}
                </h2>

                {/* Schools */}
                <section className="mb-6">
                  <h3 className="text-md font-semibold mb-2 text-gray-800">
                    Schools ({searchResults.schools.length})
                  </h3>
                  {searchResults.schools.length === 0 ? (
                    <p className="text-gray-500 text-sm">No schools found within walking distance</p>
                  ) : (
                    <ul className="space-y-2">
                      {searchResults.schools.map((school, index) => {
                        const route = getCachedRoute(searchResults.location, school);
                        const isSelected = selectedPOIs.school === index;
                        
                        return (
                          <li
                            key={school.id}
                            onClick={() => handleSelectPOI('school', index)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-300 hover:border-gray-400 hover:shadow'
                            }`}
                          >
                            <div className="font-semibold text-sm">{school.name}</div>
                            <div className="text-xs text-gray-600 mt-1">{school.details}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistance(school.distance)} • {
                                route 
                                  ? `${formatDuration(route.duration)} (actual)`
                                  : `~${school.estimatedWalkingTime} min (est)`
                              }
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Stations */}
                <section className="mb-6">
                  <h3 className="text-md font-semibold mb-2 text-gray-800">
                    Train Stations ({searchResults.stations.length})
                  </h3>
                  {searchResults.stations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No stations found within walking distance</p>
                  ) : (
                    <ul className="space-y-2">
                      {searchResults.stations.map((station, index) => {
                        const route = getCachedRoute(searchResults.location, station);
                        const isSelected = selectedPOIs.station === index;
                        
                        return (
                          <li
                            key={station.id}
                            onClick={() => handleSelectPOI('station', index)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-300 hover:border-gray-400 hover:shadow'
                            }`}
                          >
                            <div className="font-semibold text-sm">{station.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistance(station.distance)} • {
                                route 
                                  ? `${formatDuration(route.duration)} (actual)`
                                  : `~${station.estimatedWalkingTime} min (est)`
                              }
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Supermarkets */}
                <section className="mb-6">
                  <h3 className="text-md font-semibold mb-2 text-gray-800">
                    Supermarkets ({searchResults.supermarkets.length})
                  </h3>
                  {searchResults.supermarkets.length === 0 ? (
                    <p className="text-gray-500 text-sm">No supermarkets found within walking distance</p>
                  ) : (
                    <ul className="space-y-2">
                      {searchResults.supermarkets.map((supermarket, index) => {
                        const route = getCachedRoute(searchResults.location, supermarket);
                        const isSelected = selectedPOIs.supermarket === index;
                        
                        return (
                          <li
                            key={supermarket.id}
                            onClick={() => handleSelectPOI('supermarket', index)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-300 hover:border-gray-400 hover:shadow'
                            }`}
                          >
                            <div className="font-semibold text-sm">{supermarket.name}</div>
                            <div className="text-xs text-gray-600 mt-1">{supermarket.details}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistance(supermarket.distance)} • {
                                route 
                                  ? `${formatDuration(route.duration)} (actual)`
                                  : `~${supermarket.estimatedWalkingTime} min (est)`
                              }
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {!searchResults && !loading && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg mb-2">Search for an address to get started</p>
                <p className="text-sm">Find nearby schools, train stations, and supermarkets</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="w-full md:w-3/5 h-64 md:flex-1 bg-gray-100" style={{ width: window.innerWidth >= 768 ? '60%' : '100%', height: window.innerWidth >= 768 ? '100%' : '256px', flex: window.innerWidth >= 768 ? '1' : '0 1 auto' }}>
          <Map center={mapCenter} zoom={mapZoom} bounds={mapBounds}>
            {/* User location marker */}
            {searchResults && (
              <MapMarker
                position={[searchResults.location.lat, searchResults.location.lng]}
                type="user"
              />
            )}

            {/* Selected POI markers with pins */}
            {selectedSchool && (
              <MapMarker
                position={[selectedSchool.latitude, selectedSchool.longitude]}
                type="school"
                sector={selectedSchool.sector}
                selected={true}
                onClick={() => handleSelectPOI('school', selectedPOIs.school)}
              />
            )}

            {selectedStation && (
              <MapMarker
                position={[selectedStation.latitude, selectedStation.longitude]}
                type="station"
                selected={true}
                onClick={() => handleSelectPOI('station', selectedPOIs.station)}
              />
            )}

            {selectedSupermarket && (
              <MapMarker
                position={[selectedSupermarket.latitude, selectedSupermarket.longitude]}
                type="supermarket"
                selected={true}
                onClick={() => handleSelectPOI('supermarket', selectedPOIs.supermarket)}
              />
            )}

            {/* Alternative POI markers (hollow dots) */}
            {searchResults?.schools.map((school, index) => {
              if (index === selectedPOIs.school) return null;
              return (
                <MapMarker
                  key={school.id}
                  position={[school.latitude, school.longitude]}
                  type="school"
                  sector={school.sector}
                  isAlternative={true}
                  onClick={() => handleSelectPOI('school', index)}
                />
              );
            })}

            {searchResults?.stations.map((station, index) => {
              if (index === selectedPOIs.station) return null;
              return (
                <MapMarker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  type="station"
                  isAlternative={true}
                  onClick={() => handleSelectPOI('station', index)}
                />
              );
            })}

            {searchResults?.supermarkets.map((supermarket, index) => {
              if (index === selectedPOIs.supermarket) return null;
              return (
                <MapMarker
                  key={supermarket.id}
                  position={[supermarket.latitude, supermarket.longitude]}
                  type="supermarket"
                  isAlternative={true}
                  onClick={() => handleSelectPOI('supermarket', index)}
                />
              );
            })}

            {/* Walking route polylines for selected POIs */}
            {schoolRoute && selectedSchool && (
              <MapPolyline
                encodedPolyline={schoolRoute.polyline}
                category="school"
                sector={selectedSchool.sector}
              />
            )}

            {stationRoute && (
              <MapPolyline
                encodedPolyline={stationRoute.polyline}
                category="station"
              />
            )}

            {supermarketRoute && (
              <MapPolyline
                encodedPolyline={supermarketRoute.polyline}
                category="supermarket"
              />
            )}
          </Map>
        </div>
      </div>

      {/* Debug Info */}
      <footer className="bg-gray-100 p-2 text-xs text-gray-600 text-center">
        Phase 4: Map Components Complete • {routeCache.size} routes cached • {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
      </footer>
    </div>
  );
}

export default App;
