# Quick Reference

This is a condensed reference for common tasks and patterns.

## Project Status

✅ **All Development Complete - Production Ready**

- Project setup and data processing
- Backend API endpoints (geocode, supermarkets, walking-routes)
- Core hooks and data loading
- Map components (Leaflet)
- Sidebar and UI components
- Service worker and PWA functionality
- Property platform-inspired style refinements

---

## Essential Commands

```bash
# Development
vercel dev               # Start Vercel dev (Vite + API functions) - http://localhost:3001
npm run dev              # Start Vite dev server only (frontend only) - http://localhost:5173
npm run build            # Build for production
npm run preview          # Preview production build

# Data Processing
npm run data:all         # Process all data files
npm run data:schools     # Process schools only
npm run data:stations    # Process stations only

# Environment Setup
cp .env.example .env     # Create .env file
vercel login             # Authenticate with Vercel (first time only)
npm install -g vercel    # Install Vercel CLI globally (if needed)

# API Testing (with Vercel dev running)
# Test geocode
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "123 Elizabeth St, Sydney NSW"}'

# Test supermarkets
curl -X POST http://localhost:3000/api/supermarkets \
  -H "Content-Type: application/json" \
  -d '{"lat": -33.8688, "lng": 151.2093}'

# Test walking routes
curl -X POST http://localhost:3000/api/walking-routes \
  -H "Content-Type: application/json" \
  -d '{"routes": [{"fromLat": -33.8688, "fromLng": 151.2093, "toLat": -33.87, "toLng": 151.21, "category": "school", "itemId": "test-1"}]}'
```

---

## File Structure

```
map-search/
├── api/                      # Vercel serverless functions
│   ├── geocode.ts           # ✅ Nominatim wrapper
│   ├── supermarkets.ts      # ✅ Overpass wrapper
│   ├── walking-routes.ts    # ✅ OpenRouteService wrapper
│   └── tsconfig.json        # ✅ TypeScript config for API
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md      # Technical architecture
│   ├── DATA_SOURCES.md      # Data sources & processing
│   ├── DECISIONS.md         # Key decisions & rationale
│   └── QUICK_REFERENCE.md   # This file
├── public/
│   ├── data/                # Processed state files
│   │   └── {state}/
│   │       ├── schools.json
│   │       └── stations.json
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Service worker
│   └── icon.svg            # App icon
├── scripts/                 # Data processing
│   ├── process-schools.ts
│   ├── process-stations.ts
│   └── process-all.ts
├── src/
│   ├── components/          # ✅ React components
│   │   ├── Map/            # Leaflet components
│   │   ├── Settings/       # Settings panel
│   │   ├── Sidebar/        # Search & results
│   │   └── UI/             # Reusable components
│   ├── hooks/              # ✅ Custom hooks
│   ├── lib/                # ✅ Utilities
│   │   ├── api-client.ts   # Backend API wrappers
│   │   ├── haversine.ts    # Distance calculations
│   │   ├── overpass.ts     # Overpass API client
│   │   └── openroute.ts    # OpenRouteService client
│   ├── types/              # ✅ TypeScript types
│   ├── utils/              # ✅ Helper functions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # ✅ Global styles (Tailwind)
├── .env.example            # Environment template
├── AGENTS.md               # Guide for AI assistants
├── README.md               # Project overview
└── package.json            # Dependencies & scripts
```

map-search2/
├── api/ # Vercel serverless functions
│ ├── geocode.ts # ✅ Nominatim wrapper
│ ├── supermarkets.ts # ✅ Overpass wrapper
│ ├── walking-routes.ts # ✅ OpenRouteService wrapper
│ └── tsconfig.json # ✅ TypeScript config for API
├── docs/ # Documentation
│ ├── ARCHITECTURE.md # Technical architecture
│ ├── DECISIONS.md # Key decisions & rationale
│ ├── IMPLEMENTATION_PLAN.md # Phase-by-phase plan
│ └── PHASE_2_COMPLETE.md # ✅ Phase 2 completion report
├── public/
│ ├── data/ # Processed state files
│ │ └── {state}/
│ │ ├── schools.json
│ │ └── stations.json
│ ├── manifest.json # PWA manifest
│ └── icon.svg # Placeholder icon
├── scripts/ # Data processing
│ ├── process-schools.ts
│ ├── process-stations.ts
│ └── process-all.ts
├── src/
│ ├── components/ # [TODO] React components
│ ├── hooks/ # [TODO] Custom hooks
│ ├── lib/ # ✅ Utilities
│ │ ├── haversine.ts # ✅ Distance calculations
│ │ ├── overpass.ts # ✅ Overpass API client
│ │ └── openroute.ts # ✅ OpenRouteService client
│ ├── types/ # ✅ TypeScript types
│ ├── utils/ # [TODO] Helper functions
│ ├── App.tsx # Main app component
│ ├── main.tsx # Entry point
│ └── index.css # ✅ Global styles (Tailwind)
├── .env.example # Environment template
├── README.md # Project overview
├── DATA_SOURCES.md # Data documentation
└── package.json # Dependencies & scripts

````

---

## API Endpoints

### POST /api/geocode
```typescript
Input:  { address: string }
Output: { lat, lng, state, displayName } | { error }
Uses:   Nominatim API (1 req/sec rate limit)
````

### POST /api/supermarkets

```typescript
Input:  { lat, lng, radius: 2000 }
Output: { supermarkets: POI[] } | { error }
Uses:   Overpass API (1 req/sec rate limit)
```

### POST /api/walking-routes

```typescript
Input:  { routes: RouteRequest[] }
Output: { routes: (WalkingRoute | null)[] } | { error }
Uses:   OpenRouteService (1000ms between requests)
```

---

## Key Types (from src/types/index.ts)

```typescript
type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT"
type SchoolSector = "Government" | "Catholic" | "Independent"
type POICategory = "school" | "station" | "supermarket"

interface POI {
  id: string
  name: string
  category: POICategory
  latitude: number
  longitude: number
  distance: number // Haversine km
  estimatedWalkingTime: number // Minutes
  details?: string
  sector?: SchoolSector // For schools
}

interface SearchResponse {
  location: SearchLocation
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]
}

interface WalkingRoute {
  duration: number // Minutes (accurate from API)
  distance: number // Meters
  polyline: string // Encoded
}
```

---

## Caching Strategy

### Static Assets (HTML, CSS, JS)

**Strategy**: Stale-While-Revalidate

- Return cached immediately
- Update in background
- Next visit uses new version

### Data Files (schools.json, stations.json)

**Strategy**: Cache-First

- Use cache if available
- Fetch if not cached
- Never refetch (user manually updates)

### API Responses

**Strategy**: Network-First with Smart Caching

**Limits** (no expiry, least recently used evicted first):

- Geocode: 200 entries
- Walking routes: 1000 entries

**Smart Behaviors**:

- Cached → instant return
- Request in-flight → deduplicate
- Network fails → stale cache fallback

---

## Component Hierarchy

```
App
├── Sidebar
│   ├── SearchBar
│   │   └── Button (Search / Use Location)
│   ├── POICard (School)
│   │   ├── SectorCheckboxes
│   │   ├── SelectedPOI
│   │   │   ├── TimeBadge (gray estimate → blue actual)
│   │   │   └── DistanceBadge
│   │   └── POIAlternatives (collapsible)
│   ├── POICard (Station)
│   ├── POICard (Supermarket)
│   ├── OfflineBanner
│   └── SettingsPanel
└── Map (Leaflet)
    ├── UserMarker (red circle)
    ├── POIMarkers (colored pins/dots)
    └── WalkingRoutes (colored polylines)
```

---

## Data Flow

```
1. User searches "123 Main St, Sydney"
   ↓
2. /api/geocode → { lat, lng, state: "NSW" }
   ↓
3. Load /data/nsw/schools.json + /data/nsw/stations.json (client-side)
   ↓
4. /api/supermarkets → { supermarkets }
   ↓
5. Haversine filter + sort (client-side)
   ↓
6. Display results with estimates (gray badges)
   ↓
7. Sequential fetch walking routes (1s delays):
   - School → update card + map
   - Station → update card + map
   - Supermarket → update card + map
   Badges turn blue, polylines appear
```

---

## State By The Numbers

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

**Total**: ~2.7MB (split, users only download needed state)

---

## Colors (from Tailwind config)

```typescript
const colors = {
  school: {
    government: "#3b82f6", // blue
    catholic: "#f97316", // orange
    independent: "#a855f7", // purple
  },
  station: "#0891b2", // cyan
  supermarket: "#eab308", // yellow
  user: "#ef4444", // red
}
```

---

## Environment Variables

```bash
# Required for walking routes
ORS_API_KEY=your_openroute_service_api_key
```

Get free key at: https://openrouteservice.org/dev/#/signup

---

## Key Implementation Notes

### School Sector Filtering

- **Location**: Inside POI card (not search bar)
- **Persistence**: localStorage via useSectorPreferences hook
- **Default**: All three sectors enabled

### Sequential API Fetching

```typescript
for (const route of routes) {
  await fetch('/api/walking-routes', ...);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
}
```

### State Detection

```typescript
// From geocode response
const state = extractStateFromAddress(geocodeResult.address)
// Map: "New South Wales" → "NSW", "Victoria" → "VIC", etc.
```

### Offline Mode

```typescript
const isOnline = navigator.onLine

if (!isOnline) {
  // Show banner
  // Replace text input with <select> of cached addresses
  // "Use my location" still works
  // Hide supermarkets or show "unavailable offline"
}
```

### Share Target (Logging Only)

```typescript
const params = new URLSearchParams(window.location.search)
const sharedText = params.get("text")

if (sharedText) {
  console.group("🔗 Share Target Activated")
  console.log("Raw:", sharedText)
  console.log("Cleaned:", cleanAddress(sharedText))
  console.groupEnd()
  // TODO: handleSearch(cleanAddress(sharedText));
}
```

---

## Testing Checklist

### Backend

- [x] `/api/geocode` returns correct state
- [x] `/api/supermarkets` returns nearby stores
- [x] `/api/walking-routes` returns valid polylines
- [x] Rate limiting works (no 429 errors)

### Core Hooks

- [x] useDataLoader fetches state files correctly
- [x] useWalkingRoutes caches and deduplicates
- [x] useSectorPreferences persists to localStorage
- [x] Haversine filtering works

### Map Components

- [x] Map renders with Carto tiles
- [x] Markers appear (correct colors/styles)
- [x] Polylines draw when routes load
- [x] Click alternative updates map

### UI Components

- [x] Full search workflow works
- [x] POI cards display correctly
- [x] Alternatives toggle and select
- [x] Sector filtering updates results
- [x] Mobile responsive design
- [x] Desktop layout

### Service Worker & PWA

- [x] Service worker registers
- [x] Static assets cached
- [x] Data files cached
- [x] API responses cached (size-limited LRU)
- [x] Offline mode works
- [x] PWA installable

### Polish

- [x] No console errors
- [x] Smooth on mobile and desktop
- [x] Keyboard navigation works
- [x] Loading states clear
- [x] Error handling graceful

---

## Common Issues & Solutions

### "require is not defined"

- **Cause**: ESM module using CommonJS syntax
- **Fix**: Remove `if (require.main === module)` from scripts

### "Cannot find module 'leaflet'"

- **Cause**: Missing dependency
- **Fix**: `npm install leaflet react-leaflet @types/leaflet`

### Service worker not updating

- **Cause**: Aggressive caching
- **Fix**: Hard refresh (Cmd+Shift+R) or clear application cache in DevTools

### Map not rendering

- **Cause**: Missing Leaflet CSS
- **Fix**: Check `@import 'leaflet/dist/leaflet.css'` in index.css

### Walking routes 429 errors

- **Cause**: Rate limiting
- **Fix**: Increase delay between requests (1000ms → 2000ms)

### State not detected

- **Cause**: Geocoding didn't return state
- **Fix**: Parse display_name or use postcode ranges

---

## Useful Links

- **OpenRouteService**: https://openrouteservice.org/
- **Nominatim**: https://nominatim.org/
- **Overpass API**: https://overpass-api.de/
- **Leaflet Docs**: https://leafletjs.com/
- **React Leaflet**: https://react-leaflet.js.org/
- **Tailwind Docs**: https://tailwindcss.com/
- **Vercel Docs**: https://vercel.com/docs

---

## Getting Help

If stuck or need reference:

1. **Check docs**:
   - `AGENTS.md` - Comprehensive guide for AI assistants
   - `ARCHITECTURE.md` - Technical architecture details
   - `DECISIONS.md` - Decision rationale and context
   - `QUICK_REFERENCE.md` - This file
2. **Check types**: `src/types/index.ts` has all interfaces
3. **Check components**: Well-documented React components in `src/components/`

---

**Last Updated**: December 2024 - All phases complete, production ready
