import { Footprints, Loader2 } from "lucide-react"
import { formatDistance, formatDuration } from "../../utils/format"
import type { POI, POICategory, WalkingRoute } from "../../types"

interface DrawerDetailsProps {
  activeTab: POICategory

  items: POI[]
  selectedIndex: number

  route?: WalkingRoute | null
  routeLoading?: boolean
}

export function DrawerDetails({
  activeTab,
  items,
  selectedIndex,
  route,
  routeLoading,
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
      className="flex flex-col outline-none pb-6"
      role="tabpanel"
      id={`${activeTab}-panel`}
      aria-labelledby={`${activeTab}-tab`}
      tabIndex={-1}
    >
      {/* Selected item details */}
      <div className="p-4 space-y-3">
        {/* Name + distance pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg leading-snug">
              {selectedItem.name}
            </h3>
            {selectedItem.details && (
              <p className="text-sm text-gray-600 mt-1">{selectedItem.details}</p>
            )}
          </div>
          <span className="flex-shrink-0 text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-lg mt-0.5">
            {formatDistance(selectedItem.distance)}
          </span>
        </div>

        {/* Walking time — single inline row */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {routeLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>Getting walking time…</span>
            </>
          ) : (
            <>
              <Footprints className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {route
                  ? formatDuration(route.duration)
                  : `~${formatDuration(selectedItem.estimatedWalkingTime)}`}
                {" walk"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
