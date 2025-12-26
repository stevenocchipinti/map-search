import { GraduationCap, Train, ShoppingCart } from 'lucide-react';
import type { POI, POICategory, SelectedPOIs, WalkingRoute } from '../../types';
import { formatDuration } from '../../utils/format';

interface DrawerTabBarProps {
  activeTab: POICategory;
  onTabClick: (category: POICategory) => void;
  
  // POI data
  schools: POI[];
  stations: POI[];
  supermarkets: POI[];
  
  // Selected indices
  selectedPOIs: SelectedPOIs;
  
  // Routes (for walking time)
  schoolRoute?: WalkingRoute | null;
  stationRoute?: WalkingRoute | null;
  supermarketRoute?: WalkingRoute | null;
}

export function DrawerTabBar({
  activeTab,
  onTabClick,
  schools,
  stations,
  supermarkets,
  selectedPOIs,
  schoolRoute,
  stationRoute,
  supermarketRoute,
}: DrawerTabBarProps) {
  
  // Get items for a category
  const getItemsForCategory = (category: POICategory): POI[] => {
    switch (category) {
      case 'school': return schools;
      case 'station': return stations;
      case 'supermarket': return supermarkets;
    }
  };
  
  // Get route for a category
  const getRouteForCategory = (category: POICategory): WalkingRoute | null | undefined => {
    switch (category) {
      case 'school': return schoolRoute;
      case 'station': return stationRoute;
      case 'supermarket': return supermarketRoute;
    }
  };
  
  // Check if category has results
  const hasResults = (category: POICategory): boolean => {
    return getItemsForCategory(category).length > 0;
  };
  
  // Get walking time for a category
  const getWalkingTime = (category: POICategory): string => {
    const route = getRouteForCategory(category);
    if (route) {
      return formatDuration(route.duration);
    }
    
    const items = getItemsForCategory(category);
    if (items.length === 0) return '';
    
    const selectedItem = items[selectedPOIs[category]];
    if (!selectedItem) return '';
    
    return `~${formatDuration(selectedItem.estimatedWalkingTime)}`;
  };
  
  // Get icon for category
  const getIcon = (category: POICategory) => {
    switch (category) {
      case 'school': return GraduationCap;
      case 'station': return Train;
      case 'supermarket': return ShoppingCart;
    }
  };
  
  // Get label for category
  const getLabel = (category: POICategory): string => {
    switch (category) {
      case 'school': return 'School';
      case 'station': return 'Station';
      case 'supermarket': return 'Market';
    }
  };
  
  // Get active tab styling (use colors from plan - NOTE: School varies by sector)
  const getActiveStyle = (category: POICategory): string => {
    if (category === 'school') {
      // For schools, check the selected school's sector
      const selectedSchool = schools[selectedPOIs.school];
      if (selectedSchool?.sector) {
        switch (selectedSchool.sector) {
          case 'Government':
            return 'bg-green-500 text-white border-b-4 border-green-700';
          case 'Catholic':
            return 'bg-purple-500 text-white border-b-4 border-purple-700';
          case 'Independent':
            return 'bg-orange-500 text-white border-b-4 border-orange-700';
        }
      }
      // Fallback if no sector
      return 'bg-blue-600 text-white border-b-4 border-blue-800';
    }
    
    switch (category) {
      case 'station':
        return 'bg-red-600 text-white border-b-4 border-red-800';
      case 'supermarket':
        return 'bg-teal-500 text-white border-b-4 border-teal-700';
    }
  };
  
  // Get inactive tab styling
  const getInactiveStyle = (category: POICategory): string => {
    switch (category) {
      case 'school':
        return 'bg-white text-gray-700 border border-gray-200';
      case 'station':
        return 'bg-white text-red-700 border border-gray-200';
      case 'supermarket':
        return 'bg-white text-teal-700 border border-gray-200';
    }
  };
  
  const categories: POICategory[] = ['school', 'station', 'supermarket'];
  
  return (
    <div className="grid grid-cols-3 gap-2 p-3" role="tablist" aria-label="Category navigation">
      {categories.map((category) => {
        const Icon = getIcon(category);
        const label = getLabel(category);
        const walkingTime = getWalkingTime(category);
        const hasData = hasResults(category);
        const isActive = activeTab === category;
        
        return (
          <button
            key={category}
            onClick={() => onTabClick(category)}
            disabled={!hasData}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${category}-panel`}
            id={`${category}-tab`}
            className={`
              flex flex-col items-center justify-center p-3 rounded-xl
              transition-all duration-200 min-h-[72px]
              ${isActive ? getActiveStyle(category) : getInactiveStyle(category)}
              ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={`${label}, ${hasData ? walkingTime : 'no results'}`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-xs mt-0.5">
              {hasData ? walkingTime : 'No results'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
