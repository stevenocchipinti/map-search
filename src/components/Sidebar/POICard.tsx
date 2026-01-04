import { useState } from "react"
import type {
  POI,
  POICategory,
  SchoolSector,
  WalkingRoute,
} from "../../types"
import { Badge } from "../UI/Badge"
import { Button } from "../UI/Button"
import { POIAlternatives } from "./POIAlternatives"
import { formatDistance, formatDuration } from "../../utils/format"

interface POICardProps {
  category: POICategory
  items: POI[]
  selectedIndex: number
  onSelect: (index: number) => void
  route?: WalkingRoute | null
  routeLoading?: boolean
  onOpenSettings?: () => void
}

export function POICard({
  category,
  items,
  selectedIndex,
  onSelect,
  route,
  routeLoading,
  onOpenSettings,
}: POICardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  if (items.length === 0) {
    return null
  }

  const selectedItem = items[selectedIndex]
  const hasAlternatives = items.length > 1

  const getCategoryIcon = () => {
    switch (category) {
      case "school":
        // Graduation cap icon - matches map markers and mobile
        return (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
            <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        )
      case "station":
        // Train icon - matches map markers and mobile
        return (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z"/>
          </svg>
        )
      case "supermarket":
        // Shopping cart icon - matches map markers and mobile
        return (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        )
    }
  }

  const getCategoryColor = () => {
    switch (category) {
      case "school":
        return "text-blue-600 bg-blue-50"
      case "station":
        return "text-red-600 bg-red-50"
      case "supermarket":
        return "text-teal-600 bg-teal-50"
    }
  }

  const getCategoryTitle = () => {
    switch (category) {
      case "school":
        return "School"
      case "station":
        return "Train Station"
      case "supermarket":
        return "Supermarket"
    }
  }

  const getItemSector = (item: POI): SchoolSector | undefined => {
    if ("sector" in item) {
      return item.sector as SchoolSector
    }
    return undefined
  }

  const estimatedTime = Math.round((selectedItem.distance * 1.4 * 60) / 5)

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
              <p className="text-sm text-gray-600 mt-1">
                {selectedItem.details}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Time Badge */}
            {routeLoading ? (
              <Badge
                variant="loading"
                icon={
                  <svg
                    className="animate-spin h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                }
              >
                Loading...
              </Badge>
            ) : route ? (
              <Badge
                variant="actual"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                }
              >
                {formatDuration(route.duration)}
              </Badge>
            ) : (
              <Badge variant="estimate">~{formatDuration(estimatedTime)}</Badge>
            )}

            {/* Distance Badge */}
            <Badge variant="default">
              {formatDistance(selectedItem.distance)}
            </Badge>

            {/* Sector Badge for Schools */}
            {category === "school" && getItemSector(selectedItem) && (
              <Badge variant="default">{getItemSector(selectedItem)}</Badge>
            )}
          </div>

          {/* Link to school settings */}
          {category === "school" && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Filter school sectors in settings →
            </button>
          )}

          {/* View Alternatives Button */}
          {hasAlternatives && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
