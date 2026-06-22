import type { POI, POICategory, WalkingRoute } from "../../types"
import { POICard } from "./POICard"

interface SidebarProps {
  // Results
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]

  // Selected indices
  selectedSchoolIndex: number
  selectedStationIndex: number
  selectedSupermarketIndex: number
  onSelectPOI: (category: POICategory, index: number) => void

  // Walking routes
  schoolRoute?: WalkingRoute | null
  stationRoute?: WalkingRoute | null
  supermarketRoute?: WalkingRoute | null
  schoolRouteLoading?: boolean
  stationRouteLoading?: boolean
  supermarketRouteLoading?: boolean
  onOpenSettings: () => void
}

export function Sidebar({
  schools,
  stations,
  supermarkets,
  selectedSchoolIndex,
  selectedStationIndex,
  selectedSupermarketIndex,
  onSelectPOI,
  schoolRoute,
  stationRoute,
  supermarketRoute,
  schoolRouteLoading,
  stationRouteLoading,
  supermarketRouteLoading,
}: SidebarProps) {
  const hasResults =
    schools.length > 0 || stations.length > 0 || supermarkets.length > 0

  return (
    <div className="flex flex-col h-full pt-36 pointer-events-none">
      {hasResults && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4 pointer-events-none">
            {/* School Card */}
            {schools.length > 0 && (
              <POICard
                category="school"
                items={schools}
                selectedIndex={selectedSchoolIndex}
                onSelect={index => onSelectPOI("school", index)}
                route={schoolRoute}
                routeLoading={schoolRouteLoading}
              />
            )}

            {/* Station Card */}
            {stations.length > 0 && (
              <POICard
                category="station"
                items={stations}
                selectedIndex={selectedStationIndex}
                onSelect={index => onSelectPOI("station", index)}
                route={stationRoute}
                routeLoading={stationRouteLoading}
              />
            )}

            {/* Supermarket Card */}
            {supermarkets.length > 0 && (
              <POICard
                category="supermarket"
                items={supermarkets}
                selectedIndex={selectedSupermarketIndex}
                onSelect={index => onSelectPOI("supermarket", index)}
                route={supermarketRoute}
                routeLoading={supermarketRouteLoading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
