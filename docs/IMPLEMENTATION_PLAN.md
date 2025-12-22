# Implementation Plan

This document provides a detailed, phase-by-phase implementation plan for the Map Search application.

## Overview

**Total Estimated Files**: ~35-40 files
**Total Estimated LOC**: ~2,000-2,500 lines
**Estimated Time**: 12-16 hours for complete implementation

## Implementation Phases

### ✅ Phase 1: Foundation (COMPLETED)

**Status**: Complete
**Files Created**: 12
**Time**: ~2 hours

#### Completed Tasks:
- [x] Created directory structure
- [x] Copied source data files from ../map-search
- [x] Installed dependencies (Tailwind, Leaflet, react-leaflet, lucide-react)
- [x] Configured Tailwind CSS with custom colors
- [x] Created comprehensive TypeScript type definitions
- [x] Created Vercel configuration (vercel.json)
- [x] Created PWA manifest with share target support
- [x] Created placeholder icon (icon.svg)
- [x] Created .env.example
- [x] Updated index.html with manifest link
- [x] Created README.md and DATA_SOURCES.md
- [x] Updated .gitignore
- [x] Created data processing scripts (process-schools, process-stations, process-all)
- [x] Processed data files (10,994 schools + 1,709 stations → 8 state files each)

#### Files Created:
```
scripts/
  ├── process-schools.ts
  ├── process-stations.ts
  └── process-all.ts
src/
  └── types/
      └── index.ts
public/
  ├── manifest.json
  ├── icon.svg
  └── data/
      ├── nsw/schools.json + stations.json
      ├── vic/schools.json + stations.json
      ├── qld/schools.json + stations.json
      ├── wa/schools.json + stations.json
      ├── sa/schools.json + stations.json
      ├── tas/schools.json + stations.json
      ├── act/schools.json + stations.json
      └── nt/schools.json + stations.json
tailwind.config.ts
postcss.config.js
vercel.json
.env.example
README.md
DATA_SOURCES.md
```

---

### 🚧 Phase 2: Backend API Endpoints (IN PROGRESS)

**Estimated Time**: 2-3 hours
**Files to Create**: 6

#### Tasks:

##### 2.1: Copy Shared Utilities from map-search
- [ ] Copy `lib/haversine.ts` (unchanged)
- [ ] Copy `lib/overpass.ts` (adapt for serverless)
- [ ] Copy `lib/openroute.ts` (adapt for serverless)

**Changes needed**:
- Use environment variables for API keys
- Add proper TypeScript types
- Export functions for use in API endpoints

##### 2.2: Create API Endpoint - Geocode
- [ ] Create `api/geocode.ts`

**Functionality**:
```typescript
// POST /api/geocode
// Input: { address: string }
// Output: { lat, lng, state, displayName } | { error }

// Processing:
// 1. Validate input
// 2. Call Nominatim API with proper headers
// 3. Parse address components to extract state
// 4. Rate limit: 1 req/sec (use simple timestamp check)
// 5. Map state abbreviations (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
// 6. Return coordinates + state
```

**State Extraction Logic**:
```typescript
function extractState(addressComponents: any): AustralianState {
  // Priority order:
  // 1. address.state (if present)
  // 2. Parse from display_name
  // 3. Check address.postcode ranges
  // 4. Default to NSW if ambiguous
}
```

##### 2.3: Create API Endpoint - Supermarkets
- [ ] Create `api/supermarkets.ts`

**Functionality**:
```typescript
// POST /api/supermarkets
// Input: { lat, lng, radius: 2000 }
// Output: { supermarkets: POI[] } | { error }

// Processing:
// 1. Validate input
// 2. Query Overpass API with timeout/maxsize
// 3. Parse nodes + ways
// 4. Smart name formatting (suburb/street/postcode)
// 5. Calculate Haversine distances
// 6. Sort by distance
// 7. Return top 10
```

##### 2.4: Create API Endpoint - Walking Routes
- [ ] Create `api/walking-routes.ts`

**Functionality**:
```typescript
// POST /api/walking-routes
// Input: { routes: RouteRequest[] }
// Output: { routes: (WalkingRoute | null)[] } | { error }

// Processing:
// 1. Validate input (max 10 routes per request)
// 2. For each route:
//    - Call OpenRouteService API
//    - Handle 429 errors gracefully (return null)
//    - Wait 500ms between requests
//    - Parse response (duration, distance, polyline)
// 3. Return array of routes (null for failures)
```

##### 2.5: Environment Setup
- [ ] Remind user to copy ORS_API_KEY from .env in map-search

#### Files to Create:
```
api/
  ├── geocode.ts
  ├── supermarkets.ts
  └── walking-routes.ts
src/
  └── lib/
      ├── haversine.ts
      ├── overpass.ts
      └── openroute.ts
```

#### Testing Checkpoint:
- Test each endpoint with curl or Postman
- Verify geocoding returns correct state
- Verify supermarkets query works
- Verify walking routes return valid polylines

---

### 📋 Phase 3: Core Hooks & Data Loading

**Estimated Time**: 3-4 hours
**Files to Create**: 8

#### Tasks:

##### 3.1: API Client Wrapper
- [ ] Create `src/lib/api-client.ts`

**Exports**:
```typescript
export async function geocodeAddress(address: string): Promise<GeocodeResponse>
export async function fetchSupermarkets(lat: number, lng: number): Promise<SupermarketsResponse>
export async function fetchWalkingRoutes(routes: RouteRequest[]): Promise<WalkingRoutesResponse>
```

##### 3.2: Data Loader Hook
- [ ] Create `src/hooks/useDataLoader.ts`

**Functionality**:
```typescript
export function useDataLoader() {
  // State
  const [loadedStates, setLoadedStates] = useState<Set<AustralianState>>(new Set());
  const [schoolsData, setSchoolsData] = useState<Map<AustralianState, School[]>>(new Map());
  const [stationsData, setStationsData] = useState<Map<AustralianState, Station[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Methods
  async function loadState(state: AustralianState): Promise<void>
  async function loadMultipleStates(states: AustralianState[]): Promise<void>
  function getSchools(state: AustralianState): School[]
  function getStations(state: AustralianState): Station[]
  function clearCache(): void

  return { loadState, loadMultipleStates, getSchools, getStations, loading, error, clearCache };
}
```

##### 3.3: Service Worker Hook
- [ ] Create `src/hooks/useServiceWorker.ts`

**Functionality**:
```typescript
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker
    // Listen for updates
  }, []);

  async function clearCache(): Promise<void>
  async function getCacheSize(): Promise<number>
  async function update(): Promise<void>

  return { registration, updateAvailable, clearCache, getCacheSize, update };
}
```

##### 3.4: Online Status Hook
- [ ] Create `src/hooks/useOnlineStatus.ts`

**Functionality**:
```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

##### 3.5: Walking Routes Hook
- [ ] Create `src/hooks/useWalkingRoutes.ts`

**Functionality**:
```typescript
export function useWalkingRoutes() {
  const [routeCache, setRouteCache] = useState<Map<string, WalkingRoute>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());

  async function fetchRoute(from: Location, to: POI, category: POICategory): Promise<WalkingRoute>
  async function fetchRoutesSequentially(requests: RouteRequest[]): Promise<void>
  function getCachedRoute(from: Location, to: POI): WalkingRoute | undefined
  function clearCache(): void

  return { routeCache, loading, fetchRoute, fetchRoutesSequentially, getCachedRoute, clearCache };
}
```

##### 3.6: Geolocation Hook
- [ ] Create `src/hooks/useGeolocation.ts`

**Functionality**:
```typescript
export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getCurrentLocation(): Promise<GeolocationCoordinates>

  return { location, error, loading, getCurrentLocation };
}
```

##### 3.7: Sector Preferences Hook
- [ ] Create `src/hooks/useSectorPreferences.ts`

**Functionality**:
```typescript
export function useSectorPreferences() {
  const [sectors, setSectors] = useState<Set<SchoolSector>>(() => {
    const stored = localStorage.getItem('schoolSectors');
    return stored 
      ? new Set(JSON.parse(stored))
      : new Set(['Government', 'Catholic', 'Independent']);
  });

  useEffect(() => {
    localStorage.setItem('schoolSectors', JSON.stringify([...sectors]));
  }, [sectors]);

  function toggleSector(sector: SchoolSector): void

  return { sectors, toggleSector };
}
```

##### 3.8: Utility Functions
- [ ] Create `src/utils/format.ts`

**Exports**:
```typescript
export function formatDistance(km: number): string // "0.8 km" or "800 m"
export function formatDuration(minutes: number): string // "12 min"
export function formatAddress(displayName: string): string // Shorten long addresses
export function getCacheKey(from: Location, to: POI): string
```

##### 3.9: Basic App Structure
- [ ] Update `src/App.tsx` with basic structure

**Structure**:
```typescript
function App() {
  // Hooks
  const { loadState, getSchools, getStations } = useDataLoader();
  const { routeCache, fetchRoutesSequentially } = useWalkingRoutes();
  const { getCurrentLocation } = useGeolocation();
  const isOnline = useOnlineStatus();

  // State
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<SelectedPOIs>({
    school: 0, station: 0, supermarket: 0
  });

  // Handlers
  async function handleSearch(address: string): Promise<void>
  async function handleSelectPOI(category: POICategory, index: number): Promise<void>

  return (
    <div className="h-full w-full flex flex-col md:flex-row">
      {/* Sidebar - placeholder for now */}
      {/* Map - placeholder for now */}
    </div>
  );
}
```

#### Files to Create:
```
src/
  ├── lib/
  │   └── api-client.ts
  ├── hooks/
  │   ├── useDataLoader.ts
  │   ├── useServiceWorker.ts
  │   ├── useOnlineStatus.ts
  │   ├── useWalkingRoutes.ts
  │   ├── useGeolocation.ts
  │   └── useSectorPreferences.ts
  ├── utils/
  │   └── format.ts
  └── App.tsx (major update)
```

#### Testing Checkpoint:
- Trigger a search programmatically (console)
- Verify state data loads
- Check that Haversine filtering works
- Verify hooks maintain state correctly

---

### 🗺️ Phase 4: Map Components

**Estimated Time**: 2-3 hours
**Files to Create**: 6

#### Tasks:

##### 4.1: Map Container
- [ ] Create `src/components/Map/Map.tsx`

**Functionality**:
```typescript
interface MapProps {
  center: [number, number];
  zoom: number;
  children?: React.ReactNode;
}

export function Map({ center, zoom, children }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      {children}
    </MapContainer>
  );
}
```

##### 4.2: Map Markers
- [ ] Create `src/components/Map/MapMarker.tsx`

**Functionality**:
```typescript
interface MapMarkerProps {
  position: [number, number];
  type: 'user' | 'school' | 'station' | 'supermarket';
  selected?: boolean;
  sector?: SchoolSector; // For schools
  onClick?: () => void;
}

export function MapMarker({ position, type, selected, sector, onClick }: MapMarkerProps) {
  const icon = createMarkerIcon(type, selected, sector);
  
  return (
    <Marker position={position} icon={icon} eventHandlers={{ click: onClick }} />
  );
}
```

##### 4.3: Polyline Component
- [ ] Create `src/components/Map/MapPolyline.tsx`

**Functionality**:
```typescript
interface MapPolylineProps {
  encodedPolyline: string;
  color: string;
}

export function MapPolyline({ encodedPolyline, color }: MapPolylineProps) {
  const positions = decodePolyline(encodedPolyline);
  
  return (
    <Polyline
      positions={positions}
      color={color}
      weight={4}
      opacity={0.7}
    />
  );
}
```

##### 4.4: Map Utilities
- [ ] Create `src/utils/map-helpers.ts`

**Exports**:
```typescript
export function createMarkerIcon(
  type: POICategory | 'user',
  selected: boolean,
  sector?: SchoolSector
): L.DivIcon

export function getMarkerColor(type: POICategory | 'user', sector?: SchoolSector): string

export function getPolylineColor(category: POICategory, sector?: SchoolSector): string
```

##### 4.5: Polyline Decoder
- [ ] Create `src/utils/polyline.ts`

**Functionality**:
```typescript
export function decodePolyline(encoded: string, precision: number = 5): [number, number][] {
  // Decode Google's polyline format
  // Return array of [lat, lng] tuples
}
```

##### 4.6: Integrate Map into App
- [ ] Update `src/App.tsx` to render Map with markers and polylines

#### Files to Create:
```
src/
  ├── components/
  │   └── Map/
  │       ├── Map.tsx
  │       ├── MapMarker.tsx
  │       └── MapPolyline.tsx
  └── utils/
      ├── map-helpers.ts
      └── polyline.ts
```

#### Testing Checkpoint:
- Map renders with Carto tiles
- User marker appears at search location
- POI markers appear (different colors/styles)
- Clicking alternative updates selected marker
- Polylines draw when routes load

---

### 📱 Phase 5: Sidebar Components

**Estimated Time**: 4-5 hours
**Files to Create**: 12

#### Tasks:

##### 5.1: UI Components (Reusable)
- [ ] Create `src/components/UI/Button.tsx`
- [ ] Create `src/components/UI/Badge.tsx`
- [ ] Create `src/components/UI/LoadingSpinner.tsx`

##### 5.2: Search Bar
- [ ] Create `src/components/Sidebar/SearchBar.tsx`

**Features**:
- Text input with search icon
- "Use my location" button
- Enter key support
- Loading state
- Error display

##### 5.3: Sector Checkboxes
- [ ] Create `src/components/Sidebar/SectorCheckboxes.tsx`

**Features**:
- Three checkboxes (Government, Catholic, Independent)
- Persists to localStorage via useSectorPreferences hook
- Inline in schools POI card

##### 5.4: POI Card
- [ ] Create `src/components/Sidebar/POICard.tsx`

**Features**:
- Icon with category color
- POI name and details
- Time badge (estimate vs actual, with loading state)
- Distance badge
- Sector checkboxes (schools only)
- Alternatives toggle button

##### 5.5: POI Alternatives
- [ ] Create `src/components/Sidebar/POIAlternatives.tsx`

**Features**:
- Collapsible list
- "View X more options" button
- Click to select
- Hover effects
- Auto-collapse on selection

##### 5.6: Offline Banner
- [ ] Create `src/components/Sidebar/OfflineBanner.tsx`

**Features**:
- Shows when offline
- "Search from recent locations or use current location"
- Dismissible (optional)

##### 5.7: Settings Panel
- [ ] Create `src/components/Settings/SettingsPanel.tsx`

**Features**:
- Cache size display
- Clear cache button
- Manual data update button (future)
- About/version info

##### 5.8: Main Sidebar
- [ ] Create `src/components/Sidebar/Sidebar.tsx`

**Features**:
- Mobile: Slide-in overlay with toggle button
- Desktop: Fixed left panel
- Responsive breakpoints
- Three POI card sections
- Scrollable content

##### 5.9: Complete App Integration
- [ ] Update `src/App.tsx` with complete sidebar integration

#### Files to Create:
```
src/
  ├── components/
  │   ├── UI/
  │   │   ├── Button.tsx
  │   │   ├── Badge.tsx
  │   │   └── LoadingSpinner.tsx
  │   ├── Sidebar/
  │   │   ├── Sidebar.tsx
  │   │   ├── SearchBar.tsx
  │   │   ├── POICard.tsx
  │   │   ├── POIAlternatives.tsx
  │   │   ├── SectorCheckboxes.tsx
  │   │   └── OfflineBanner.tsx
  │   └── Settings/
  │       └── SettingsPanel.tsx
  └── App.tsx (complete)
```

#### Testing Checkpoint:
- Full search workflow works
- POI cards display correctly
- Alternatives toggle and select
- Sector filtering updates results
- Mobile layout works (sidebar slide)
- Desktop layout works (side-by-side)

---

### 🔧 Phase 6: Service Worker & PWA

**Estimated Time**: 2-3 hours
**Files to Create**: 2-3

#### Tasks:

##### 6.1: Service Worker Implementation
- [ ] Create `public/service-worker.js`

**Features**:
- Install phase: Cache static assets
- Fetch phase: Route requests by type
  - Static assets: Stale-while-revalidate
  - Data files: Cache-first
  - API calls: Network-first with smart caching
- Activate phase: Clean up old caches
- Request deduplication
- TTL checking for API responses
- Cache metadata storage

##### 6.2: Service Worker Registration
- [ ] Update `src/hooks/useServiceWorker.ts` (enhance existing)

**Add**:
- Registration logic in useEffect
- Update detection
- Cache management functions

##### 6.3: Service Worker in Build
- [ ] Update `vite.config.ts` to copy service-worker.js to dist

##### 6.4: Install Prompt (Optional)
- [ ] Create `src/components/PWA/InstallPrompt.tsx`

**Features**:
- Detect if installable
- Show prompt (dismissible)
- Handle install click

#### Files to Create:
```
public/
  └── service-worker.js
src/
  ├── hooks/
  │   └── useServiceWorker.ts (enhance)
  └── components/
      └── PWA/
          └── InstallPrompt.tsx (optional)
vite.config.ts (update)
```

#### Testing Checkpoint:
- Service worker registers successfully
- Static assets cached
- Data files cached on first load
- API responses cached with TTL
- Offline mode works
- App installable (PWA)

---

### ✨ Phase 7: Polish & Final Touches

**Estimated Time**: 2-3 hours

#### Tasks:

##### 7.1: Styling Refinements
- [ ] Review all components for consistent spacing
- [ ] Mobile touch targets (min 44px)
- [ ] Hover/focus states
- [ ] Smooth transitions
- [ ] Loading skeleton screens (optional)

##### 7.2: Error Handling
- [ ] Add error boundaries (React.ErrorBoundary)
- [ ] Toast notifications for errors (optional library)
- [ ] Inline error messages
- [ ] Console.error for debugging
- [ ] Graceful API failure handling

##### 7.3: Loading States
- [ ] Skeleton loaders for POI cards
- [ ] Map loading overlay
- [ ] Button loading states (spinner + disabled)
- [ ] Search input loading indicator

##### 7.4: Accessibility
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] ARIA labels on interactive elements
- [ ] Focus management (trap in modal, restore on close)
- [ ] Screen reader announcements
- [ ] Color contrast check (WCAG AA)

##### 7.5: Performance
- [ ] React.lazy for Map components (code splitting)
- [ ] useMemo for expensive calculations (if React Compiler doesn't handle)
- [ ] Debounce search input (optional)
- [ ] Virtual scrolling for long alternative lists (optional)

##### 7.6: Testing
- [ ] Manual testing on mobile device
- [ ] Test offline mode thoroughly
- [ ] Test share target (share address from another app)
- [ ] Test all sector combinations
- [ ] Test edge cases (no results, API failures, etc.)

##### 7.7: Documentation
- [ ] Update README with any changes
- [ ] Add CHANGELOG.md (optional)
- [ ] Add screenshots to README (optional)
- [ ] Document known issues/limitations

#### Testing Checkpoint:
- App works smoothly on mobile and desktop
- No console errors
- Offline mode functional
- PWA installable
- Share target works (logs address correctly)
- All features accessible via keyboard
- Loading states clear and helpful

---

## File Count Summary

### Phase 1 (Complete): 12 files
- 3 scripts
- 1 type definition file
- 16 data files (8 states × 2 types)
- 4 config files
- 2 documentation files
- 2 other files

### Phase 2: 6 files
- 3 API endpoints
- 3 shared libraries

### Phase 3: 8 files
- 6 hooks
- 1 API client
- 1 utility file

### Phase 4: 6 files
- 3 map components
- 2 utility files
- 1 updated App.tsx

### Phase 5: 12 files
- 9 UI/Sidebar components
- 1 settings component
- 1 offline banner
- 1 complete App.tsx

### Phase 6: 2-3 files
- 1 service worker
- 1 enhanced hook
- 1 optional install prompt

### Phase 7: 0 new files
- Polish existing files

**Total**: ~38-40 files

---

## Key Implementation Notes

### State Management Strategy

**No Redux/Zustand needed**. Use React state + custom hooks:

```typescript
// App.tsx state
const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
const [selectedPOIs, setSelectedPOIs] = useState<SelectedPOIs>({ school: 0, station: 0, supermarket: 0 });
const [mapCenter, setMapCenter] = useState<[number, number]>([-33.8688, 151.2093]); // Sydney
const [mapZoom, setMapZoom] = useState(13);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

// Custom hooks manage their own state
const { loadState, getSchools, getStations } = useDataLoader(); // Internal state
const { routeCache, fetchRoutesSequentially } = useWalkingRoutes(); // Internal state
const { sectors, toggleSector } = useSectorPreferences(); // localStorage + state
```

### Component Composition

**Keep components small and focused**:
- Single responsibility
- Props for data, callbacks for actions
- No business logic in presentational components
- Hooks for complex logic

### Performance Considerations

**React Compiler handles most optimizations**, but still:
- Lazy load Map components (heavy dependencies)
- Memoize expensive Haversine calculations if needed
- Virtual scrolling only if >50 alternatives (unlikely)

### Mobile-First Approach

**Design for mobile first, enhance for desktop**:
```css
/* Mobile (default) */
.sidebar { width: 100%; position: absolute; }

/* Desktop (768px+) */
@media (min-width: 768px) {
  .sidebar { width: 384px; position: relative; }
}
```

### Error Handling Philosophy

**Console for developers, UI for users**:
```typescript
try {
  const result = await apiCall();
} catch (error) {
  console.error('Detailed error for debugging:', error);
  setError('User-friendly message: Could not load data. Please try again.');
}
```

---

## Next Steps After Implementation

1. **Deploy to Vercel**
   - Connect GitHub repo
   - Add ORS_API_KEY environment variable
   - Deploy!

2. **Test in Production**
   - Test PWA installation
   - Test share target from real estate apps
   - Monitor performance (Core Web Vitals)

3. **Gather Feedback**
   - Share with users
   - Monitor error logs
   - Track usage patterns

4. **Iterate**
   - Fix bugs
   - Add requested features
   - Optimize performance bottlenecks

---

## Current Status

**Phase**: 2 (Backend API Endpoints)
**Next Task**: Copy shared utilities from map-search and create API endpoints

**Remember**: Copy ORS_API_KEY from ../map-search/.env to .env before testing API endpoints!
