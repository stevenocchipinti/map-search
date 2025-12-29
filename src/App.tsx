/**
 * Main App Component
 * 
 * Phase 6: PWA with Service Worker
 */

import { useState, useEffect } from 'react';
import type { SearchResponse, SelectedPOIs, POI, School, Station, POICategory } from './types';
import { useDataLoader } from './hooks/useDataLoader';
import { useWalkingRoutes } from './hooks/useWalkingRoutes';
import { useGeolocation } from './hooks/useGeolocation';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSectorPreferences } from './hooks/useSectorPreferences';
import { useSchoolTypePreferences } from './hooks/useSchoolTypePreferences';
import { useServiceWorker } from './hooks/useServiceWorker';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { geocodeAddress, fetchSupermarkets } from './lib/api-client';
import { haversineDistance } from './lib/haversine';
import { estimateWalkingTime } from './utils/format';
import { Map } from './components/Map/Map';
import { MapMarker } from './components/Map/MapMarker';
import { MapPolyline } from './components/Map/MapPolyline';
import { Sidebar } from './components/Sidebar/Sidebar';
import { NavigationDrawer } from './components/Drawer/NavigationDrawer';
import { FloatingSearchBar } from './components/Drawer/FloatingSearchBar';
import { SettingsModal } from './components/Drawer/SettingsModal';
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
  const { schoolTypes, toggleSchoolType } = useSchoolTypePreferences();
  const { updateAvailable, update: updateServiceWorker } = useServiceWorker();
  const { installable, promptInstall } = useInstallPrompt();

  // State
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<SelectedPOIs>({
    school: 0,
    station: 0,
    supermarket: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map state - Initialize with last search location or default to all of Australia
  const getInitialMapState = () => {
    const lastSearch = localStorage.getItem('lastSearchLocation');
    if (lastSearch) {
      try {
        const { lat, lng } = JSON.parse(lastSearch);
        return { center: [lat, lng] as [number, number], zoom: 13 };
      } catch (e) {
        console.error('Failed to parse last search location:', e);
      }
    }
    // Default: Show all of Australia (centered, zoomed out)
    return { center: [-25.2744, 133.7751] as [number, number], zoom: 5 };
  };

  const initialMapState = getInitialMapState();
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialMapState.center);
  const [mapZoom, setMapZoom] = useState(initialMapState.zoom);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  // Route loading states
  const [routeLoadingStates, setRouteLoadingStates] = useState({
    school: false,
    station: false,
    supermarket: false,
  });

  // Mobile drawer state
  const [drawerSnapIndex, setDrawerSnapIndex] = useState<number>(0);
  const [activeDrawerTab, setActiveDrawerTab] = useState<POICategory>('school');
  const [showSettingsMobile, setShowSettingsMobile] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

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
   * Re-filter schools when sectors or school types change
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
        sectors,
        schoolTypes
      );

      setSearchResults(prev => prev ? { ...prev, schools: filteredSchools } : null);
      setSelectedPOIs(prev => ({ ...prev, school: 0 }));

      // Fetch walking route for the new top school
      if (filteredSchools.length > 0) {
        const topSchool = filteredSchools[0];
        const existingRoute = getCachedRoute(location, topSchool);
        
        if (!existingRoute) {
          setRouteLoadingStates(prev => ({ ...prev, school: true }));
          fetchRoutesSequentially([{ from: location, to: topSchool }])
            .then(() => {
              setRouteLoadingStates(prev => ({ ...prev, school: false }));
            })
            .catch(err => {
              console.error('Failed to fetch school route after filter change:', err);
              setRouteLoadingStates(prev => ({ ...prev, school: false }));
            });
        }
      }
    }
  }, [sectors, schoolTypes]);

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
        sectors,
        schoolTypes
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

      // Save last search location to localStorage
      localStorage.setItem('lastSearchLocation', JSON.stringify({
        lat,
        lng,
        state,
        displayName,
        timestamp: Date.now(),
      }));

      // Calculate map bounds to fit user location and selected (top) POIs only
      // This provides a much tighter, more zoomed-in view
      const selectedPOIs = [
        ...(filteredSchools.length > 0 ? [filteredSchools[0]] : []),
        ...(filteredStations.length > 0 ? [filteredStations[0]] : []),
        ...(supermarkets.length > 0 ? [supermarkets[0]] : []),
      ];

      if (selectedPOIs.length > 0) {
        // Create bounds that include user location and only the closest POI from each category
        const bounds = latLngBounds([]);
        bounds.extend([lat, lng]); // User location
        
        selectedPOIs.forEach(poi => {
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
   * Reset drawer when search completes
   */
  useEffect(() => {
    if (searchResults) {
      // Collapse to lowest snap
      setDrawerSnapIndex(0);
      
      // Auto-select first category with results
      const firstCategory = 
        searchResults.schools.length > 0 ? 'school' :
        searchResults.stations.length > 0 ? 'station' :
        searchResults.supermarkets.length > 0 ? 'supermarket' : 'school';
      
      setActiveDrawerTab(firstCategory);
    }
  }, [searchResults]);

  /**
   * Recalculate map bounds when selected POIs change
   */
  useEffect(() => {
    if (!searchResults) return;

    const selectedPOIsArray = [
      ...(searchResults.schools[selectedPOIs.school] ? [searchResults.schools[selectedPOIs.school]] : []),
      ...(searchResults.stations[selectedPOIs.station] ? [searchResults.stations[selectedPOIs.station]] : []),
      ...(searchResults.supermarkets[selectedPOIs.supermarket] ? [searchResults.supermarkets[selectedPOIs.supermarket]] : []),
    ];

    if (selectedPOIsArray.length > 0) {
      const bounds = latLngBounds([]);
      bounds.extend([searchResults.location.lat, searchResults.location.lng]);
      
      selectedPOIsArray.forEach(poi => {
        bounds.extend([poi.latitude, poi.longitude]);
      });
      
      setMapBounds(bounds);
    }
  }, [selectedPOIs, searchResults]);

  /**
   * Sync drawer when map marker clicked
   */
  const handleMapMarkerClick = (category: POICategory, index: number) => {
    handleSelectPOI(category, index);
    setActiveDrawerTab(category);
    
    // Expand to middle if currently at lowest
    if (drawerSnapIndex === 0) {
      setDrawerSnapIndex(1);
    }
  };

  /**
   * Filter and sort schools by distance, sector, and type
   */
  function filterAndSortSchools(
    schools: School[],
    lat: number,
    lng: number,
    selectedSectors: Set<string>,
    selectedTypes: Set<string>
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
          schoolType: school.type,
        };
      })
      .filter(poi => 
        poi.distance <= MAX_WALKING_DISTANCE_KM &&
        poi.sector &&
        selectedSectors.has(poi.sector) &&
        poi.schoolType &&
        selectedTypes.has(poi.schoolType)
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="bg-blue-600 text-white px-5 py-3.5 flex items-center justify-between shadow-soft-md z-50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Update available</span>
          </div>
          <button
            onClick={() => updateServiceWorker()}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-all duration-200 shadow-soft min-h-[36px]"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Install App Banner */}
      {installable && (
        <div className="bg-emerald-600 text-white px-5 py-3.5 flex items-center justify-between shadow-soft-md z-50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Install app for offline access</span>
          </div>
          <button
            onClick={() => promptInstall()}
            className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-all duration-200 shadow-soft min-h-[36px]"
          >
            Install
          </button>
        </div>
      )}

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
            schoolTypes={schoolTypes}
            onToggleSchoolType={toggleSchoolType}
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

      {/* Mobile: Drawer with floating elements */}
      <div className="flex md:hidden flex-col h-full relative">
        {/* Offline banner (skinny strip at top) */}
        {!isOnline && !offlineBannerDismissed && (
          <div className="absolute top-0 left-0 right-0 z-[1001] bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
              <span className="text-xs font-medium text-amber-900">Offline mode</span>
            </div>
            <button
              onClick={() => setOfflineBannerDismissed(true)}
              className="text-amber-600 hover:text-amber-800 transition-colors duration-200"
              aria-label="Dismiss offline banner"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Map (full screen) */}
        <div className="absolute inset-0">
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
                onClick={() => handleMapMarkerClick('school', selectedPOIs.school)}
              />
            )}

            {selectedStation && (
              <MapMarker
                position={[selectedStation.latitude, selectedStation.longitude]}
                type="station"
                selected={true}
                onClick={() => handleMapMarkerClick('station', selectedPOIs.station)}
              />
            )}

            {selectedSupermarket && (
              <MapMarker
                position={[selectedSupermarket.latitude, selectedSupermarket.longitude]}
                type="supermarket"
                selected={true}
                onClick={() => handleMapMarkerClick('supermarket', selectedPOIs.supermarket)}
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
                  onClick={() => handleMapMarkerClick('school', index)}
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
                  onClick={() => handleMapMarkerClick('station', index)}
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
                  onClick={() => handleMapMarkerClick('supermarket', index)}
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
        
        {/* Floating search bar - always visible */}
        <FloatingSearchBar
          onSearch={handleSearch}
          onUseLocation={handleUseMyLocation}
          onOpenSettings={() => setShowSettingsMobile(true)}
          loading={loading}
        />
        
        {/* Navigation drawer */}
        <NavigationDrawer
          schools={searchResults?.schools || []}
          stations={searchResults?.stations || []}
          supermarkets={searchResults?.supermarkets || []}
          selectedPOIs={selectedPOIs}
          onSelectPOI={handleSelectPOI}
          schoolRoute={schoolRoute}
          stationRoute={stationRoute}
          supermarketRoute={supermarketRoute}
          routeLoading={routeLoadingStates}
          onOpenSettings={() => setShowSettingsMobile(true)}
          snapIndex={drawerSnapIndex}
          onSnapIndexChange={setDrawerSnapIndex}
          activeTab={activeDrawerTab}
          onActiveTabChange={setActiveDrawerTab}
        />
        
        {/* Settings modal */}
        <SettingsModal
          open={showSettingsMobile}
          onClose={() => setShowSettingsMobile(false)}
          sectors={sectors}
          onToggleSector={toggleSector}
          schoolTypes={schoolTypes}
          onToggleSchoolType={toggleSchoolType}
        />
      </div>
    </div>
  );
}

export default App;
