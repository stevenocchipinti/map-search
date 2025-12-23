import { useState } from 'react';
import type { POI, POICategory, SchoolSector, WalkingRoute } from '../../types';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { SectorCheckboxes } from './SectorCheckboxes';
import { POIAlternatives } from './POIAlternatives';
import { formatDistance, formatDuration } from '../../utils/format';

interface POICardProps {
  category: POICategory;
  items: POI[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  route?: WalkingRoute | null;
  routeLoading?: boolean;
  sectors?: Set<SchoolSector>;
  onToggleSector?: (sector: SchoolSector) => void;
}

export function POICard({
  category,
  items,
  selectedIndex,
  onSelect,
  route,
  routeLoading,
  sectors,
  onToggleSector,
}: POICardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const selectedItem = items[selectedIndex];
  const hasAlternatives = items.length > 1;

  const getCategoryIcon = () => {
    switch (category) {
      case 'school':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        );
      case 'station':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'supermarket':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'school':
        return 'text-green-600';
      case 'station':
        return 'text-red-600';
      case 'supermarket':
        return 'text-teal-600';
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'school':
        return 'School';
      case 'station':
        return 'Train Station';
      case 'supermarket':
        return 'Supermarket';
    }
  };

  const getItemSector = (item: POI): SchoolSector | undefined => {
    if ('sector' in item) {
      return item.sector as SchoolSector;
    }
    return undefined;
  };

  const estimatedTime = Math.round((selectedItem.distance * 1.4 * 60) / 5);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className={getCategoryColor()}>{getCategoryIcon()}</span>
          <h3 className="font-semibold text-gray-900">{getCategoryTitle()}</h3>
        </div>
      </div>

      {/* Selected Item */}
      <div className="p-4">
        <div className="space-y-2">
          {/* Name and Details */}
          <div>
            <h4 className="font-medium text-gray-900 text-base leading-snug">
              {selectedItem.name}
            </h4>
            {selectedItem.details && (
              <p className="text-sm text-gray-600 mt-1">{selectedItem.details}</p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Time Badge */}
            {routeLoading ? (
              <Badge variant="loading" icon={
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              }>
                Loading...
              </Badge>
            ) : route ? (
              <Badge variant="actual" icon={
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              }>
                {formatDuration(route.duration)}
              </Badge>
            ) : (
              <Badge variant="estimate">
                ~{formatDuration(estimatedTime)}
              </Badge>
            )}

            {/* Distance Badge */}
            <Badge variant="default">
              {formatDistance(selectedItem.distance)}
            </Badge>

            {/* Sector Badge for Schools */}
            {category === 'school' && getItemSector(selectedItem) && (
              <Badge variant="default">
                {getItemSector(selectedItem)}
              </Badge>
            )}
          </div>

          {/* Sector Checkboxes for Schools */}
          {category === 'school' && sectors && onToggleSector && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 mb-1">Filter by sector:</p>
              <SectorCheckboxes sectors={sectors} onToggle={onToggleSector} />
            </div>
          )}

          {/* View Alternatives Button */}
          {hasAlternatives && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              {showAlternatives ? 'Hide' : `View ${items.length - 1} more option${items.length - 1 !== 1 ? 's' : ''}`}
              <svg
                className={`w-4 h-4 transition-transform ${showAlternatives ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Alternatives */}
      {showAlternatives && (
        <POIAlternatives
          items={items}
          selectedIndex={selectedIndex}
          onSelect={(index: number) => {
            onSelect(index);
            setShowAlternatives(false);
          }}
        />
      )}
    </div>
  );
}
