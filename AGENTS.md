# AGENTS.md - Map Search Codebase Guide for AI Assistants

## Project Overview

**Map Search** is a Progressive Web App (PWA) that helps users find the nearest schools, train stations, and supermarkets to any address in Australia. It features interactive maps with walking routes, offline support, and state-based data loading for optimal performance.

**Tech Stack:**
- **Frontend**: React 19 + TypeScript, Vite build tool
- **Compiler**: React Compiler (experimental) - handles memoization automatically
- **Styling**: Tailwind CSS with custom configuration
- **Maps**: Leaflet + react-leaflet with Carto Voyager tiles
- **Backend**: Vercel Serverless Functions (3 API endpoints)
- **Hosting**: Vercel
- **PWA**: Service Worker with smart caching strategies

**Key Characteristics:**
- Mobile-first responsive design
- Progressive enhancement (estimates → accurate times)
- Client-side data processing with state-based loading
- Offline-capable with service worker
- ~115 kB gzipped bundle size

---

## Project Structure

```
map-search/
├── api/                      # Vercel serverless functions
│   ├── geocode.ts           # Address → coordinates + state
│   ├── supermarkets.ts      # Overpass API wrapper
│   ├── walking-routes.ts    # OpenRouteService wrapper
│   └── tsconfig.json        # API TypeScript config
│
├── public/
│   ├── data/                # State-based POI data
│   │   └── {state}/
│   │       ├── schools.json  # ~30-800KB per state
│   │       └── stations.json # ~0.3-60KB per state
│   ├── service-worker.js    # PWA service worker
│   ├── manifest.json        # PWA manifest
│   └── icon.svg            # App icon
│
├── src/
│   ├── components/
│   │   ├── Map/            # Leaflet map components
│   │   │   ├── Map.tsx              # Container with tiles
│   │   │   ├── MapMarker.tsx        # Custom markers
│   │   │   └── MapPolyline.tsx      # Walking routes
│   │   ├── Sidebar/        # Search and results UI
│   │   │   ├── Sidebar.tsx          # Main container
│   │   │   ├── SearchBar.tsx        # Input + buttons
│   │   │   ├── POICard.tsx          # Result cards
│   │   │   ├── POIAlternatives.tsx  # Collapsible list
│   │   │   ├── SectorCheckboxes.tsx # School filters
│   │   │   └── OfflineBanner.tsx    # Offline indicator
│   │   ├── Settings/
│   │   │   └── SettingsPanel.tsx    # Cache management
│   │   └── UI/             # Reusable components
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useDataLoader.ts         # State-based data loading
│   │   ├── useWalkingRoutes.ts      # Route fetching & caching
│   │   ├── useGeolocation.ts        # "Use location" feature
│   │   ├── useSectorPreferences.ts  # School filter persistence
│   │   ├── useServiceWorker.ts      # SW lifecycle management
│   │   ├── useInstallPrompt.ts      # PWA install prompt
│   │   └── useOnlineStatus.ts       # Online/offline detection
│   │
│   ├── lib/                # External API clients
│   │   ├── api-client.ts   # Backend API wrappers
│   │   ├── haversine.ts    # Distance calculations
│   │   ├── overpass.ts     # Overpass API client
│   │   └── openroute.ts    # OpenRouteService client
│   │
│   ├── utils/              # Helper functions
│   │   ├── format.ts       # Distance/duration formatting
│   │   ├── map-helpers.ts  # Marker icons and colors
│   │   └── polyline.ts     # Polyline decoder
│   │
│   ├── types/
│   │   └── index.ts        # All TypeScript types
│   │
│   ├── App.tsx             # Main application
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles + Tailwind
│
├── scripts/                # Data processing
│   ├── process-schools.ts  # Split schools by state
│   ├── process-stations.ts # Split stations by state
│   └── process-all.ts      # Process both
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # Technical architecture
│   ├── DECISIONS.md        # Decision rationale
│   └── QUICK_REFERENCE.md  # Commands and patterns
│
├── README.md               # Project overview
├── DATA_SOURCES.md         # Data sources and processing
└── AGENTS.md               # This file
```

---

## Core Architecture Patterns

### 1. State Management (No Redux/Zustand)

**Pattern**: Custom hooks + React state
- Each concern has its own hook (data loading, routes, preferences, etc.)
- `App.tsx` uses React state for search results and selections
- React Compiler automatically optimizes (no manual `useMemo`/`useCallback` needed)

**Why**: Simpler, smaller bundle, good separation of concerns

### 2. Data Loading Strategy

**Client-side, state-based loading:**
1. User searches address → geocode to get state (NSW, VIC, etc.)
2. Load only that state's schools + stations (~100-300ms)
3. Fetch supermarkets from Overpass API (~1-3s)
4. Filter by Haversine distance client-side (~10ms for 10k records)

**Benefits:**
- Only loads data for searched area (~0.5-1.5MB vs ~5.5MB for all Australia)
- Fast filtering (client-side Haversine)
- Enables offline functionality
- Better mobile experience

### 3. Progressive Enhancement

**Pattern**: Show estimates immediately, fetch actuals in background

**Search Flow:**
```
1. Display results instantly (0-100ms)
   - Haversine distances
   - Estimated walking times (gray badges)
   - Markers on map

2. Background fetching (1-4 seconds)
   - Sequential API calls with 1-second delays
   - Update cards with accurate times
   - Badges turn blue (actual)
   - Polylines drawn on map

3. On-demand fetching
   - User clicks alternative
   - Fetch route if not cached
   - Update display
```

**Walking Time Formula:**
```javascript
estimatedMinutes = (distanceKm / 5) * 60 * 1.4
// 5 km/h walking speed, 40% adjustment for real-world factors
```

### 4. API Rate Limiting

**Challenge**: Respect third-party API limits
- Nominatim: 1 req/sec
- Overpass: 1 req/sec
- OpenRouteService: 40 req/min (free tier)

**Solution**: Sequential fetching with 1-second delays
```typescript
for (const route of routes) {
  await fetchRoute(route);
  await delay(1000); // Respect rate limits
}
```

### 5. Caching Strategy (Service Worker)

**App Shell** (Cache-first):
- HTML, CSS, JS, icons, manifest
- Always serve from cache, update in background

**Data Files** (Cache-first):
- `schools.json`, `stations.json` by state
- User manually triggers updates (settings)

**API Responses** (Network-first with cache fallback):
- Geocode: 30-day TTL
- Supermarkets: 7-day TTL
- Walking routes: 30-day TTL
- Falls back to stale cache if offline

**Map Tiles** (Cache-first with LRU):
- Cache first 100 tiles
- Evict oldest when limit reached

---

## Common Development Tasks

### Adding a New Component

**Location**: `src/components/{Category}/{ComponentName}.tsx`

**Template:**
```typescript
import { ComponentProps } from './types'; // or from src/types

interface MyComponentProps {
  // Props definition
}

export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Component logic
  
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

**Styling**: Use Tailwind utility classes
- Mobile-first: Base styles for mobile
- Desktop: `md:` prefix for >= 768px
- Avoid custom CSS unless necessary

### Adding a New API Endpoint

**Steps:**
1. Create `api/{endpoint-name}.ts`
2. Export default async function handler
3. Use TypeScript for request/response types
4. Add to `src/lib/api-client.ts` wrapper
5. Test with `vercel dev`

**Template:**
```typescript
// api/my-endpoint.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
  // Define request shape
}

interface ResponseData {
  // Define response shape
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { param } = req.body as RequestBody;
    
    // Validation
    if (!param) {
      return res.status(400).json({ error: 'Missing parameter' });
    }

    // Logic here
    const result = await doSomething(param);
    
    return res.status(200).json({ result } as ResponseData);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
```

**Wrapper in api-client.ts:**
```typescript
export async function myApiCall(param: string): Promise<ResponseData> {
  const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
  const response = await fetch(`${baseUrl}/api/my-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ param }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Adding a New Custom Hook

**Location**: `src/hooks/use{HookName}.ts`

**Template:**
```typescript
import { useState, useEffect } from 'react';

export function useMyHook(param: string) {
  const [state, setState] = useState<Type>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Effect logic
  }, [param]);

  const doSomething = async () => {
    setLoading(true);
    setError(null);
    try {
      // Logic
      setState(newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { state, loading, error, doSomething };
}
```

**State Persistence (localStorage):**
```typescript
const [state, setState] = useState(() => {
  const stored = localStorage.getItem('key');
  return stored ? JSON.parse(stored) : defaultValue;
});

useEffect(() => {
  localStorage.setItem('key', JSON.stringify(state));
}, [state]);
```

### Updating Data Files

**Process:**
1. Place source files in `data-sources/`:
   - `schools.json` (or `School Location 2024.xlsx`)
   - `stations.geojson`
2. Run processing script:
   ```bash
   npm run data:all        # Process both
   npm run data:schools    # Schools only
   npm run data:stations   # Stations only
   ```
3. Output appears in `public/data/{state}/`
4. Commit the processed files

**Data Schema:**

Schools:
```typescript
{
  name: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  sector: 'Government' | 'Catholic' | 'Independent';
  type: 'Primary' | 'Secondary' | 'Combined';
  latitude: number;
  longitude: number;
}
```

Stations:
```typescript
{
  name: string;
  state: AustralianState;
  latitude: number;
  longitude: number;
}
```

### Modifying Styles

**Approach**: Tailwind utility classes first, custom CSS only when necessary

**Tailwind Config** (`tailwind.config.ts`):
```typescript
theme: {
  extend: {
    colors: {
      // Custom colors added here
    },
    boxShadow: {
      'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
      'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
      'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
    }
  }
}
```

**Color System:**
- Primary: `blue-600`, `blue-700`, `blue-500`
- Government schools: `blue-600`
- Catholic schools: `red-600`
- Independent schools: `violet-600`
- Stations: `cyan-600`
- Supermarkets: `emerald-600`

**Responsive Breakpoints:**
```css
/* Mobile (default) */
.my-class { ... }

/* Desktop (>= 768px) */
@media (min-width: 768px) {
  .md:my-class { ... }
}
```

### Working with Service Worker

**Development**: Service worker disabled in dev mode
**Production**: Automatically registers after build

**Trigger SW update from app:**
```typescript
const { updateAvailable, update } = useServiceWorker();

if (updateAvailable) {
  await update(); // Reloads page after update
}
```

**Clear cache:**
```typescript
const { clearCache, getCacheSize } = useServiceWorker();

const size = await getCacheSize();
await clearCache();
```

**Testing SW locally:**
```bash
npm run build
npm run preview  # Serves production build
# Visit localhost:4173
# Open DevTools → Application → Service Workers
```

---

## Important Constraints & Gotchas

### 1. ESM Module Resolution

**Issue**: Vercel serverless functions require explicit `.js` extensions for ESM imports

**Correct:**
```typescript
import { haversineDistance } from './haversine.js';
import { findNearbySupermarkets } from '../src/lib/overpass.js';
```

**Incorrect:**
```typescript
import { haversineDistance } from './haversine';
```

### 2. React Compiler

**What it does**: Automatically memoizes components and values
**What you don't need**: Manual `useMemo`, `useCallback`, `React.memo` in most cases

**When to use manual optimization:**
- Very expensive calculations (rare)
- When profiling shows specific bottleneck
- The compiler doesn't catch everything yet

### 3. Mobile-First Design

**Always design for mobile first, then enhance for desktop:**
```css
/* ✅ Correct */
.sidebar { width: 100%; }
@media (min-width: 768px) {
  .sidebar { width: 384px; }
}

/* ❌ Incorrect */
.sidebar { width: 384px; }
@media (max-width: 767px) {
  .sidebar { width: 100%; }
}
```

### 4. State-Based Data Loading

**Always load data based on detected state, never load all Australia at once:**

```typescript
// ✅ Correct
const state = geocodeResult.state; // 'NSW'
await loadState(state); // Only loads NSW data

// ❌ Incorrect
await Promise.all(states.map(loadState)); // Loads 5.5MB
```

### 5. API Rate Limiting

**Always add delays between API calls:**

```typescript
// ✅ Correct - Sequential with delays
for (const route of routes) {
  await fetchRoute(route);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// ❌ Incorrect - Parallel requests
await Promise.all(routes.map(fetchRoute)); // Will hit rate limits
```

### 6. TypeScript in Serverless Functions

**API folder needs its own tsconfig.json:**
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "ES2020",
    "moduleResolution": "node"
  }
}
```

### 7. Service Worker Scope

**Service worker only works on HTTPS (or localhost)**
- Dev: `http://localhost` works
- Prod: Requires HTTPS
- Preview: `vercel dev` or `npm run preview` works

### 8. Haversine Distance

**Use for initial filtering only, not for walking routes:**
- Haversine: Straight-line distance ("as the crow flies")
- Walking route: Actual path following roads
- Haversine is ~20-40% shorter than walking distance

### 9. Tailwind CSS Generation

**Tailwind JIT only generates classes it sees in code:**

```typescript
// ✅ Correct - Explicit classes
<div className="bg-blue-600 text-white">

// ❌ Incorrect - Dynamic classes won't generate
const color = 'blue';
<div className={`bg-${color}-600`}> // Won't work!

// ✅ Better - Use safelist in tailwind.config.ts for dynamic classes
```

---

## Development Workflow

### Setup (First Time)

```bash
# Clone and install
git clone <repo>
cd map-search
npm install

# Set up environment
cp .env.example .env
# Edit .env and add ORS_API_KEY

# Process data files (if needed)
npm run data:all

# Authenticate with Vercel (first time only)
vercel login
```

### Daily Development

**Full-stack development** (recommended):
```bash
vercel dev
# Visit http://localhost:3001
# Frontend + API endpoints + HMR
```

**Frontend-only** (faster, no API):
```bash
npm run dev
# Visit http://localhost:5173
# API calls will fail
```

### Testing

**Manual testing:**
```bash
vercel dev
# Test in browser
```

**Build and preview:**
```bash
npm run build
npm run preview
# Visit http://localhost:4173
# Tests production build with service worker
```

**Type checking:**
```bash
npx tsc --noEmit
```

**Linting:**
```bash
npm run lint
```

### Deployment

**Vercel (automatic):**
```bash
git push origin main
# Vercel auto-deploys
```

**Manual deploy:**
```bash
vercel --prod
```

**Environment variables:**
- Set `ORS_API_KEY` in Vercel dashboard
- Project Settings → Environment Variables

---

## Architecture Deep Dives

### Search Flow (Step-by-Step)

1. **User Input**
   - Types address OR clicks "Use Location"
   - Form submission or geolocation API call

2. **Geocoding**
   - POST to `/api/geocode`
   - Returns: `{ lat, lng, state, displayName }`
   - State extracted from address components or postcode

3. **Data Loading**
   - Load `public/data/{state}/schools.json`
   - Load `public/data/{state}/stations.json`
   - Parallel fetch (~100-300ms)
   - Cached in memory for session

4. **Supermarkets Fetch**
   - POST to `/api/supermarkets`
   - Overpass API query (2km radius)
   - Returns ~40 results, sorted by distance
   - Takes ~1-3 seconds

5. **Client-side Filtering**
   - Haversine distance calculation for all schools/stations
   - Filter: distance <= 2.5km
   - Apply sector filters (Government/Catholic/Independent)
   - Sort by distance
   - Take top 10 per category
   - ~10ms for 10k records

6. **Display Results**
   - Render POI cards with estimated times (gray badges)
   - Show markers on map
   - Display immediately (0-100ms from data load)

7. **Background Route Fetching**
   - For each selected POI (3 total):
     - POST to `/api/walking-routes`
     - Wait 1 second (rate limiting)
     - Update card: gray badge → blue badge with checkmark
     - Draw polyline on map
   - Total: ~3-4 seconds for all routes

8. **User Interaction**
   - Click alternative POI
   - Check route cache
   - If not cached, fetch route
   - Update selected marker and polyline
   - Update card display

### Marker Icon System

**Implementation**: Leaflet DivIcon with inline SVG

**Marker Types:**
1. **User Location** - Red dot with white border
2. **Selected POI** - Pin with icon and colored background
3. **Alternative POI** - Hollow dot with colored border

**Color Mapping:**
```typescript
function getCategoryColor(category, sector?) {
  if (category === 'school') {
    return {
      Government: '#2563eb',    // blue-600
      Catholic: '#dc2626',      // red-600
      Independent: '#7c3aed',   // violet-600
    }[sector];
  }
  if (category === 'station') return '#0891b2';   // cyan-600
  if (category === 'supermarket') return '#059669'; // emerald-600
  return '#ef4444'; // red-500 for user
}
```

**Icon Generation:**
```typescript
function createMarkerIcon(type, selected, sector?) {
  if (type === 'user') {
    return L.divIcon({
      html: `<div class="marker-user"></div>`,
      className: 'custom-marker',
      iconSize: [16, 16],
    });
  }
  
  if (selected) {
    return L.divIcon({
      html: `<div class="marker-pin">${iconSvg}</div>`,
      className: 'custom-marker',
      iconSize: [32, 40],
    });
  }
  
  return L.divIcon({
    html: `<div class="marker-dot"></div>`,
    className: 'custom-marker',
    iconSize: [12, 12],
  });
}
```

### Polyline Decoding

**Format**: Google's encoded polyline (precision 5)
**Algorithm**: Variable-length encoding with delta compression

```typescript
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    // Decode latitude delta
    const latDelta = decodeValue(encoded, index);
    index = latDelta.index;
    lat += latDelta.value;
    
    // Decode longitude delta
    const lngDelta = decodeValue(encoded, index);
    index = lngDelta.index;
    lng += lngDelta.value;
    
    points.push([lat / 1e5, lng / 1e5]);
  }
  
  return points;
}
```

**Usage:**
```typescript
<Polyline
  positions={decodePolyline(route.encodedPolyline)}
  color={getPolylineColor(category, sector)}
  weight={4}
  opacity={0.7}
/>
```

---

## TypeScript Types Reference

**Key types from `src/types/index.ts`:**

```typescript
// Australian states
type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

// School sectors
type SchoolSector = 'Government' | 'Catholic' | 'Independent';

// POI categories
type POICategory = 'school' | 'station' | 'supermarket';

// POI interface
interface POI {
  id: string;
  name: string;
  category: POICategory;
  latitude: number;
  longitude: number;
  distance: number;           // Haversine km
  estimatedWalkingTime: number; // Minutes
  details?: string;
  sector?: SchoolSector;      // For schools only
}

// Search results
interface SearchResponse {
  location: {
    address: string;
    latitude: number;
    longitude: number;
    state: AustralianState;
  };
  schools: POI[];
  stations: POI[];
  supermarkets: POI[];
}

// Walking route
interface WalkingRoute {
  durationMinutes: number;    // Accurate from API
  distanceMeters: number;
  encodedPolyline: string;    // For map rendering
}

// Route request
interface RouteRequest {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  category: POICategory;
  itemId: string;
}
```

---

## Performance Characteristics

### Bundle Sizes
- HTML: 0.65 kB
- CSS: 16.38 kB (gzip: 4.05 kB)
- JS: 364.91 kB (gzip: 111.41 kB)
- **Total gzipped**: ~115 kB

### API Response Times
- Geocode: ~200-500ms (Nominatim)
- Supermarkets: ~1-3 seconds (Overpass)
- Walking routes: ~500ms each (OpenRouteService)

### Data Loading
- State data: ~100-300ms per state (first load)
- Haversine filtering: ~10ms for 10k records
- Route decoding: <1ms per route

### Memory Usage
- NSW data: ~5MB in memory (largest state)
- Route cache: ~1KB per route
- Total typical session: <10MB

---

## Troubleshooting

### "Cannot find module" in API functions

**Cause**: Missing `.js` extension in ESM imports

**Fix**: Add `.js` to all relative imports in `api/` and `src/lib/`:
```typescript
import { haversineDistance } from './haversine.js';
```

### Service Worker not updating

**Cause**: Browser aggressively caches service worker

**Fix:**
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
2. DevTools → Application → Service Workers → Unregister
3. Clear site data

### Build errors with Tailwind classes

**Cause**: JIT compiler can't generate dynamic classes

**Fix:** Use explicit class names or add to safelist:
```javascript
// tailwind.config.ts
safelist: [
  'bg-blue-600',
  'bg-red-600',
  'bg-violet-600',
]
```

### Map tiles not loading

**Cause**: CORS or missing Leaflet CSS

**Fix:**
1. Check `index.css` has: `@import 'leaflet/dist/leaflet.css';`
2. Verify network tab shows tile requests
3. Check Carto CDN status

### Walking routes failing with 429

**Cause**: OpenRouteService rate limit exceeded

**Fix:** Increase delay between requests:
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
```

### Data files not found (404)

**Cause**: Data not processed or wrong path

**Fix:**
```bash
npm run data:all
# Verify files exist:
ls -la public/data/nsw/
```

---

## Best Practices

### Component Design
- ✅ Small, focused components with single responsibility
- ✅ Props for data, callbacks for actions
- ✅ No business logic in presentational components
- ✅ Use custom hooks for complex state logic

### Error Handling
- ✅ Console for developers (`console.error`)
- ✅ User-friendly UI messages for users
- ✅ Graceful degradation (fallbacks)
- ✅ Try-catch in async functions

### Accessibility
- ✅ Semantic HTML (`<button>`, `<nav>`, etc.)
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus management (visible focus rings)
- ✅ Color contrast (WCAG AA)
- ✅ Touch targets >= 44px on mobile

### Performance
- ✅ Lazy loading (code splitting for map)
- ✅ Progressive enhancement
- ✅ Caching strategies
- ✅ React Compiler handles memoization
- ✅ Efficient data structures (Map for caching)

### Mobile-First
- ✅ Design for mobile first
- ✅ Touch-friendly UI (48px buttons)
- ✅ Responsive images
- ✅ Test on real devices
- ✅ Lighthouse mobile score

---

## Useful Commands Quick Reference

```bash
# Development
vercel dev              # Full-stack dev (recommended)
npm run dev             # Frontend only (faster)
npm run build           # Production build
npm run preview         # Preview production build

# Data Processing
npm run data:all        # Process all data
npm run data:schools    # Schools only
npm run data:stations   # Stations only

# Testing
npm run lint            # ESLint
npx tsc --noEmit        # Type checking

# Deployment
vercel --prod           # Manual deploy
git push origin main    # Auto-deploy (Vercel)

# Environment
vercel login            # First-time auth
vercel env pull         # Pull env vars
```

---

## Getting Help

### Documentation
- `README.md` - Project overview and setup
- `DATA_SOURCES.md` - Data sources and processing
- `docs/ARCHITECTURE.md` - Technical architecture details
- `docs/DECISIONS.md` - Decision rationale and context
- `docs/QUICK_REFERENCE.md` - Commands, types, patterns

### External Resources
- [React 19 Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Leaflet Docs](https://leafletjs.com/)
- [Vercel Docs](https://vercel.com/docs)
- [OpenRouteService API](https://openrouteservice.org/dev/#/api-docs)

### Common Issues
- Module resolution → Check `.js` extensions
- Service Worker → Hard refresh or unregister
- Tailwind classes → Use explicit class names
- Rate limits → Add delays between requests
- Build errors → Check TypeScript and ESLint

---

## Project Status

**Current Version**: 1.0.0
**Status**: Production-ready
**All 7 Phases Complete**:
1. ✅ Foundation & core setup
2. ✅ Backend APIs (geocoding, supermarkets, walking routes)
3. ✅ Core hooks & data loading
4. ✅ Map components (Leaflet)
5. ✅ Sidebar components (modern UI)
6. ✅ Service worker & PWA functionality
7. ✅ Style refinements (property platform inspired)

**Deployment**: Live on Vercel
**Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Mobile Support**: iOS Safari, Chrome Android
**Offline Support**: Yes (after first load)
**Installable**: Yes (PWA)

---

**Last Updated**: December 2024
