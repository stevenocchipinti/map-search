# URL State Implementation Plan

## Overview

Transform the app to use URL parameters as the single source of truth for search state, enabling shareable/bookmarkable searches and proper browser navigation support.

## URL Parameter Strategy

Use a **dual-state approach** with query (`q`) and coordinates (`lat`, `lng`):

- `?q=Sydney+NSW` - Query only (requires geocoding)
- `?lat=-33.87&lng=151.21` - Coords only (search field blank)
- `?q=Sydney+NSW&lat=-33.87&lng=151.21` - Both (optimal, no geocoding needed)

## Three URL Cases

### Case 1: Both Query and Coordinates Present
```
/?q=123+Main+St&lat=-33.8688&lng=151.2093
```

**Behavior:**
- ✅ Use coords directly for POI lookup (skip geocoding)
- ✅ Populate search field with `q` value
- ✅ Validate coords are valid (see validation section)
- ✅ Determine state from coords (fast, no API)
- ✅ Perform search immediately

**Why this is optimal:** No API calls needed, fastest experience.

### Case 2: Coordinates Only
```
/?lat=-33.8688&lng=151.2093
```

**Behavior:**
- ✅ Use coords for POI lookup
- ✅ Leave search field **blank** (no reverse geocoding to minimize API calls)
- ✅ Validate coords are valid
- ✅ Determine state from coords
- ✅ Perform search immediately

**When this happens:** User clicks "Use My Location"

### Case 3: Query Only
```
/?q=123+Main+St
```

**Behavior:**
- ✅ Populate search field with `q` value
- ✅ Geocode the address (API call required)
- ✅ On success: Update URL with coords using `replaceState`
- ✅ Result: `?q=123+Main+St&lat=-33.87&lng=151.21`
- ✅ Perform search with geocoded coordinates

**When this happens:** User enters address manually, or share target from another app

---

## User Flow Behaviors

### Manual Search from Search Field

**Current state:** Any (or none)

**Action:** User types address and submits form

**Process:**
1. Clear any existing coords from URL
2. Update URL to `?q={address}` using `pushState` (new history entry)
3. Update search input state
4. Start geocoding with AbortController
5. On geocode success:
   - Extract coords and state
   - Update URL to `?q={address}&lat={lat}&lng={lng}` using `replaceState` (enrich same entry)
   - Perform search with coords
6. On geocode failure:
   - Show error message
   - Leave URL as `?q={address}` (without coords)
   - Do not perform search

**Result URL:** `?q={address}&lat={lat}&lng={lng}` (if successful)

### "Use My Location" Button

**Current state:** Any (or none)

**Action:** User clicks "Use My Location"

**Process:**
1. Clear any existing `q` param from URL
2. Request browser geolocation
3. On success:
   - Update URL to `?lat={lat}&lng={lng}` using `pushState` (new history entry)
   - Clear search input state (empty string)
   - Determine state from coords
   - Perform search with coords
4. On failure:
   - Show error message
   - Don't update URL

**Result URL:** `?lat={lat}&lng={lng}`

### Initial Page Load / Share Target

**URL:** `?q=123+Main+St` (from share target or direct link)

**Process:**
1. Read `q` from URL
2. Validate and sanitize `q` (see validation section)
3. If valid:
   - Populate search input
   - Dismiss landing overlay
   - Trigger geocoding → Enrich URL with coords → Search
4. If invalid:
   - Clear URL, show landing overlay

**Result URL:** `?q=123+Main+St&lat={lat}&lng={lng}`

### Browser Back/Forward Navigation

**Process:**
1. Listen to `popstate` event
2. Read URL params (`q`, `lat`, `lng`)
3. Route to appropriate case:
   - No params → Show landing overlay, clear search
   - Case 1 (both) → Populate input, search with coords
   - Case 2 (coords only) → Blank input, search with coords
   - Case 3 (query only) → Populate input, geocode, search
4. Cancel any in-flight requests via AbortController

---

## Validation & Sanitization

### Query Parameter (`q`) Validation

```typescript
function validateAndSanitizeQuery(raw: string | null): string | null {
  if (!raw) return null;
  
  // Trim whitespace
  let cleaned = raw.trim();
  
  // Validate length (prevent DoS)
  if (cleaned.length === 0) return null;
  if (cleaned.length > 200) {
    console.warn('Query too long, truncating');
    cleaned = cleaned.substring(0, 200);
  }
  
  // Strip HTML-like characters (< and >)
  cleaned = cleaned.replace(/[<>]/g, '');
  
  // Minimum length check (at least 3 chars for meaningful search)
  if (cleaned.length < 3) {
    console.warn('Query too short, ignoring');
    return null;
  }
  
  return cleaned;
}
```

### Coordinates Validation

```typescript
function validateCoords(
  latStr: string | null, 
  lngStr: string | null
): { lat: number; lng: number } | null {
  
  if (!latStr || !lngStr) return null;
  
  // Parse as numbers
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  
  // Check if valid numbers
  if (isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid coordinates: not numeric');
    return null;
  }
  
  // Validate within Australia bounds
  // Australia roughly: lat -45 to -10, lng 110 to 155
  if (lat < -45 || lat > -10) {
    console.warn('Latitude out of Australia bounds:', lat);
    return null;
  }
  
  if (lng < 110 || lng > 155) {
    console.warn('Longitude out of Australia bounds:', lng);
    return null;
  }
  
  return { lat, lng };
}
```

### Combined URL Parsing

```typescript
function parseSearchParams(): {
  query: string | null;
  coords: { lat: number; lng: number } | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  const query = validateAndSanitizeQuery(params.get('q'));
  const coords = validateCoords(params.get('lat'), params.get('lng'));
  
  return { query, coords };
}
```

---

## URL Helper Functions

### Reading from URL

```typescript
// Read and parse all search params
const parseSearchParams = (): {
  query: string | null;
  coords: { lat: number; lng: number } | null;
} => {
  const params = new URLSearchParams(window.location.search);
  
  const query = validateAndSanitizeQuery(params.get('q'));
  const coords = validateCoords(params.get('lat'), params.get('lng'));
  
  return { query, coords };
};
```

### Writing to URL

```typescript
// Update URL with query only (coords will be added after geocoding)
const updateURLWithQuery = (query: string, replace = false) => {
  const url = new URL(window.location.href);
  url.search = ''; // Clear all params
  url.searchParams.set('q', query);
  
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
};

// Update URL with coords only (for "Use My Location")
const updateURLWithCoords = (lat: number, lng: number, replace = false) => {
  const url = new URL(window.location.href);
  url.search = ''; // Clear all params
  url.searchParams.set('lat', lat.toFixed(6)); // 6 decimal places (~0.1m precision)
  url.searchParams.set('lng', lng.toFixed(6));
  
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
};

// Update URL with both query and coords (enrichment after geocoding)
const updateURLWithBoth = (query: string, lat: number, lng: number) => {
  const url = new URL(window.location.href);
  url.search = ''; // Clear all params
  url.searchParams.set('q', query);
  url.searchParams.set('lat', lat.toFixed(6));
  url.searchParams.set('lng', lng.toFixed(6));
  
  // Always use replaceState for enrichment (don't create new history entry)
  window.history.replaceState({}, '', url.toString());
};

// Clear all params (back to landing page)
const clearURL = () => {
  window.history.replaceState({}, '', window.location.pathname);
};
```

---

## AbortController for Race Conditions

Prevent race conditions when user triggers multiple searches quickly:

```typescript
// In App.tsx component scope
let searchAbortController: AbortController | null = null;

// Cancel any in-flight search request
const cancelPendingSearch = () => {
  if (searchAbortController) {
    searchAbortController.abort();
    searchAbortController = null;
  }
};

// Start a new search with cancellation support
const handleSearch = async (address: string): Promise<void> => {
  if (!address.trim()) {
    setError('Please enter an address');
    return;
  }

  // Cancel any previous search
  cancelPendingSearch();
  
  // Create new abort controller for this search
  searchAbortController = new AbortController();
  const signal = searchAbortController.signal;

  // Update URL with query only (coords will be added after geocoding)
  updateURLWithQuery(address.trim(), false); // pushState (new history entry)
  
  // Update input state
  setSearchInput(address.trim());

  setLoading(true);
  setError(null);

  try {
    // Step 1: Geocode the address with abort signal
    console.log('Step 1: Geocoding address:', address);
    const geocodeResult = await geocodeAddress(address, { signal });

    // Check if aborted
    if (signal.aborted) return;

    if (geocodeResult.error) {
      throw new Error(geocodeResult.error);
    }

    const { lat, lng, state, displayName } = geocodeResult;
    console.log('Geocoded:', { lat, lng, state });

    // Enrich URL with coordinates (replaceState - same history entry)
    updateURLWithBoth(address.trim(), lat, lng);

    // Immediately show user location on map
    setUserLocation({ lat, lng });
    setMapCenter([lat, lng]);
    setMapZoom(14);
    setMapBounds(null);

    // Use shared search logic
    await handleSearchWithCoordinates(lat, lng, state, displayName);

  } catch (err) {
    // Ignore abort errors (user cancelled)
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('Search cancelled');
      return;
    }
    
    const errorMsg = err instanceof Error ? err.message : 'Search failed';
    console.error('Search error:', err);
    setError(errorMsg);
    setLoading(false);
  } finally {
    searchAbortController = null;
  }
};
```

**Note:** The `geocodeAddress` function in `src/lib/api-client.ts` needs to accept and use the abort signal:

```typescript
export async function geocodeAddress(
  address: string, 
  options?: { signal?: AbortSignal }
): Promise<GeocodeResult> {
  const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
  const response = await fetch(`${baseUrl}/api/geocode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
    signal: options?.signal, // Pass abort signal
  });
  
  // ... rest of function
}
```

---

## State Management

### Add Search Input State

In `App.tsx`, add state for search input (controlled by URL):

```typescript
const [searchInput, setSearchInput] = useState<string>('');
```

This state is:
- Updated from URL on mount/navigation
- Updated by user typing
- Synced to URL on search submission

---

## Component Updates

### Phase 1: App.tsx Core Logic

#### 1.1 Add URL Helper Functions

Add the helper functions defined in "URL Helper Functions" section above.

#### 1.2 Add Search Input State

```typescript
const [searchInput, setSearchInput] = useState<string>('');
```

#### 1.3 Add AbortController Logic

Add the abort controller and cancellation logic as defined in "AbortController for Race Conditions" section.

#### 1.4 Initial URL Detection (Mount)

Replace the existing share target `useEffect` (~lines 131-158) with:

```typescript
// Initial URL detection (page load, share target, direct links)
useEffect(() => {
  const { query, coords } = parseSearchParams();
  
  if (coords && query) {
    // Case 1: Both present - optimal path
    console.group('🔗 URL Case 1: Query + Coords');
    console.log('Query:', query);
    console.log('Coords:', coords);
    console.groupEnd();
    
    // Populate search input
    setSearchInput(query);
    
    // Dismiss landing, show results immediately
    withViewTransition(() => {
      setShowLanding(false);
      setHasSearched(true);
    });
    
    // Use coords directly (no geocoding needed)
    setUserLocation(coords);
    setMapCenter([coords.lat, coords.lng]);
    setMapZoom(14);
    setMapBounds(null);
    
    const state = determineStateFromCoordinates(coords.lat, coords.lng);
    handleSearchWithCoordinates(coords.lat, coords.lng, state, query);
    
  } else if (coords && !query) {
    // Case 2: Coords only - from "Use My Location"
    console.group('🔗 URL Case 2: Coords Only');
    console.log('Coords:', coords);
    console.groupEnd();
    
    // Leave search input blank
    setSearchInput('');
    
    // Dismiss landing
    withViewTransition(() => {
      setShowLanding(false);
      setHasSearched(true);
    });
    
    // Use coords directly
    setUserLocation(coords);
    setMapCenter([coords.lat, coords.lng]);
    setMapZoom(14);
    setMapBounds(null);
    
    const state = determineStateFromCoordinates(coords.lat, coords.lng);
    handleSearchWithCoordinates(coords.lat, coords.lng, state, 'Current Location');
    
  } else if (query && !coords) {
    // Case 3: Query only - needs geocoding
    console.group('🔗 URL Case 3: Query Only');
    console.log('Query:', query);
    console.groupEnd();
    
    // Populate search input
    setSearchInput(query);
    
    // Dismiss landing
    withViewTransition(() => {
      setShowLanding(false);
      setHasSearched(true);
    });
    
    // Trigger search (will geocode and enrich URL with coords)
    handleSearch(query);
  }
  // else: No params, show landing overlay (default state)
}, []); // Only run on mount
```

#### 1.5 Browser Navigation Handler

Add new `useEffect` for back/forward button:

```typescript
// Handle browser back/forward navigation
useEffect(() => {
  const handlePopState = () => {
    // Cancel any pending search
    cancelPendingSearch();
    
    const { query, coords } = parseSearchParams();
    
    if (!query && !coords) {
      // No params - return to landing
      setSearchInput('');
      setSearchResults(null);
      withViewTransition(() => {
        setShowLanding(true);
        setHasSearched(false);
      });
      return;
    }
    
    // Handle the three cases (same logic as initial mount)
    if (coords && query) {
      // Case 1: Both present
      setSearchInput(query);
      setUserLocation(coords);
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(14);
      const state = determineStateFromCoordinates(coords.lat, coords.lng);
      handleSearchWithCoordinates(coords.lat, coords.lng, state, query);
      
    } else if (coords && !query) {
      // Case 2: Coords only
      setSearchInput('');
      setUserLocation(coords);
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(14);
      const state = determineStateFromCoordinates(coords.lat, coords.lng);
      handleSearchWithCoordinates(coords.lat, coords.lng, state, 'Current Location');
      
    } else if (query && !coords) {
      // Case 3: Query only
      setSearchInput(query);
      handleSearch(query);
    }
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []); // Empty deps - handler uses current state via closures
```

#### 1.6 Update handleSearch Function

Modify the existing `handleSearch` function (~line 390) to include abort controller and URL management as shown in the "AbortController for Race Conditions" section.

Key changes:
- Add abort controller logic
- Update URL with query first (pushState)
- After geocoding, enrich URL with coords (replaceState)
- Update search input state

#### 1.7 Update handleUseMyLocation Function

Modify the existing `handleUseMyLocation` function (~line 431):

```typescript
const handleUseMyLocation = async (): Promise<void> => {
  // Cancel any pending search
  cancelPendingSearch();
  
  setLoading(true);
  setError(null);
  
  try {
    const coords = await getCurrentLocation();
    if (coords) {
      // Update URL with coords only (clear any query)
      updateURLWithCoords(coords.latitude, coords.longitude, false); // pushState
      
      // Clear search input
      setSearchInput('');
      
      // Immediately show user location on map
      setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      setMapCenter([coords.latitude, coords.longitude]);
      setMapZoom(14);
      setMapBounds(null);

      // Determine state from coordinates
      const state = determineStateFromCoordinates(coords.latitude, coords.longitude);
      
      // Proceed with search logic
      await handleSearchWithCoordinates(
        coords.latitude, 
        coords.longitude, 
        state, 
        'Current Location'
      );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
    setError(errorMsg);
    setLoading(false);
  }
};
```

### Phase 2: Search Input Components

Convert all search input components from local state to controlled components.

#### 2.1 FloatingSearchBar Component

**File:** `src/components/Drawer/FloatingSearchBar.tsx`

**Changes:**

1. Update props interface:
```typescript
interface FloatingSearchBarProps {
  value: string                          // NEW
  onChange: (value: string) => void      // NEW
  onSearch: (address: string) => void
  onUseLocation: () => void
  onOpenSettings: () => void
  loading?: boolean
  className?: string
}
```

2. Remove local state:
```typescript
// DELETE: const [inputValue, setInputValue] = useState("")
```

3. Update destructuring:
```typescript
export function FloatingSearchBar({
  value,
  onChange,
  onSearch,
  onUseLocation,
  onOpenSettings,
  loading,
  className = "",
}: FloatingSearchBarProps) {
```

4. Update `handleSubmit`:
```typescript
const handleSubmit = (e?: React.FormEvent) => {
  e?.preventDefault()

  if (value.trim()) {
    onSearch(value)
  } else {
    onUseLocation()
  }
}
```

5. Update input element:
```typescript
<input
  type="text"
  id="floating-address-search"
  name="address"
  autoComplete="street-address"
  value={value}
  onChange={e => onChange(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Search address..."
  className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
  aria-label="Search address"
  disabled={loading}
/>
```

6. Update button aria-label and icon logic:
```typescript
<button
  onClick={() => handleSubmit()}
  disabled={loading}
  className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
  aria-label={value.trim() ? "Search" : "Use current location"}
>
  {loading ? (
    <Loader2 className="w-5 h-5 animate-spin" />
  ) : value.trim() ? (
    <Search className="w-5 h-5" />
  ) : (
    <MapPin className="w-5 h-5" />
  )}
</button>
```

#### 2.2 LandingOverlay Component

**File:** `src/components/Drawer/LandingOverlay.tsx`

**Changes:** Almost identical to FloatingSearchBar

1. Update props interface:
```typescript
interface LandingOverlayProps {
  value: string                          // NEW
  onChange: (value: string) => void      // NEW
  onSearch: (address: string) => void
  onUseLocation: () => void
  loading?: boolean
}
```

2. Remove local state:
```typescript
// DELETE: const [inputValue, setInputValue] = useState("")
```

3. Update destructuring:
```typescript
export function LandingOverlay({
  value,
  onChange,
  onSearch,
  onUseLocation,
  loading = false,
}: LandingOverlayProps) {
```

4. Update `handleSubmit`:
```typescript
const handleSubmit = (e?: React.FormEvent) => {
  e?.preventDefault()

  if (value.trim()) {
    onSearch(value)
  } else {
    onUseLocation()
  }
}
```

5. Update input element:
```typescript
<input
  ref={inputRef}
  type="text"
  id="landing-address-search"
  name="address"
  autoComplete="street-address"
  value={value}
  onChange={e => onChange(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Search address..."
  className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
  aria-label="Search address"
  disabled={loading}
/>
```

6. Update button aria-label and icon logic (same as FloatingSearchBar).

#### 2.3 SearchBar Component

**File:** `src/components/Sidebar/SearchBar.tsx`

**Changes:**

1. Update props interface:
```typescript
interface SearchBarProps {
  value: string                          // NEW
  onChange: (value: string) => void      // NEW
  onSearch: (address: string) => void
  onUseLocation: () => void
  loading?: boolean
  error?: string | null
}
```

2. Remove local state:
```typescript
// DELETE: const [address, setAddress] = useState('');
```

3. Update destructuring:
```typescript
export function SearchBar({ 
  value,
  onChange,
  onSearch, 
  onUseLocation, 
  loading, 
  error 
}: SearchBarProps) {
```

4. Update `handleSubmit`:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (value.trim()) {
    onSearch(value.trim());
  }
};
```

5. Update input element:
```typescript
<input
  type="text"
  id="address-search"
  name="address"
  autoComplete="street-address"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder="Enter an address..."
  className="w-full px-4 py-3.5 pr-12 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
  disabled={loading}
/>
```

6. Update button disabled state:
```typescript
<Button
  type="submit"
  variant="primary"
  size="md"
  className="flex-1 h-12"
  disabled={!value.trim() || loading}
>
  <span className="font-medium">Search</span>
</Button>
```

#### 2.4 Sidebar Component (Pass-through Props)

**File:** `src/components/Sidebar/Sidebar.tsx`

**Changes:**

1. Update props interface:
```typescript
interface SidebarProps {
  // Search
  searchValue: string                    // NEW
  onSearchChange: (value: string) => void // NEW
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  searchLoading?: boolean;
  searchError?: string | null;
  
  // ... rest unchanged
}
```

2. Update destructuring:
```typescript
export function Sidebar({
  searchValue,
  onSearchChange,
  onSearch,
  onUseLocation,
  searchLoading,
  searchError,
  // ... rest unchanged
}: SidebarProps) {
```

3. Update SearchBar usage:
```typescript
<SearchBar
  value={searchValue}
  onChange={onSearchChange}
  onSearch={onSearch}
  onUseLocation={onUseLocation}
  loading={searchLoading}
  error={searchError}
/>
```

#### 2.5 App.tsx - Pass Props to Components

Update all three search component instances in App.tsx to pass the new props:

**FloatingSearchBar** (~line 943):
```typescript
<FloatingSearchBar
  value={searchInput}
  onChange={setSearchInput}
  onSearch={handleSearch}
  onUseLocation={handleUseMyLocation}
  onOpenSettings={() => setShowSettingsMobile(true)}
  loading={loading}
/>
```

**LandingOverlay** (~line 953):
```typescript
<LandingOverlay
  value={searchInput}
  onChange={setSearchInput}
  onSearch={handleLandingSearch}
  onUseLocation={handleLandingUseLocation}
  loading={loading}
/>
```

**Sidebar** (~line 679):
```typescript
<Sidebar
  searchValue={searchInput}
  onSearchChange={setSearchInput}
  onSearch={handleSearch}
  onUseLocation={handleUseMyLocation}
  searchLoading={loading}
  searchError={error}
  // ... all other existing props unchanged
/>
```

### Phase 3: API Client Update

**File:** `src/lib/api-client.ts`

Update `geocodeAddress` to accept and use abort signal:

```typescript
export async function geocodeAddress(
  address: string,
  options?: { signal?: AbortSignal }
): Promise<{
  lat: number;
  lng: number;
  state: AustralianState;
  displayName: string;
  error?: string;
}> {
  const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
  
  try {
    const response = await fetch(`${baseUrl}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      signal: options?.signal, // Pass abort signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Re-throw abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    console.error('Geocode error:', error);
    return {
      lat: 0,
      lng: 0,
      state: 'NSW' as AustralianState,
      displayName: '',
      error: error instanceof Error ? error.message : 'Failed to geocode address',
    };
  }
}
```

### Phase 4: Manifest Update

**File:** `public/manifest.json`

Update share target to use `q` parameter:

```json
"share_target": {
  "action": "/",
  "method": "GET",
  "enctype": "application/x-www-form-urlencoded",
  "params": {
    "text": "q"
  }
}
```

This maps shared text to the `q` query parameter.

---

## Edge Cases Handled

### ✅ 1. Rapid Search Changes
**Scenario:** User searches "Sydney" then immediately searches "Melbourne"

**Solution:** AbortController cancels the Sydney geocoding request when Melbourne search starts. Only Melbourne request completes.

### ✅ 2. Invalid Coordinates in URL
**Scenario:** Malicious/broken URL like `?lat=999&lng=abc`

**Solution:** `validateCoords()` returns `null`, falls back to query-only search (if present) or shows landing page.

### ✅ 3. Invalid Query in URL
**Scenario:** URL like `?q=<script>alert('xss')</script>`

**Solution:** 
- React automatically escapes in `value={...}` prop
- `validateAndSanitizeQuery()` strips `<>` characters
- Length validation prevents extremely long strings

### ✅ 4. Query Too Short
**Scenario:** URL like `?q=ab` (only 2 characters)

**Solution:** `validateAndSanitizeQuery()` returns `null` for queries < 3 chars. Shows landing page.

### ✅ 5. Query Too Long
**Scenario:** URL with extremely long query string (DoS attempt)

**Solution:** `validateAndSanitizeQuery()` truncates to 200 characters.

### ✅ 6. Coordinates Outside Australia
**Scenario:** URL like `?lat=51.5074&lng=-0.1278` (London)

**Solution:** `validateCoords()` checks bounds, returns `null` if outside Australia range.

### ✅ 7. Geocoding Fails
**Scenario:** User searches "asdfghjkl" (not a real address)

**Solution:** 
- Show error message to user
- URL remains as `?q=asdfghjkl` (without coords)
- No search results displayed
- User can try again or edit query

### ✅ 8. Browser Back After Geocoding
**Scenario:** 
1. Search "Sydney" → `?q=Sydney`
2. Geocode completes → `?q=Sydney&lat=...&lng=...` (replaceState)
3. Search "Melbourne" → `?q=Melbourne` (pushState)
4. Click back button

**Expected:** Return to `?q=Sydney&lat=...&lng=...` (the enriched version)

**Solution:** Using `replaceState` for coord enrichment ensures history entry shows final version.

### ✅ 9. Search Field Change Without Submitting
**Scenario:** User types "Melbourne" but doesn't hit Enter

**Solution:** Nothing happens until form submit. URL only updates on explicit search action.

### ✅ 10. "Use My Location" Overwrites Query
**Scenario:** User searches "Sydney" (`?q=Sydney&lat=...&lng=...`), then clicks "Use My Location"

**Solution:** Clear query from URL, only show coords (`?lat=...&lng=...`). Search field becomes blank.

### ✅ 11. Share Target with URL in Text
**Scenario:** User shares "Check out https://example.com at 123 Main St" from another app

**Solution:** The existing URL stripping logic in initial detection handles this:
```typescript
const cleaned = query.replace(/https?:\/\/[^\s]+/g, '').trim();
```

Though with the new validation, this might not be needed since `validateAndSanitizeQuery` already cleans the input. Can keep for extra safety.

### ✅ 12. Direct Visit to Coords-Only URL
**Scenario:** User visits `?lat=-33.87&lng=151.21` directly

**Solution:** Case 2 handles this - blank search field, search using coords immediately.

### ✅ 13. Landing Handlers vs Regular Handlers
**Scenario:** App has separate `handleLandingSearch` and `handleSearch`

**Solution:** Ensure both call the same underlying `handleSearch` logic. The URL handling is the same regardless of which component triggered it.

---

## Testing Checklist

After implementation, verify all scenarios:

### URL Cases
- [ ] `?q=Sydney` - Geocodes, enriches with coords, searches
- [ ] `?lat=-33.87&lng=151.21` - Searches immediately with coords, blank input
- [ ] `?q=Sydney&lat=-33.87&lng=151.21` - Searches immediately, no geocoding
- [ ] No params - Shows landing overlay

### User Actions
- [ ] Manual search - Updates URL with query, geocodes, enriches with coords
- [ ] "Use My Location" - Clears query, adds coords, blank search field
- [ ] Type in search field (without submitting) - No URL change
- [ ] Search A → Search B → Back button - Returns to A with correct URL and input
- [ ] Search → Forward → Back → Forward - All navigation works correctly

### Edge Cases
- [ ] Invalid coords in URL - Ignores coords, uses query only
- [ ] Invalid query in URL - Shows landing page
- [ ] Query with `<>` characters - Stripped safely
- [ ] Query > 200 chars - Truncated
- [ ] Query < 3 chars - Ignored, landing page shown
- [ ] Coords outside Australia - Ignored, uses query only
- [ ] Search "Sydney" quickly then "Melbourne" - Only Melbourne completes
- [ ] Geocoding fails - Error shown, no coords added to URL

### Share Target
- [ ] Share plain address from another app - Opens, searches
- [ ] Share text with URL - URL stripped, address searched
- [ ] Share very long text - Truncated, searched

### Security
- [ ] URL with `?q=<script>alert('xss')</script>` - Escaped safely, no execution
- [ ] URL with malicious coords - Validated, rejected
- [ ] Extremely long query - Truncated, no performance issues

### Browser Behavior
- [ ] Refresh page mid-search - State restored from URL
- [ ] Copy/paste URL - Works in new tab/window
- [ ] Bookmark a search - Returns to same results when visited
- [ ] Share URL via message/email - Recipient sees same search

---

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `src/App.tsx` | Major | Add URL helpers, validation, abort controller, update useEffects, modify handleSearch/handleUseMyLocation, pass props to children |
| `src/components/Drawer/FloatingSearchBar.tsx` | Moderate | Convert to controlled component, remove local state, update props |
| `src/components/Drawer/LandingOverlay.tsx` | Moderate | Convert to controlled component, remove local state, update props |
| `src/components/Sidebar/SearchBar.tsx` | Moderate | Convert to controlled component, remove local state, update props |
| `src/components/Sidebar/Sidebar.tsx` | Minor | Add pass-through props for search value/onChange |
| `src/lib/api-client.ts` | Minor | Add abort signal support to geocodeAddress |
| `public/manifest.json` | Minor | Update share_target params to use `q` |

**Total:** 7 files modified

---

## Implementation Order

1. **Start with validation functions** - Add to App.tsx first, test independently
2. **Add URL helper functions** - Test reading/writing URLs
3. **Update handleSearch and handleUseMyLocation** - Core logic
4. **Update useEffects** - Initial load and navigation handling
5. **Convert search components** - FloatingSearchBar, LandingOverlay, SearchBar
6. **Update Sidebar pass-through** - Connect search components to App state
7. **Update manifest** - Share target config
8. **Update api-client** - Add abort signal support
9. **Test thoroughly** - All scenarios in testing checklist

---

## Notes

- All URL updates use `replaceState` for coord enrichment (no new history entry)
- New searches use `pushState` (new history entry for browser back/forward)
- AbortController ensures only one search request is in-flight at a time
- No reverse geocoding (Case 2 leaves search field blank to minimize API calls)
- React handles XSS escaping automatically in controlled inputs
- Validation happens on URL read, not on every state change
- Search input state is controlled by URL params, not local component state

---

## Security Considerations

### XSS Protection
- ✅ React auto-escapes `value={...}` props (built-in protection)
- ✅ `validateAndSanitizeQuery()` strips `<>` characters as extra precaution
- ✅ No use of `dangerouslySetInnerHTML` anywhere
- ✅ Query never executed or eval'd, only displayed

### URL Injection
- ✅ `validateCoords()` ensures numeric values within Australia bounds
- ✅ `validateAndSanitizeQuery()` enforces length limits
- ✅ URLSearchParams handles URL encoding/decoding safely
- ✅ Invalid params are rejected, not processed

### API Abuse
- ✅ AbortController prevents request spam from rapid searches
- ✅ Existing rate limiting in place (1 req/sec to Nominatim)
- ✅ Geocoding only triggered by explicit user action (form submit)
- ✅ Search only starts after validation passes

### DoS Prevention
- ✅ Query length capped at 200 characters
- ✅ Coords validated for reasonable ranges
- ✅ AbortController cancels previous requests (prevents queue buildup)
- ✅ No automatic/polling searches that could spam APIs

---

## Future Enhancements (Out of Scope)

These are NOT part of this implementation but could be added later:

1. **Reverse Geocoding for Case 2** - Show address for coords-only URLs
2. **Additional URL Params** - Filter preferences (`?sectors=gov,cath`)
3. **Pretty URLs** - `/search/Sydney-NSW` instead of `?q=...`
4. **Search History** - Recent searches dropdown
5. **Analytics** - Track search patterns, popular locations
6. **Debounced Search** - Search as you type (would need different UX)

---

## Dependencies

No new npm packages required. Uses built-in browser APIs:
- `URLSearchParams` - URL parsing
- `window.history` - pushState/replaceState
- `AbortController` - Request cancellation
- React built-in features - Controlled components, state management

---

## Backward Compatibility

✅ **No Breaking Changes**
- Existing localStorage behavior unchanged
- Service worker caching unchanged  
- No data migration needed
- PWA reinstall not required (manifest change is non-breaking)
- Users without query params see landing page (same as before)

✅ **Progressive Enhancement**
- Old bookmarks without coords still work (Case 3)
- New bookmarks include coords (Case 1, optimal)
- Share target behavior enhanced but compatible

---

## Performance Impact

### Positive
- ✅ Case 1 (query + coords) skips geocoding - **saves 200-500ms per search**
- ✅ Bookmarked/shared URLs load faster (coords pre-populated)
- ✅ AbortController reduces wasted API calls

### Neutral  
- ⚠️ Slightly longer URLs (minimal impact)
- ⚠️ Additional validation logic (< 1ms, negligible)

### Negative
- None expected

**Overall:** Net performance improvement, especially for repeated/shared searches.

---

## End of Implementation Plan

This document contains all information needed to implement URL-based search state management. Follow the phases in order, test each step, and refer to edge cases section for comprehensive coverage.
