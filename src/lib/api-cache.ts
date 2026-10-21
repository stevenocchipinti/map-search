/**
 * API Response Cache - size-limited localStorage caching for API responses
 *
 * Provides persistent caching across page refreshes for POST API responses
 * that the service worker cannot cache (Cache API only supports GET requests).
 *
 * Entries never expire: addresses don't move and walking routes rarely
 * change, and keeping them means repeat searches work offline. Each cache
 * type has a max entry count instead, and the least recently used entries
 * are evicted first.
 *
 * Clearing: localStorage.clear() wipes everything (used by Settings > Clear Cache).
 */

const CACHE_PREFIX = "api_cache:"

/**
 * Max entries per cache type. Entries are small (~300 characters), so even
 * full caches use well under 1MB of the ~5MB localStorage quota.
 */
const MAX_ENTRIES = {
  geocode: 200,
  walkingRoutes: 1000,
} as const

type CacheType = keyof typeof MAX_ENTRIES

interface CacheEntry<T> {
  data: T
  // When the entry was last stored or read, used for LRU eviction
  timestamp: number
}

/**
 * Build a namespaced localStorage key
 */
function buildKey(type: CacheType, identifier: string): string {
  return `${CACHE_PREFIX}${type}:${identifier}`
}

/**
 * Get a cached value if it exists, marking it as recently used
 */
export function getCached<T>(type: CacheType, identifier: string): T | null {
  try {
    const key = buildKey(type, identifier)
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    entry.timestamp = Date.now()
    localStorage.setItem(key, JSON.stringify(entry))

    return entry.data
  } catch {
    return null
  }
}

/**
 * Mark a cached value as recently used without reading it, for callers that
 * keep their own in-memory copy (e.g. hydrated walking routes)
 */
export function touchCached(type: CacheType, identifier: string): void {
  getCached(type, identifier)
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
 * Get all entries for a cache type, sorted least recently used first
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

  // Sort least recently used first
  entries.sort((a, b) => a.timestamp - b.timestamp)
  return entries
}

/**
 * Remove least recently used entries if we exceed the max for this cache type
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
      `[API Cache] Evicted ${toRemove.length} least recently used ${type} entries (max: ${max})`
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
  walkingRoutes: { count: number; max: number }
}

/**
 * Count entries per cache type.
 * Used by the settings panel to display meaningful cache info.
 */
export function getApiCacheStats(): ApiCacheStats {
  const counts = { geocode: 0, walkingRoutes: 0 }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(CACHE_PREFIX)) continue

    // Determine type from key shape: "api_cache:{type}:{identifier}"
    const withoutPrefix = key.slice(CACHE_PREFIX.length)
    const colonIdx = withoutPrefix.indexOf(":")
    if (colonIdx === -1) continue
    const type = withoutPrefix.slice(0, colonIdx) as CacheType
    if (!(type in MAX_ENTRIES)) continue

    counts[type]++
  }

  return {
    geocode: { count: counts.geocode, max: MAX_ENTRIES.geocode },
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
      // Extract the route identifier (everything after the prefix)
      const routeKey = key.slice(prefix.length)
      routes.set(routeKey, entry.data)
    } catch {
      // Skip corrupt entries
    }
  }

  return routes
}
