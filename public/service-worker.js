/**
 * Service Worker for Local Search PWA
 *
 * Handles caching for GET requests only:
 * - Pages (HTML): Network-first with cache fallback, so new deploys show up
 *   on the next load and the app still opens offline (or after a few seconds
 *   on a very slow connection)
 * - App Shell: Cache-first (CSS, JS, icons; built assets have hashed names)
 * - Data Files: Stale-while-revalidate (schools, stations, supermarkets), so
 *   searches are instant but refreshed data still arrives in the background
 * - Map Tiles: Cache-first with LRU eviction
 *
 * NOTE: API endpoints (geocode, walking-routes) all use POST
 * requests, which the Cache API cannot store. Those responses are cached
 * client-side in localStorage via src/lib/api-cache.ts with TTL-based
 * expiration instead.
 */

const CACHE_VERSION = "v2"
const CACHE_NAME = `map-search-${CACHE_VERSION}`
const DATA_CACHE_NAME = `map-search-data-${CACHE_VERSION}`
const TILES_CACHE_NAME = `map-search-tiles-${CACHE_VERSION}`

// App shell files to cache on install
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"]

// Data files (will be cached on demand by state)
const DATA_FILES_PATTERN = /\/data\/[a-z]+\/(schools|stations|supermarkets)\.json$/

// Map tiles from Carto
const TILES_PATTERN = /https:\/\/.*\.basemaps\.cartocdn\.com/

// How long a page load waits for the network before using the cached copy
const NAVIGATION_TIMEOUT_MS = 3000

// Maximum cache sizes
const MAX_TILES_CACHE_SIZE = 100

/**
 * Install event - cache app shell
 */
self.addEventListener("install", event => {
  console.log("[SW] Install event")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log("[SW] Caching app shell")
        return cache.addAll(APP_SHELL)
      })
      .then(() => self.skipWaiting())
  )
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", event => {
  console.log("[SW] Activate event")

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old versions of our caches, including the
            // now-unused API cache (POST responses can't be cached here)
            if (
              cacheName.startsWith("map-search-") &&
              cacheName !== CACHE_NAME &&
              cacheName !== DATA_CACHE_NAME &&
              cacheName !== TILES_CACHE_NAME
            ) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

/**
 * Fetch event - serve from cache or network based on resource type
 */
self.addEventListener("fetch", event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return
  }

  // Handle different resource types with appropriate strategies
  if (request.mode === "navigate") {
    // Pages: Network-first so a new deploy's index.html (and its new asset
    // hashes) is picked up straight away
    event.respondWith(networkFirstStrategy(request, CACHE_NAME))
  } else if (DATA_FILES_PATTERN.test(url.pathname)) {
    // Data files: serve the cached copy, refresh it in the background
    event.respondWith(staleWhileRevalidateStrategy(event, request, DATA_CACHE_NAME))
  } else if (TILES_PATTERN.test(url.href)) {
    // Map tiles: Cache-first with LRU eviction
    event.respondWith(
      cacheFirstStrategy(request, TILES_CACHE_NAME, MAX_TILES_CACHE_SIZE)
    )
  } else if (url.origin === self.location.origin) {
    // App shell: Cache-first
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME))
  }
  // All other requests (external resources, API POSTs) go directly to network
})

/**
 * Cache-first strategy: Check cache first, fallback to network
 */
async function cacheFirstStrategy(request, cacheName, maxSize = null) {
  try {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)

    if (cached) {
      console.log("[SW] Cache hit:", request.url)
      return cached
    }

    console.log("[SW] Cache miss, fetching:", request.url)
    const response = await fetch(request)

    // Cache successful responses
    if (response && response.status === 200) {
      // Clone the response before caching
      const responseToCache = response.clone()

      // If max size specified, manage cache size
      if (maxSize) {
        await manageCacheSize(cacheName, maxSize)
      }

      cache.put(request, responseToCache)
    }

    return response
  } catch (error) {
    console.error("[SW] Cache-first strategy failed:", error)

    // For navigation requests, return a cached page or offline page
    if (request.mode === "navigate") {
      const cachedPage = await caches.match("/")
      if (cachedPage) return cachedPage
    }

    throw error
  }
}

/**
 * Network-first strategy: Try the network, fall back to cache when offline or
 * when the network takes longer than NAVIGATION_TIMEOUT_MS
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const network = fetch(request).then(response => {
    // Update the cache even if we've already answered from it
    if (response && response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  })
  // Avoid an unhandled rejection if we answer from cache and the network
  // later fails
  network.catch(() => {})

  const cached = async () =>
    (await cache.match(request)) || (await cache.match("/"))

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), NAVIGATION_TIMEOUT_MS)
      ),
    ])
  } catch (error) {
    const fallback = await cached()
    if (fallback) {
      console.log(`[SW] Serving cached page (${error.message}):`, request.url)
      return fallback
    }
    // Nothing cached yet (first visit), so keep waiting for the network
    return network
  }
}

/**
 * Stale-while-revalidate strategy: Serve from cache immediately and update
 * the cache from the network in the background
 */
async function staleWhileRevalidateStrategy(event, request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const refresh = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        return cache.put(request, response.clone()).then(() => response)
      }
      return response
    })
    .catch(error => {
      console.log("[SW] Background refresh failed:", request.url, error)
      return undefined
    })

  if (cached) {
    // Keep the worker alive until the background refresh finishes
    event.waitUntil(refresh)
    return cached
  }

  const response = await refresh
  if (response) return response
  throw new Error(`Failed to fetch ${request.url}`)
}

/**
 * Manage cache size by removing oldest entries
 */
async function manageCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > maxSize) {
    console.log(
      `[SW] Cache ${cacheName} exceeds ${maxSize} entries, removing oldest`
    )
    // Remove oldest entries (first in keys array)
    const toDelete = keys.slice(0, keys.length - maxSize)
    await Promise.all(toDelete.map(key => cache.delete(key)))
  }
}

/**
 * Message handler for cache management
 */
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.startsWith("map-search-")) {
                console.log("[SW] Clearing cache:", cacheName)
                return caches.delete(cacheName)
              }
            })
          )
        })
        .then(() => {
          // Notify client that cache is cleared
          event.ports[0].postMessage({ success: true })
        })
    )
  }

  if (event.data && event.data.type === "GET_CACHE_SIZE") {
    event.waitUntil(
      getCacheSize().then(size => {
        event.ports[0].postMessage({ size })
      })
    )
  }
})

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const cacheName of cacheNames) {
    if (cacheName.startsWith("map-search-")) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()

      for (const request of keys) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          totalSize += blob.size
        }
      }
    }
  }

  return totalSize
}
