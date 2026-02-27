import { POIAlternatives } from "../Sidebar/POIAlternatives"
import type { POI, POICategory } from "../../types"

interface DrawerAlternativesProps {
  activeTab: POICategory
  items: POI[]
  selectedIndex: number
  onSelectItem: (index: number) => void
}

export function DrawerAlternatives({
  items,
  selectedIndex,
  onSelectItem,
}: DrawerAlternativesProps) {
  return (
    <div className="flex-1 overflow-y-auto pb-4 border-t border-gray-100">
      {/* View alternatives heading */}
      {items.length > 0 && (
        <div className="pt-5 pb-2 px-5">
          <h4 className="text-sm font-medium text-gray-500 uppercase">
            {items.length - 1} more option{items.length - 1 !== 1 ? "s" : ""}
          </h4>
        </div>
      )}

      <POIAlternatives
        items={items}
        selectedIndex={selectedIndex}
        onSelect={onSelectItem}
      />
    </div>
  )
}
