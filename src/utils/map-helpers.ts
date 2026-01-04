/**
 * Map Helpers
 *
 * Utilities for creating custom markers and styling map elements.
 */

import L from "leaflet"
import type { POICategory } from "../types"

/**
 * Get color for a POI category
 */
export function getCategoryColor(category: POICategory | "user"): string {
  if (category === "user") return "#ef4444" // Red for user location

  if (category === "school") return "#3b82f6" // Blue for all schools
  if (category === "station") return "#dc2626" // Red for stations
  if (category === "supermarket") return "#14b8a6" // Teal for supermarkets

  return "#3b82f6" // Blue fallback
}

/**
 * Get polyline color (slightly transparent version of category color)
 */
export function getPolylineColor(category: POICategory): string {
  return getCategoryColor(category)
}

/**
 * Create a marker icon for a POI
 *
 * @param type - The type of marker (user, school, station, supermarket)
 * @param selected - Whether this marker is currently selected
 * @param isAlternative - Whether this is an alternative (non-selected) POI
 * @param isLoading - Whether the route for this marker is currently being fetched
 */
export function createMarkerIcon(
  type: POICategory | "user",
  selected: boolean,
  isAlternative?: boolean,
  isLoading?: boolean
): L.DivIcon {
  const color = getCategoryColor(type)
  const size = selected ? 32 : 24

  // User location: solid red dot
  if (type === "user") {
    return L.divIcon({
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      className: "custom-marker",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
  }

  // Alternative POIs: hollow dots
  if (isAlternative) {
    return L.divIcon({
      html: `
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border: 3px solid ${color};
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ${selected ? "transform: scale(1.2);" : ""}
        "></div>
      `,
      className: "custom-marker",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  }

  // Selected POI: pin with icon
  const icon = getIconForCategory(type)
  
  // Create loading spinner border if loading
  const loadingSpinner = isLoading ? `
    <!-- Loading spinner border -->
    <div class="marker-loading-spinner" style="
      position: absolute;
      width: ${size + 6}px;
      height: ${size + 6}px;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: ${color};
      border-right-color: ${color};
      top: -3px;
      left: -3px;
      z-index: 1;
    "></div>
  ` : ''

  return L.divIcon({
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">
        <!-- Pin head with optional loading spinner -->
        <div style="position: relative;">
          ${loadingSpinner}
          <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
          ">
            <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white">
              ${icon}
            </svg>
          </div>
        </div>
        <!-- Pin tail -->
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 12px solid ${color};
          position: relative;
          top: -3px;
          z-index: 1;
        "></div>
      </div>
    `,
    className: "custom-marker custom-marker-pin",
    iconSize: [size + 6, size + 18],
    iconAnchor: [(size + 6) / 2, size + 18],
  })
}

/**
 * Get SVG icon path for a category
 */
function getIconForCategory(category: POICategory | "user"): string {
  switch (category) {
    case "school":
      // Graduation cap icon
      return `
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      `
    case "station":
      // Train icon
      return `
        <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z"/>
      `
    case "supermarket":
      // Shopping cart icon
      return `
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      `
    default:
      return '<circle cx="12" cy="12" r="8"/>'
  }
}
