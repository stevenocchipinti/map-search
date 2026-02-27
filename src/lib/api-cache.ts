/**
 * API Response Cache - TTL-based localStorage caching for API responses
 *
 * Provides persistent caching across page refreshes for POST API responses
 * that the service worker cannot cache (Cache API only supports GET requests).
 *
 * Cache strategy:
 * - Geocode responses: 30-day TTL (addresses don't move)
 * - Supermarket responses: 7-day TTL (stores change occasionally)
 * - Walking routes: 30-day TTL (routes rarely change)
 *
 * Eviction: FIFO when exceeding max entries per cache type.
 * Clearing: localStorage.clear() wipes everything (used by Settings > Clear Cache).
 */

const CACHE_PREFIX = "api_cache:"

/** TTL values in milliseconds */
const TTL = {
  geocode: 30 * 24 * 60 * 60 * 1000, // 30 days
  supermarkets: 7 * 24 * 60 * 60 * 1000, // 7 days
  walkingRoutes: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const

/** Max entries per cache type */
const MAX_ENTRIES = {
  geocode: 50,
  supermarkets: 30,
  walkingRoutes: 100,
} as const

type CacheType = keyof typeof TTL

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Build a namespaced localStorage key
 */
function buildKey(type: CacheType, identifier: string): string {
  return `${CACHE_PREFIX}${type}:${identifier}`
}

/**
 * Get a cached value if it exists and is within TTL
 */
export function getCached<T>(type: CacheType, identifier: string): T | null {
  try {
    const key = buildKey(type, identifier)
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const age = Date.now() - entry.timestamp

    if (age > TTL[type]) {
      // Expired - remove it
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/**
 * Store a value in the cache with the current timestamp
 */
export function setCached<T>(
  type: CacheType,
  identifier: string,
  data: T
): void {
  try {
    const key = buildKey(type, identifier)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    }

    localStorage.setItem(key, JSON.stringify(entry))
    evictIfNeeded(type)
  } catch (error) {
    // localStorage might be full or unavailable - fail silently
    console.warn("[API Cache] Failed to cache:", error)
  }
}

/**
 * Get all entries for a cache type, sorted oldest-first
 */
function getEntriesForType(
  type: CacheType
): Array<{ key: string; timestamp: number }> {
  const prefix = `${CACHE_PREFIX}${type}:`
  const entries: Array<{ key: string; timestamp: number }> = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(prefix)) continue

    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      entries.push({ key, timestamp: parsed.timestamp || 0 })
    } catch {
      // Corrupt entry - mark for removal with timestamp 0
      entries.push({ key, timestamp: 0 })
    }
  }

  // Sort oldest first
  entries.sort((a, b) => a.timestamp - b.timestamp)
  return entries
}

/**
 * Remove oldest entries if we exceed the max for this cache type
 */
function evictIfNeeded(type: CacheType): void {
  const max = MAX_ENTRIES[type]
  const entries = getEntriesForType(type)

  if (entries.length <= max) return

  const toRemove = entries.slice(0, entries.length - max)
  for (const entry of toRemove) {
    localStorage.removeItem(entry.key)
  }

  if (toRemove.length > 0) {
    console.log(
      `[API Cache] Evicted ${toRemove.length} old ${type} entries (max: ${max})`
    )
  }
}

/**
 * Clear all API cache entries from localStorage.
 * Called by the settings panel's "Clear Cache" button.
 */
export function clearApiCache(): void {
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }

  console.log(`[API Cache] Cleared ${keysToRemove.length} cached entries`)
}

/**
 * Generate a deterministic cache key for geocode requests
 */
export function geocodeCacheKey(address: string): string {
  return address.trim().toLowerCase()
}

/**
 * Generate a deterministic cache key for supermarket requests
 */
export function supermarketsCacheKey(
  lat: number,
  lng: number,
  radius: number
): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)},${radius}`
}

/**
 * Generate a deterministic cache key for walking route requests
 */
export function walkingRouteCacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `${fromLat.toFixed(6)},${fromLng.toFixed(6)}-${toLat.toFixed(6)},${toLng.toFixed(6)}`
}

export interface ApiCacheStats {
  geocode: { count: number; max: number }
  supermarkets: { count: number; max: number }
  walkingRoutes: { count: number; max: number }
}

/**
 * Count live (non-expired) entries per cache type.
 * Used by the settings panel to display meaningful cache info.
 */
export function getApiCacheStats(): ApiCacheStats {
  const counts = { geocode: 0, supermarkets: 0, walkingRoutes: 0 }
  const now = Date.now()

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(CACHE_PREFIX)) continue

    // Determine type from key shape: "api_cache:{type}:{identifier}"
    const withoutPrefix = key.slice(CACHE_PREFIX.length)
    const colonIdx = withoutPrefix.indexOf(":")
    if (colonIdx === -1) continue
    const type = withoutPrefix.slice(0, colonIdx) as CacheType
    if (!(type in TTL)) continue

    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const entry: CacheEntry<unknown> = JSON.parse(raw)
      const age = now - entry.timestamp
      if (age <= TTL[type]) {
        counts[type]++
      }
    } catch {
      // Skip corrupt entries
    }
  }

  return {
    geocode: { count: counts.geocode, max: MAX_ENTRIES.geocode },
    supermarkets: { count: counts.supermarkets, max: MAX_ENTRIES.supermarkets },
    walkingRoutes: {
      count: counts.walkingRoutes,
      max: MAX_ENTRIES.walkingRoutes,
    },
  }
}

/**
 * Get all cached walking routes (for hydrating in-memory cache on mount).
 * Returns a Map of cache key -> WalkingRoute data.
 */
export function getAllCachedWalkingRoutes<T>(): Map<string, T> {
  const prefix = `${CACHE_PREFIX}walkingRoutes:`
  const routes = new Map<string, T>()

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(prefix)) continue

    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const entry: CacheEntry<T> = JSON.parse(raw)
      const age = Date.now() - entry.timestamp

      // Only return entries within TTL
      if (age <= TTL.walkingRoutes) {
        // Extract the route identifier (everything after the prefix)
        const routeKey = key.slice(prefix.length)
        routes.set(routeKey, entry.data)
      }
    } catch {
      // Skip corrupt entries
    }
  }

  return routes
}
