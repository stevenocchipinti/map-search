import { useState } from "react"
import { Footprints, Loader2 } from "lucide-react"
import type { POI, POICategory, WalkingRoute } from "../../types"
import { Button } from "../UI/Button"
import { POIAlternatives } from "./POIAlternatives"
import { formatDistance, formatDuration } from "../../utils/format"
import {
  getCategoryIcon,
  getCategoryLabel,
  getCategoryTextColor,
} from "../../utils/category"

interface POICardProps {
  category: POICategory
  items: POI[]
  selectedIndex: number
  onSelect: (index: number) => void
  route?: WalkingRoute | null
  routeLoading?: boolean
}

export function POICard({
  category,
  items,
  selectedIndex,
  onSelect,
  route,
  routeLoading,
}: POICardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  if (items.length === 0) {
    return null
  }

  const selectedItem = items[selectedIndex]
  const hasAlternatives = items.length > 1
  const label = getCategoryLabel(category)
  const textColor = getCategoryTextColor(category)

  // Render icon inline to avoid creating component during render
  const renderIcon = () => {
    const Icon = getCategoryIcon(category)
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="pointer-events-auto bg-white/95 border border-gray-200 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden dark:bg-gray-900/95 dark:border-gray-700">
      {/* Content */}
      <div className="p-4 pb-1">
        {/* Category icon + label + walking time */}
        <div
          className={`flex pb-4 items-center justify-between gap-3 ${textColor}`}
        >
          <div className="flex items-center gap-1">
            {renderIcon()}
            <span className="text-sm font-semibold leading-none">{label}</span>
          </div>
          {/* Walking time in header */}
          <div className="flex items-center gap-1.5 text-md font-semibold">
            {routeLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>Getting time…</span>
              </>
            ) : (
              <>
                <Footprints className="w-4 h-4 flex-shrink-0" />
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

        {/* Name + distance pill */}
        <div className="flex pb-3 items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug">
              {selectedItem.name}
            </h3>
            {selectedItem.details && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedItem.details}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            {formatDistance(selectedItem.distance)}
          </span>
        </div>

        {/* View Alternatives Button */}
        {hasAlternatives && (
          <Button
            variant="ghost-secondary"
            size="sm"
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:text-blue-200 dark:hover:bg-blue-950"
          >
            {showAlternatives
              ? "Hide alternatives"
              : `View ${items.length - 1} more option${items.length - 1 !== 1 ? "s" : ""}`}
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${showAlternatives ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        )}
      </div>

      {/* Alternatives */}
      {showAlternatives && (
        <POIAlternatives
          items={items}
          selectedIndex={selectedIndex}
          onSelect={(index: number) => {
            onSelect(index)
            setShowAlternatives(false)
          }}
        />
      )}
    </div>
  )
}
