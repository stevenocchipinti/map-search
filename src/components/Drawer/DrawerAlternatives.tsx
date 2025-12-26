import { POIAlternatives } from '../Sidebar/POIAlternatives';
import type { POI, POICategory } from '../../types';

interface DrawerAlternativesProps {
  activeTab: POICategory;
  items: POI[];
  selectedIndex: number;
  onSelectItem: (index: number) => void;
}

export function DrawerAlternatives({
  activeTab,
  items,
  selectedIndex,
  onSelectItem,
}: DrawerAlternativesProps) {
  const categoryLabel = 
    activeTab === 'school' ? 'Schools' :
    activeTab === 'station' ? 'Train Stations' :
    'Supermarkets';
  
  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-lg">
          {categoryLabel}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {items.length} option{items.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        <POIAlternatives
          items={items}
          selectedIndex={selectedIndex}
          onSelect={onSelectItem}
        />
      </div>
    </div>
  );
}
