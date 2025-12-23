/**
 * Main App Component
 * 
 * Phase 5: Modern UI with Sidebar Components
 */

import { useState, useEffect } from 'react';
import type { SearchResponse, SelectedPOIs, POI, School, Station, POICategory } from './types';
import { useDataLoader } from './hooks/useDataLoader';
import { useWalkingRoutes } from './hooks/useWalkingRoutes';
import { useGeolocation } from './hooks/useGeolocation';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSectorPreferences } from './hooks/useSectorPreferences';
import { geocodeAddress, fetchSupermarkets } from './lib/api-client';
import { haversineDistance } from './lib/haversine';
import { estimateWalkingTime } from './utils/format';
import { Map } from './components/Map/Map';
import { MapMarker } from './components/Map/MapMarker';
import { MapPolyline } from './components/Map/MapPolyline';
import { Sidebar } from './components/Sidebar/Sidebar';
import { latLngBounds, type LatLngBounds } from 'leaflet';
import './App.css';

const MAX_WALKING_DISTANCE_KM = 2.5;
const MAX_RESULTS_PER_CATEGORY = 10;

function App() {
  // Hooks
  const { loadState, getSchools, getStations, isStateLoaded } = useDataLoader();
  const { fetchRoutesSequentially, getCachedRoute } = useWalkingRoutes();
  const { getCurrentLocation } = useGeolocation();
  const isOnline = useOnlineStatus();
  const { sectors, toggleSector } = useSectorPreferences();

  // State
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<SelectedPOIs>({
    school: 0,
    station: 0,
    supermarket: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-33.8688, 151.2093]); // Sydney default
  const [mapZoom, setMapZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  // Route loading states
  const [routeLoadingStates, setRouteLoadingStates] = useState({
    school: false,
    station: false,
    supermarket: false,
  });

  // Mobile view toggle (list vs map)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

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

      // Auto-search shared address
      handleSearch(cleanedAddress);
    }
  }, []);

  /**
   * Re-filter schools when sectors change
   */
  useEffect(() => {
    if (searchResults) {
      const { location } = searchResults;
      const state = location.state;
      const schools = getSchools(state);
      
      const filteredSchools = filterAndSortSchools(
        schools,
        location.lat,
        location.lng,
        sectors
      );

      setSearchResults(prev => prev ? { ...prev, schools: filteredSchools } : null);
      setSelectedPOIs(prev => ({ ...prev, school: 0 }));
    }
  }, [sectors]);

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
        schools: filteredSchools.length,
        stations: filteredStations.length,
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

      // Set loading states
      if (filteredSchools.length > 0) setRouteLoadingStates(prev => ({ ...prev, school: true }));
      if (filteredStations.length > 0) setRouteLoadingStates(prev => ({ ...prev, station: true }));
      if (supermarkets.length > 0) setRouteLoadingStates(prev => ({ ...prev, supermarket: true }));

      // Don't await - let this happen in background
      if (topPOIs.length > 0) {
        fetchRoutesSequentially(topPOIs).then(() => {
          // Clear loading states when done
          setRouteLoadingStates({ school: false, station: false, supermarket: false });
        }).catch(err => {
          console.error('Background route fetching failed:', err);
          setRouteLoadingStates({ school: false, station: false, supermarket: false });
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
    setLoading(true);
    setError(null);
    
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        // Reverse geocode coordinates to address
        const address = `${coords.latitude},${coords.longitude}`;
        await handleSearch(address);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMsg);
      setLoading(false);
    }
  };

  /**
   * Handle selecting an alternative POI
   */
  const handleSelectPOI = (category: POICategory, index: number): void => {
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
        // Set loading state for this category
        setRouteLoadingStates(prev => ({ ...prev, [category]: true }));
        
        // Fetch route in background
        fetchRoutesSequentially([{ from: searchResults.location, to: poi }]).then(() => {
          setRouteLoadingStates(prev => ({ ...prev, [category]: false }));
        }).catch(err => {
          console.error('Failed to fetch route:', err);
          setRouteLoadingStates(prev => ({ ...prev, [category]: false }));
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex md:flex-row flex-1 overflow-hidden">
        {/* Sidebar - Desktop: 40% fixed */}
        <div className="w-2/5 lg:w-1/3 flex-shrink-0 h-full overflow-hidden">
          <Sidebar
            onSearch={handleSearch}
            onUseLocation={handleUseMyLocation}
            searchLoading={loading}
            searchError={error}
            schools={searchResults?.schools || []}
            stations={searchResults?.stations || []}
            supermarkets={searchResults?.supermarkets || []}
            selectedSchoolIndex={selectedPOIs.school}
            selectedStationIndex={selectedPOIs.station}
            selectedSupermarketIndex={selectedPOIs.supermarket}
            onSelectPOI={handleSelectPOI}
            schoolRoute={schoolRoute}
            stationRoute={stationRoute}
            supermarketRoute={supermarketRoute}
            schoolRouteLoading={routeLoadingStates.school}
            stationRouteLoading={routeLoadingStates.station}
            supermarketRouteLoading={routeLoadingStates.supermarket}
            sectors={sectors}
            onToggleSector={toggleSector}
            isOnline={isOnline}
          />
        </div>

        {/* Map - Desktop: 60% flex */}
        <div className="flex-1 h-full">
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

      {/* Mobile: Tabbed view with toggle */}
      <div className="flex md:hidden flex-col h-full">
        {/* Mobile view toggle tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              mobileView === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </div>
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              mobileView === 'map'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </div>
          </button>
        </div>

        {/* Sidebar - Mobile: Full screen when in list view */}
        {mobileView === 'list' && (
          <div className="flex-1 overflow-hidden">
            <Sidebar
              onSearch={handleSearch}
              onUseLocation={handleUseMyLocation}
              searchLoading={loading}
              searchError={error}
              schools={searchResults?.schools || []}
              stations={searchResults?.stations || []}
              supermarkets={searchResults?.supermarkets || []}
              selectedSchoolIndex={selectedPOIs.school}
              selectedStationIndex={selectedPOIs.station}
              selectedSupermarketIndex={selectedPOIs.supermarket}
              onSelectPOI={handleSelectPOI}
              schoolRoute={schoolRoute}
              stationRoute={stationRoute}
              supermarketRoute={supermarketRoute}
              schoolRouteLoading={routeLoadingStates.school}
              stationRouteLoading={routeLoadingStates.station}
              supermarketRouteLoading={routeLoadingStates.supermarket}
              sectors={sectors}
              onToggleSector={toggleSector}
              isOnline={isOnline}
            />
          </div>
        )}

        {/* Map - Mobile: Full screen when in map view */}
        {mobileView === 'map' && (
          <div className="flex-1 relative">
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
        )}
      </div>
    </div>
  );
}

export default App;
