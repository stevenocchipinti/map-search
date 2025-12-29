import { GraduationCap, Train, ShoppingCart } from "lucide-react"
import type { POI, POICategory, SelectedPOIs, WalkingRoute } from "../../types"
import { formatDuration } from "../../utils/format"

interface DrawerTabBarProps {
  activeTab: POICategory
  onTabClick: (category: POICategory) => void

  // POI data
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]

  // Selected indices
  selectedPOIs: SelectedPOIs

  // Routes (for walking time)
  schoolRoute?: WalkingRoute | null
  stationRoute?: WalkingRoute | null
  supermarketRoute?: WalkingRoute | null
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
      case "school":
        return schools
      case "station":
        return stations
      case "supermarket":
        return supermarkets
    }
  }

  // Get route for a category
  const getRouteForCategory = (
    category: POICategory
  ): WalkingRoute | null | undefined => {
    switch (category) {
      case "school":
        return schoolRoute
      case "station":
        return stationRoute
      case "supermarket":
        return supermarketRoute
    }
  }

  // Check if category has results
  const hasResults = (category: POICategory): boolean => {
    return getItemsForCategory(category).length > 0
  }

  // Get walking time for a category
  const getWalkingTime = (category: POICategory): string => {
    const route = getRouteForCategory(category)
    if (route) {
      return formatDuration(route.duration)
    }

    const items = getItemsForCategory(category)
    if (items.length === 0) return ""

    const selectedItem = items[selectedPOIs[category]]
    if (!selectedItem) return ""

    return `~${formatDuration(selectedItem.estimatedWalkingTime)}`
  }

  // Get icon for category
  const getIcon = (category: POICategory) => {
    switch (category) {
      case "school":
        return GraduationCap
      case "station":
        return Train
      case "supermarket":
        return ShoppingCart
    }
  }

  // Get label for category
  const getLabel = (category: POICategory): string => {
    switch (category) {
      case "school":
        return "School"
      case "station":
        return "Station"
      case "supermarket":
        return "Market"
    }
  }

  // Get text color for category
  const getTextColor = (category: POICategory): string => {
    switch (category) {
      case "school":
        return "text-blue-600"
      case "station":
        return "text-red-600"
      case "supermarket":
        return "text-teal-600"
    }
  }

  // Get active tab styling
  const getActiveStyle = (): string => {
    return "bg-gray-100"
  }

  // Get inactive tab styling
  const getInactiveStyle = (): string => {
    return "bg-white"
  }

  const categories: POICategory[] = ["school", "station", "supermarket"]

  return (
    <div
      className="grid grid-cols-3 gap-2 px-3 py-2"
      role="tablist"
      aria-label="Category navigation"
    >
      {categories.map(category => {
        const Icon = getIcon(category)
        const label = getLabel(category)
        const walkingTime = getWalkingTime(category)
        const hasData = hasResults(category)
        const isActive = activeTab === category

        return (
          <button
            key={category}
            onClick={() => onTabClick(category)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${category}-panel`}
            id={`${category}-tab`}
            className={`
              flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl
              transition-all duration-200 h-auto
              ${isActive ? getActiveStyle() : getInactiveStyle()}
              ${!hasData ? "opacity-50" : ""}
            `}
            aria-label={`${label}${hasData ? `, ${walkingTime}` : ", no results"}`}
          >
            <div
              className={`flex items-center gap-1 ${getTextColor(category)}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-semibold leading-none">
                {label}
              </span>
            </div>
            {hasData && walkingTime && (
              <span
                className={`text-[10px] leading-none ${getTextColor(category)}`}
              >
                {walkingTime}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
