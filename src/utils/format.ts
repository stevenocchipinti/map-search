/**
 * Formatting utility functions
 */

import type { SearchLocation, POI } from '../types';

/**
 * Format distance for display
 * - Show meters if < 1 km
 * - Show km with 1 decimal if >= 1 km
 * 
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "0.8 km" or "850 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration for display
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "12 min")
 */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

/**
 * Shorten long addresses for display
 * - Remove country if present
 * - Keep first 3-4 parts if too long
 * 
 * @param displayName - Full address from geocoding
 * @returns Shortened address
 */
export function formatAddress(displayName: string): string {
  // Remove country (usually last part after final comma)
  const parts = displayName.split(',').map(p => p.trim());
  
  // Remove "Australia" if present
  const filtered = parts.filter(p => p !== 'Australia');
  
  // If still too long (>5 parts), take first 4
  if (filtered.length > 5) {
    return filtered.slice(0, 4).join(', ') + '...';
  }
  
  return filtered.join(', ');
}

/**
 * Generate cache key for walking routes
 * Format: "fromLat,fromLng-toLat,toLng"
 * 
 * @param from - Search location
 * @param to - POI destination
 * @returns Cache key string
 */
export function getCacheKey(from: SearchLocation, to: POI): string {
  const fromKey = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}`;
  const toKey = `${to.latitude.toFixed(6)},${to.longitude.toFixed(6)}`;
  return `${fromKey}-${toKey}`;
}

/**
 * Estimate walking time based on distance
 * Formula: distance (km) × 1.4 × 60 / 5
 * - Assumes 5 km/h walking speed
 * - Adds 40% for real-world factors (traffic lights, turns, etc.)
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Estimated walking time in minutes
 */
export function estimateWalkingTime(distanceKm: number): number {
  const baseMinutes = (distanceKm / 5) * 60;
  const adjusted = baseMinutes * 1.4;
  return Math.round(adjusted);
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
