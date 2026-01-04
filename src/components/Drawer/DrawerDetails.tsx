import { Check, Loader2 } from "lucide-react"
import { Badge } from "../UI/Badge"
import { formatDistance, formatDuration } from "../../utils/format"
import type { POI, POICategory, WalkingRoute } from "../../types"

interface DrawerDetailsProps {
  activeTab: POICategory

  items: POI[]
  selectedIndex: number

  route?: WalkingRoute | null
  routeLoading?: boolean

  onOpenSettings?: () => void

  hasAlternatives: boolean
}

export function DrawerDetails({
  activeTab,
  items,
  selectedIndex,
  route,
  routeLoading,
  onOpenSettings,
  hasAlternatives,
}: DrawerDetailsProps) {
  const selectedItem = items[selectedIndex]

  // No results case
  if (!selectedItem) {
    return (
      <div className="p-6 text-center border-t border-gray-100">
        <p className="text-gray-500 text-sm">
          No{" "}
          {activeTab === "school"
            ? "schools"
            : activeTab === "station"
              ? "train stations"
              : "supermarkets"}{" "}
          found nearby
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Try searching a different address or adjusting filters
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      role="tabpanel"
      id={`${activeTab}-panel`}
      aria-labelledby={`${activeTab}-tab`}
      tabIndex={-1}
    >
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
            <Badge
              variant="loading"
              icon={<Loader2 className="w-3 h-3 animate-spin" />}
            >
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
          {activeTab === "school" && selectedItem.sector && (
            <Badge variant="default">{selectedItem.sector}</Badge>
          )}
        </div>

        {/* Link to school settings (schools only) */}
        {activeTab === "school" && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Filter school sectors in settings →
          </button>
        )}

        {/* View alternatives heading */}
        {hasAlternatives && (
          <div className="pt-3">
            <h4 className="text-sm font-medium text-gray-700">
              {items.length - 1} more option{items.length - 1 !== 1 ? "s" : ""}
            </h4>
          </div>
        )}
      </div>
    </div>
  )
}
