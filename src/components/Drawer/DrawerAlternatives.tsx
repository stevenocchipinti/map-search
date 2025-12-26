import { POIAlternatives } from '../Sidebar/POIAlternatives';
import type { POI, POICategory } from '../../types';

interface DrawerAlternativesProps {
  activeTab: POICategory;
  items: POI[];
  selectedIndex: number;
  onSelectItem: (index: number) => void;
}

export function DrawerAlternatives({
  items,
  selectedIndex,
  onSelectItem,
}: DrawerAlternativesProps) {
  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <POIAlternatives
        items={items}
        selectedIndex={selectedIndex}
        onSelect={onSelectItem}
      />
    </div>
  );
}
