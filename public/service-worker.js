/**
 * Service Worker for Map Search PWA
 *
 * Cache Strategy:
 * - App Shell: Cache-first (HTML, CSS, JS, icons)
 * - Data Files: Cache-first with network fallback (schools.json, stations.json)
 * - API Calls: Network-first with cache fallback
 * - Map Tiles: Cache-first with expiration
 */

const CACHE_VERSION = "v1"
const CACHE_NAME = `map-search-${CACHE_VERSION}`
const DATA_CACHE_NAME = `map-search-data-${CACHE_VERSION}`
const API_CACHE_NAME = `map-search-api-${CACHE_VERSION}`
const TILES_CACHE_NAME = `map-search-tiles-${CACHE_VERSION}`

// App shell files to cache on install
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon.svg"]

// Data files (will be cached on demand by state)
const DATA_FILES_PATTERN = /\/data\/[a-z]+\/(schools|stations)\.json$/

// API endpoints
const API_PATTERN = /\/api\/(geocode|supermarkets|walking-routes)/

// Map tiles from Carto
const TILES_PATTERN = /https:\/\/.*\.basemaps\.cartocdn\.com/

// Maximum cache sizes
const MAX_API_CACHE_SIZE = 50
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
            // Delete old versions of our caches
            if (
              cacheName.startsWith("map-search-") &&
              cacheName !== CACHE_NAME &&
              cacheName !== DATA_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
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
  if (DATA_FILES_PATTERN.test(url.pathname)) {
    // Data files: Cache-first (they rarely change)
    event.respondWith(cacheFirstStrategy(request, DATA_CACHE_NAME))
  } else if (API_PATTERN.test(url.pathname)) {
    // API calls: Network-first with cache fallback
    event.respondWith(
      networkFirstStrategy(request, API_CACHE_NAME, MAX_API_CACHE_SIZE)
    )
  } else if (TILES_PATTERN.test(url.href)) {
    // Map tiles: Cache-first with expiration
    event.respondWith(
      cacheFirstStrategy(request, TILES_CACHE_NAME, MAX_TILES_CACHE_SIZE)
    )
  } else if (url.origin === self.location.origin) {
    // App shell: Cache-first
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME))
  }
  // All other requests (external resources) go directly to network
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
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirstStrategy(request, cacheName, maxSize = null) {
  try {
    console.log("[SW] Network-first, fetching:", request.url)
    const response = await fetch(request)

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName)
      const responseToCache = response.clone()

      // Manage cache size if specified
      if (maxSize) {
        await manageCacheSize(cacheName, maxSize)
      }

      cache.put(request, responseToCache)
    }

    return response
  } catch (error) {
    console.log("[SW] Network failed, checking cache:", request.url)
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)

    if (cached) {
      console.log("[SW] Serving from cache:", request.url)
      return cached
    }

    console.error("[SW] Network-first strategy failed:", error)
    throw error
  }
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
