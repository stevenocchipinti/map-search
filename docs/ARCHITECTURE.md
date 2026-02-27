# Architecture Overview

This document describes the technical architecture and design decisions for the Local Search application.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Sidebar    │  │     Map      │  │Service Worker│     │
│  │ Components   │  │  (Leaflet)   │  │   Caching    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Custom Hooks (State Management)          │     │
│  │  • useDataLoader    • useWalkingRoutes          │     │
│  │  • useServiceWorker • useOnlineStatus           │     │
│  └──────────────────────────────────────────────────┘     │
│         │                                                   │
│  ┌──────────────────────────────────────────────────┐     │
│  │            API Client (fetch wrapper)             │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Vercel Functions)                 │
│                                                              │
│  /api/geocode        - Nominatim API wrapper                │
│  /api/supermarkets   - Overpass API wrapper                 │
│  /api/walking-routes - OpenRouteService API wrapper         │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ External APIs
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                              │
│  • Nominatim (OpenStreetMap) - Geocoding                    │
│  • Overpass API - Supermarket data                          │
│  • OpenRouteService - Walking routes & times                │
└─────────────────────────────────────────────────────────────┘
```

## State-Based Client-Side Data Loading

### Overview

Schools and train stations are loaded **client-side** and split by Australian state for optimal performance.

### Why Client-Side?

**Advantages:**

- ✅ No server processing needed (saves serverless execution time/cost)
- ✅ Faster responses (no network roundtrip for data)
- ✅ Better scalability (server only handles API proxying)
- ✅ Offline-ready (data cached in service worker)
- ✅ Haversine calculations are fast in JavaScript

**Trade-offs:**

- ⚠️ Initial load size: 0.5-1.5MB per state (vs 5.5MB for all Australia)
- ⚠️ Parsing time: ~50-100ms per state
- ✅ Mitigated by state-based splitting and caching

### State Detection Flow

```
1. User searches "123 Main St, Sydney"
   ↓
2. Client calls /api/geocode
   ↓
3. Server returns: { lat, lng, state: "NSW", displayName }
   ↓
4. Client checks if NSW data already loaded
   ↓
5. If not loaded:
   - Fetch /data/nsw/schools.json (~770KB)
   - Fetch /data/nsw/stations.json (~60KB)
   - Store in memory for session
   - Service worker caches for offline use
   ↓
6. Client performs Haversine filtering locally
   ↓
7. Display results with estimated walking times
   ↓
8. Sequentially fetch accurate walking routes (1s delays)
```

### State File Sizes

| State | Schools | Stations | Total Size |
| ----- | ------- | -------- | ---------- |
| NSW   | 3,429   | 436      | ~832KB     |
| VIC   | 2,842   | 413      | ~699KB     |
| QLD   | 2,003   | 377      | ~496KB     |
| WA    | 1,271   | 342      | ~330KB     |
| SA    | 792     | 127      | ~194KB     |
| TAS   | 287     | 3        | ~65KB      |
| ACT   | 150     | 0        | ~33KB      |
| NT    | 220     | 11       | ~50KB      |

**Total**: ~2.7MB across all states (users only download what they need)

## Progressive Enhancement Pattern

The app follows a progressive enhancement strategy for optimal UX:

### Phase 1: Immediate Display (0-100ms)

```
User searches → Show results with:
  • Haversine distance (km)
  • Estimated walking time (distance × 1.4 × 60 / 5)
  • Gray "estimate" badges
  • Map markers appear
```

### Phase 2: Accurate Times (1-4 seconds)

```
Background sequential fetching:
  • Fetch walking route for school (1s delay)
  • Update school card with accurate time
  • Draw polyline on map
  • Badge turns blue "actual"
  ↓
  • Fetch walking route for station (1s delay)
  • Update station card
  ↓
  • Fetch walking route for supermarket (1s delay)
  • Update supermarket card
```

### Phase 3: On-Demand Alternatives

```
User clicks alternative POI:
  • Check cache
  • If not cached, fetch walking route
  • Update card and map
  • Cache for future use
```

### Why This Works

- **Perceived performance**: Users see results instantly
- **API respect**: Sequential requests with delays avoid rate limiting
- **Smart caching**: Repeated searches reuse cached routes
- **Graceful degradation**: If API fails, estimates still shown

## Service Worker Caching Strategy

### Cache Types and Strategies

The service worker handles caching for **GET requests only**. API endpoints use
POST requests which the Cache API cannot store — those are cached client-side
in localStorage instead (see "API Response Caching" below).

#### 1. Static Assets (HTML, CSS, JS)

**Strategy**: Cache-First

```javascript
// Return cached immediately, fallback to network
cache.match(request).then(cached => {
  return cached || fetch(request).then(response => {
    cache.put(request, response.clone())
    return response
  })
})
```

**Benefits**:

- Instant load (cache-first speed)
- Offline-ready (cached fallback)
- Updated when service worker version changes

#### 2. Data Files (schools.json, stations.json)

**Strategy**: Cache-First

```javascript
// Use cache, fallback to network
cache.match(request).then(cached => {
  return (
    cached ||
    fetch(request).then(response => {
      cache.put(request, response.clone())
      return response
    })
  )
})
```

**Rationale**: Data files rarely change (quarterly updates), cache indefinitely

#### 3. Map Tiles

**Strategy**: Cache-First with LRU eviction (max 100 tiles)

### API Response Caching (localStorage)

API endpoints (`/api/geocode`, `/api/supermarkets`, `/api/walking-routes`) all
use POST requests, which the Cache API cannot store. Instead, responses are
cached client-side in localStorage with TTL-based expiration.

**Implementation**: `src/lib/api-cache.ts`

```typescript
// Cache check happens in api-client.ts before any network call
const cached = getCached<GeocodeResponse>("geocode", cacheKey)
if (cached) return cached  // No network request made

// On successful response, cache for future use
setCached("geocode", cacheKey, data)
```

**TTL Values**:

- Geocode: 30 days (addresses don't move)
- Supermarkets: 7 days (stores change occasionally)
- Walking routes: 30 days (routes rarely change)

**Max Entries** (FIFO eviction when exceeded):

- Geocode: 50 entries
- Supermarkets: 30 entries
- Walking routes: 100 entries

**Cache Persistence**:

- Survives page refreshes and browser restarts
- Cleared by Settings > Clear Cache (`localStorage.clear()`)
- Walking routes are also hydrated into the in-memory `useWalkingRoutes`
  cache on mount, so route data is available immediately without re-parsing

**Behavior on refresh**:

1. URL params preserve search coordinates
2. State data files served from service worker cache (GET, cache-first)
3. Geocode/supermarket/route responses served from localStorage cache
4. Walking routes hydrated into React state from localStorage
5. No network requests needed if all data is within TTL

## Sequential API Fetching Strategy

### The Problem

OpenRouteService API has strict rate limits:

- Free tier: 40 requests/minute
- 429 errors if exceeded

### The Solution

**Sequential fetching with delays:**

```typescript
async function fetchWalkingRoutesSequentially(routes: RouteRequest[]) {
  const results = []

  for (const route of routes) {
    // Check cache first
    const cacheKey = `${route.fromLat},${route.fromLng}-${route.toLat},${route.toLng}`
    if (routeCache.has(cacheKey)) {
      results.push(routeCache.get(cacheKey))
      continue
    }

    // Fetch from API
    const result = await fetch("/api/walking-routes", {
      method: "POST",
      body: JSON.stringify([route]),
    })

    results.push(result)
    routeCache.set(cacheKey, result)

    // Wait 1 second before next request
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
```

### Auto-Fetch on Load

```typescript
useEffect(() => {
  if (!searchResults) return

  // Auto-fetch top 3 POIs sequentially
  const toFetch = [
    { category: "school", item: searchResults.schools[0] },
    { category: "station", item: searchResults.stations[0] },
    { category: "supermarket", item: searchResults.supermarkets[0] },
  ]

  fetchWalkingRoutesSequentially(toFetch)
}, [searchResults])
```

### On-Demand Fetch (User Clicks Alternative)

```typescript
async function handleSelectAlternative(category: POICategory, index: number) {
  setSelectedIndices(prev => ({ ...prev, [category]: index }))

  const poi = searchResults[category][index]
  const cacheKey = getCacheKey(searchLocation, poi)

  // Check cache
  if (routeCache.has(cacheKey)) {
    updateMap(routeCache.get(cacheKey))
    return
  }

  // Fetch and cache
  setLoading(category, true)
  const route = await fetchWalkingRoute(searchLocation, poi)
  routeCache.set(cacheKey, route)
  updateMap(route)
  setLoading(category, false)
}
```

## Minimal Server-Side Architecture

The server only handles what **must** be server-side:

### API Endpoint Responsibilities

#### `/api/geocode`

- **Why server-side**: Nominatim requires User-Agent header, rate limiting per IP
- **Input**: Address string
- **Processing**:
  - Call Nominatim API with proper headers
  - Extract state from address components
  - Rate limit: 1 req/sec (1000ms delay)
- **Output**: `{ lat, lng, state, displayName }`

#### `/api/supermarkets`

- **Why server-side**: Overpass API has complex queries, rate limiting
- **Input**: `{ lat, lng, radius }`
- **Processing**:
  - Query Overpass API for `shop=supermarket`
  - Smart name formatting (suburb/street/postcode)
  - Rate limit: 1 req/sec
- **Output**: `{ supermarkets: POI[] }`

#### `/api/walking-routes`

- **Why server-side**: OpenRouteService requires API key (secret)
- **Input**: `{ routes: RouteRequest[] }`
- **Processing**:
  - Batch request to OpenRouteService
  - Decode polylines
  - Handle 429 errors gracefully
  - Rate limit: 500ms between requests
- **Output**: `{ routes: (WalkingRoute | null)[] }`

### Shared Utilities (Server-Side)

- `lib/haversine.ts` - Distance calculations (also used client-side)
- `lib/overpass.ts` - Overpass API client
- `lib/openroute.ts` - OpenRouteService API client

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTION                           │
│              "Search for 123 Main St, Sydney"                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  1. GEOCODE (Server API)                     │
│  Client → /api/geocode → Nominatim → { lat, lng, state }    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              2. LOAD STATE DATA (Client-Side)                │
│  Check if NSW loaded → No → Fetch /data/nsw/schools.json    │
│                            Fetch /data/nsw/stations.json     │
│                       → Cache in memory + service worker     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            3. FETCH SUPERMARKETS (Server API)                │
│  Client → /api/supermarkets → Overpass → { supermarkets }   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           4. FILTER & SORT (Client-Side)                     │
│  • Haversine distance to all schools/stations               │
│  • Filter by sector (Government/Catholic/Independent)        │
│  • Filter within 2.5km max walking distance                 │
│  • Sort by distance                                          │
│  • Take top 10 of each category                             │
│  • Calculate estimated walking times                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  5. DISPLAY RESULTS                          │
│  • Show map with markers                                     │
│  • Show POI cards with estimates (gray badges)              │
│  • Show alternatives (collapsed)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│      6. FETCH ACCURATE WALKING ROUTES (Background)           │
│  Sequential with 1s delays:                                  │
│  • School → /api/walking-routes → Update card + map         │
│  • Station → /api/walking-routes → Update card + map        │
│  • Supermarket → /api/walking-routes → Update card + map    │
│  Badges turn blue, polylines appear                          │
└─────────────────────────────────────────────────────────────┘
```

## Offline Mode

### Detection

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine)

useEffect(() => {
  window.addEventListener("online", () => setIsOnline(true))
  window.addEventListener("offline", () => setIsOnline(false))
}, [])
```

### Offline UX

**When Online**: Normal functionality

**When Offline**:

1. Show banner: "You're offline. Search from recent locations or use current location."
2. Replace text input with `<select>` dropdown of cached addresses
3. "Use my location" button still works (geolocation is offline-capable)
4. Show schools/stations from cached data
5. Hide supermarkets or show: "Supermarket data unavailable offline"
6. Show cached walking routes if available

### What Works Offline

- ✅ Previously searched addresses (geocoding cached)
- ✅ Schools/stations data (cached per state)
- ✅ Walking routes (cached per route)
- ✅ Map tiles (if cached by browser)
- ✅ Geolocation ("Use my location")

### What Doesn't Work Offline

- ❌ New address searches (requires geocoding)
- ❌ Supermarket data (live API)
- ❌ New walking routes (requires OpenRouteService)

## Share Target Integration (Prepared)

### PWA Manifest Configuration

```json
{
  "share_target": {
    "action": "/",
    "method": "GET",
    "params": {
      "text": "address"
    }
  }
}
```

### Current Implementation (Logging Only)

```typescript
// In App.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const sharedText = params.get("text")

  if (sharedText) {
    console.group("🔗 Share Target Activated")
    console.log("Raw shared text:", sharedText)
    console.log("Contains URL:", /https?:\/\//.test(sharedText))

    const cleanedAddress = sharedText.replace(/https?:\/\/[^\s]+/g, "").trim()
    console.log("Cleaned address (preview):", cleanedAddress)
    console.groupEnd()

    // TODO: Implement auto-search when ready
    // handleSearch(cleanedAddress);
  }
}, [])
```

### Future Implementation

When ready to activate:

1. Parse shared text (strip URLs from realestate.com.au, etc.)
2. Auto-populate search input
3. Auto-trigger search
4. Clear URL params (for clean UX)

## Technology Choices

### Why React 19?

- Latest features (compiler, concurrent rendering)
- Wide ecosystem and tooling
- Component-based architecture fits well

### Why React Compiler?

- Automatic memoization (no manual useMemo/useCallback)
- Better performance out of the box
- Future-proof (becoming standard)

### Why Leaflet?

- ✅ Open source and free
- ✅ Lightweight (~40KB gzipped)
- ✅ No API keys required
- ✅ Works offline with cached tiles
- ✅ Excellent plugin ecosystem
- ❌ Not as modern as Mapbox GL JS
- ❌ Fewer built-in features

**Alternative considered**: Mapbox GL JS (requires API key, costs money at scale)

### Why Tailwind CSS?

- ✅ Rapid development
- ✅ Consistent design system
- ✅ Small production bundle (only used classes)
- ✅ Mobile-first responsive design built-in
- ✅ Great with React components

### Why Vercel?

- ✅ Zero-config deployment
- ✅ Serverless functions (no server management)
- ✅ Edge network (fast globally)
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Free tier suitable for this app

## Scalability Considerations

### Current Architecture (MVP)

**Suitable for**:

- ~1,000 users/day
- ~10,000 searches/month
- Free tier APIs

**Bottlenecks**:

- OpenRouteService API (40 req/min per user)
- Nominatim rate limiting (1 req/sec)
- Vercel serverless execution time

### Future Scaling Options

**If Usage Grows**:

1. **Upgrade API tiers**
   - OpenRouteService Pro: 1,000 req/min
   - Self-host Nominatim instance

2. **Pre-compute more data**
   - Generate walking routes for common searches
   - Pre-calculate nearest POIs by suburb

3. **Add Redis caching**
   - Cache geocoding results (shared across users)
   - Cache supermarket queries
   - Reduce external API calls

4. **Consider supermarket pre-processing**
   - Generate state-based supermarket files
   - Update weekly via automated script
   - Reduces Overpass API dependency

5. **CDN optimization**
   - Move data files to CDN (Cloudflare, etc.)
   - Faster downloads globally

## Security Considerations

### API Key Protection

- ✅ OpenRouteService key stored in Vercel environment variables
- ✅ Never exposed to client
- ✅ Server-side API endpoints act as proxy

### Rate Limiting

- ✅ Built into serverless functions (per deployment)
- ❌ No per-user rate limiting yet (future enhancement)

### Data Validation

- ✅ Light validation on data processing
- ⚠️ Should add input sanitization for API endpoints (future)

### XSS Prevention

- ✅ React escapes by default
- ✅ No dangerouslySetInnerHTML used
- ✅ URLs sanitized before display

## Performance Metrics

### Target Performance

- **Time to First Byte (TTFB)**: <200ms
- **First Contentful Paint (FCP)**: <1s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Time to Interactive (TTI)**: <3s
- **Search Results Display**: <500ms (with estimates)
- **Accurate Route Update**: 1-4s (sequential)

### Optimization Techniques

1. **Code splitting**: React.lazy() for map components
2. **Tree shaking**: Tailwind purges unused CSS
3. **Compression**: Gzip/Brotli on Vercel
4. **Caching**: Service worker aggressive caching
5. **State-based loading**: Only load needed data
6. **Memoization**: React Compiler auto-memoizes
7. **Sequential API calls**: Prevents UI blocking

## Browser Support

### Target Browsers

- Chrome 90+ (95% market share)
- Safari 14+ (iOS + macOS)
- Firefox 88+
- Edge 90+

### Required Features

- ✅ ES2020+ (async/await, optional chaining, nullish coalescing)
- ✅ Service Workers
- ✅ Geolocation API
- ✅ Fetch API
- ✅ localStorage
- ✅ URLSearchParams

### Progressive Enhancement

- Map falls back to static view if Leaflet fails
- Geolocation gracefully degrades to text input only
- Service worker enhances but not required
- Offline mode detected automatically

## Future Enhancements

### Potential Features

1. **Route preferences**
   - Avoid highways
   - Prefer parks/greenways
   - Accessibility options

2. **Multiple transport modes**
   - Cycling routes and times
   - Public transport integration
   - Driving routes

3. **Saved searches**
   - User accounts (optional)
   - Favorites/bookmarks
   - Search history

4. **Advanced filtering**
   - School ratings/reviews
   - Station facilities (parking, lifts)
   - Supermarket chains (Coles, Woolworths, etc.)

5. **Analytics**
   - Popular search areas
   - Common POI selections
   - Performance monitoring

6. **Notifications**
   - New schools opened nearby
   - Station closures/delays
   - Data updates available

### Technical Debt to Address

- Add comprehensive error boundaries
- Implement per-user rate limiting
- Add API input validation/sanitization
- Write unit tests (Vitest)
- Write E2E tests (Playwright)
- Add performance monitoring (Web Vitals)
- Implement proper logging (client + server)
- Add accessibility audit (WCAG AA compliance)
