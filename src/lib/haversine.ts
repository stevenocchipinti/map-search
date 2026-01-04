/**
 * Haversine distance calculation utilities
 */

const EARTH_RADIUS_KM = 6371
const AVERAGE_WALKING_SPEED_KMH = 5

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the Haversine distance between two points
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Estimate walking time based on straight-line distance
 * Note: Actual walking distance is typically 1.3-1.5x straight-line distance
 * @param distanceKm Straight-line distance in kilometers
 * @returns Estimated walking time in minutes
 */
export function estimateWalkingTime(distanceKm: number): number {
  // Use 1.4x multiplier to account for non-straight paths
  const estimatedWalkingDistance = distanceKm * 1.4
  const hours = estimatedWalkingDistance / AVERAGE_WALKING_SPEED_KMH
  return Math.round(hours * 60)
}

/**
 * Check if a location is within a reasonable walking threshold
 * @param distanceKm Straight-line distance in kilometers
 * @param maxMinutes Maximum acceptable walking time
 * @returns true if likely walkable within the time limit
 */
export function isWithinWalkingThreshold(
  distanceKm: number,
  maxMinutes: number = 20
): boolean {
  // 20 min walk at 5km/h = ~1.67km actual walking distance
  // Accounting for 1.4x path multiplier, straight-line threshold is ~1.2km
  // But we use a more generous 2.5km to not miss edge cases
  const estimatedTime = estimateWalkingTime(distanceKm)
  return estimatedTime <= maxMinutes * 1.5 // Add buffer for API to confirm
}

/**
 * Maximum straight-line distance to consider for walking (in km)
 * Based on 20 min walk * 1.5 buffer / 1.4 path multiplier
 */
export const MAX_WALKING_DISTANCE_KM = 2.5
