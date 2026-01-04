/**
 * MapMarker Component
 *
 * Custom marker for displaying POIs on the map with appropriate styling.
 */

import { Marker } from "react-leaflet"
import type { POICategory } from "../../types"
import { createMarkerIcon } from "../../utils/map-helpers"

interface MapMarkerProps {
  position: [number, number]
  type: POICategory | "user"
  selected?: boolean
  sector?: string // Keep for compatibility but not used
  isAlternative?: boolean
  onClick?: () => void
}

export function MapMarker({
  position,
  type,
  selected = false,
  isAlternative = false,
  onClick,
}: MapMarkerProps) {
  const icon = createMarkerIcon(type, selected, isAlternative)

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
    />
  )
}
