import { useState } from 'react';
import type { POI, POICategory, SchoolSector, WalkingRoute } from '../../types';
import { SearchBar } from './SearchBar';
import { POICard } from './POICard';
import { OfflineBanner } from './OfflineBanner';
import { SettingsPanel } from '../Settings/SettingsPanel';

interface SidebarProps {
  // Search
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  searchLoading?: boolean;
  searchError?: string | null;
  
  // Results
  schools: POI[];
  stations: POI[];
  supermarkets: POI[];
  
  // Selected indices
  selectedSchoolIndex: number;
  selectedStationIndex: number;
  selectedSupermarketIndex: number;
  onSelectPOI: (category: POICategory, index: number) => void;
  
  // Walking routes
  schoolRoute?: WalkingRoute | null;
  stationRoute?: WalkingRoute | null;
  supermarketRoute?: WalkingRoute | null;
  schoolRouteLoading?: boolean;
  stationRouteLoading?: boolean;
  supermarketRouteLoading?: boolean;
  
  // School sectors
  sectors: Set<SchoolSector>;
  onToggleSector: (sector: SchoolSector) => void;
  
  // Offline status
  isOnline: boolean;
}

export function Sidebar({
  onSearch,
  onUseLocation,
  searchLoading,
  searchError,
  schools,
  stations,
  supermarkets,
  selectedSchoolIndex,
  selectedStationIndex,
  selectedSupermarketIndex,
  onSelectPOI,
  schoolRoute,
  stationRoute,
  supermarketRoute,
  schoolRouteLoading,
  stationRouteLoading,
  supermarketRouteLoading,
  sectors,
  onToggleSector,
  isOnline,
}: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  const hasResults = schools.length > 0 || stations.length > 0 || supermarkets.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with Logo/Title */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h1 className="text-lg font-bold text-gray-900">Map Search</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <SearchBar
        onSearch={onSearch}
        onUseLocation={onUseLocation}
        loading={searchLoading}
        error={searchError}
      />

      {/* Offline Banner */}
      {!isOnline && !offlineBannerDismissed && (
        <OfflineBanner onDismiss={() => setOfflineBannerDismissed(true)} />
      )}

      {/* Settings Panel (Conditional) */}
      {showSettings ? (
        <SettingsPanel />
      ) : (
        <>
          {/* Results or Empty State */}
          {hasResults ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* School Card */}
                {schools.length > 0 && (
                  <POICard
                    category="school"
                    items={schools}
                    selectedIndex={selectedSchoolIndex}
                    onSelect={(index) => onSelectPOI('school', index)}
                    route={schoolRoute}
                    routeLoading={schoolRouteLoading}
                    sectors={sectors}
                    onToggleSector={onToggleSector}
                  />
                )}

                {/* Station Card */}
                {stations.length > 0 && (
                  <POICard
                    category="station"
                    items={stations}
                    selectedIndex={selectedStationIndex}
                    onSelect={(index) => onSelectPOI('station', index)}
                    route={stationRoute}
                    routeLoading={stationRouteLoading}
                  />
                )}

                {/* Supermarket Card */}
                {supermarkets.length > 0 && (
                  <POICard
                    category="supermarket"
                    items={supermarkets}
                    selectedIndex={selectedSupermarketIndex}
                    onSelect={(index) => onSelectPOI('supermarket', index)}
                    route={supermarketRoute}
                    routeLoading={supermarketRouteLoading}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Find nearby amenities</h3>
                <p className="text-sm text-gray-600">
                  Search for an address to discover schools, train stations, and supermarkets in the area.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
