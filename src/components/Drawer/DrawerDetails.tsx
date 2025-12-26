import { Check, Loader2, ChevronUp } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { SectorCheckboxes } from '../Sidebar/SectorCheckboxes';
import { formatDistance, formatDuration } from '../../utils/format';
import type { POI, POICategory, WalkingRoute, SchoolSector } from '../../types';

interface DrawerDetailsProps {
  activeTab: POICategory;
  onTabChange: (tab: POICategory) => void;
  
  items: POI[];
  selectedIndex: number;
  
  route?: WalkingRoute | null;
  routeLoading?: boolean;
  
  sectors?: Set<SchoolSector>;
  onToggleSector?: (sector: SchoolSector) => void;
  
  onShowAlternatives: () => void;
  hasAlternatives: boolean;
}

export function DrawerDetails({
  activeTab,
  onTabChange,
  items,
  selectedIndex,
  route,
  routeLoading,
  sectors,
  onToggleSector,
  onShowAlternatives,
  hasAlternatives,
}: DrawerDetailsProps) {
  const selectedItem = items[selectedIndex];
  
  // No results case
  if (!selectedItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">
          No {activeTab === 'school' ? 'schools' : activeTab === 'station' ? 'train stations' : 'supermarkets'} found nearby
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Try searching a different address or adjusting filters
        </p>
      </div>
    );
  }
  
  // Dot color helper (use exact colors from reference)
  function getCategoryDotColor(category: POICategory, item: POI): string {
    if (category === 'school' && item.sector) {
      switch (item.sector) {
        case 'Government': return 'bg-green-500';
        case 'Catholic': return 'bg-purple-500';
        case 'Independent': return 'bg-orange-500';
      }
    }
    
    switch (category) {
      case 'school': return 'bg-blue-600'; // Fallback if no sector
      case 'station': return 'bg-red-600';
      case 'supermarket': return 'bg-teal-500';
    }
  }
  
  const categories: POICategory[] = ['school', 'station', 'supermarket'];
  
  return (
    <div 
      className="flex flex-col"
      role="tabpanel"
      id={`${activeTab}-panel`}
      aria-labelledby={`${activeTab}-tab`}
      tabIndex={-1}
    >
      {/* Tab switcher dots */}
      <div className="flex items-center justify-center gap-2 py-3 border-b border-gray-100">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onTabChange(cat)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
              activeTab === cat
                ? getCategoryDotColor(cat, selectedItem) + ' scale-110'
                : 'bg-gray-300'
            }`}
            aria-label={`Switch to ${cat}`}
          />
        ))}
      </div>
      
      {/* Selected item details */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {selectedItem.name}
          </h3>
          {selectedItem.details && (
            <p className="text-sm text-gray-600 mt-1">{selectedItem.details}</p>
          )}
        </div>
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {/* Walking time */}
          {routeLoading ? (
            <Badge variant="loading" icon={<Loader2 className="w-3 h-3 animate-spin" />}>
              Loading...
            </Badge>
          ) : route ? (
            <Badge variant="actual" icon={<Check className="w-3 h-3" />}>
              {formatDuration(route.duration)}
            </Badge>
          ) : (
            <Badge variant="estimate">
              ~{formatDuration(selectedItem.estimatedWalkingTime)}
            </Badge>
          )}
          
          {/* Distance */}
          <Badge variant="default">
            {formatDistance(selectedItem.distance)}
          </Badge>
          
          {/* Sector (schools only) */}
          {activeTab === 'school' && selectedItem.sector && (
            <Badge variant="default">{selectedItem.sector}</Badge>
          )}
        </div>
        
        {/* Sector filters (schools only) */}
        {activeTab === 'school' && sectors && onToggleSector && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-2">Filter by sector:</p>
            <SectorCheckboxes sectors={sectors} onToggle={onToggleSector} />
          </div>
        )}
        
        {/* View alternatives button */}
        {hasAlternatives && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowAlternatives}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            View {items.length - 1} more option{items.length - 1 !== 1 ? 's' : ''}
            <ChevronUp className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
