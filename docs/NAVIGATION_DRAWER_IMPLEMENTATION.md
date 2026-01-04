# Persistent Navigation Drawer Implementation Plan

## Document Purpose

This document provides a complete, step-by-step implementation plan for adding a persistent bottom navigation drawer with snap points to the map-search mobile interface. This plan is designed to be executed by any LLM agent without prior context, using only the existing codebase as reference.

---

## Project Context

**Project**: Map Search - A PWA that finds nearest schools, train stations, and supermarkets
**Tech Stack**: React 19 + TypeScript, Vite, Tailwind CSS, Leaflet maps, Vercel serverless
**Current State**: Desktop has sidebar, mobile has list/map toggle tabs
**Goal**: Replace mobile toggle with persistent bottom drawer using vaul (shadcn/ui Drawer)

---

## Color System Reference (CRITICAL - MUST BE CONSISTENT)

The application uses a specific color system across ALL components (drawer, desktop sidebar, map markers, polylines). **These colors MUST match exactly:**

### Category Colors

#### Schools (varies by sector)

- **Government Schools**:
  - Hex: `#22c55e` (green-500)
  - Tailwind: `bg-green-500`, `text-green-500`, `border-green-500`
- **Catholic Schools**:
  - Hex: `#a855f7` (purple-500)
  - Tailwind: `bg-purple-500`, `text-purple-500`, `border-purple-500`
- **Independent Schools**:
  - Hex: `#f97316` (orange-500)
  - Tailwind: `bg-orange-500`, `text-orange-500`, `border-orange-500`

#### Train Stations

- Hex: `#dc2626` (red-600)
- Tailwind: `bg-red-600`, `text-red-600`, `border-red-600`
- Desktop sidebar currently uses: `text-teal-700 bg-teal-50` (header only)
- **ACTION REQUIRED**: Drawer must use red-600 to match map markers

#### Supermarkets

- Hex: `#14b8a6` (teal-500)
- Tailwind: `bg-teal-500`, `text-teal-500`, `border-teal-500`
- Desktop sidebar currently uses: `text-emerald-700 bg-emerald-50` (header only)
- **ACTION REQUIRED**: Drawer must use teal-500 to match map markers

### UI Element Colors

**Active Tab States**:

- School (Government): `bg-green-500 text-white border-b-4 border-green-700`
- School (Catholic): `bg-purple-500 text-white border-b-4 border-purple-700`
- School (Independent): `bg-orange-500 text-white border-b-4 border-orange-700`
- Station: `bg-red-600 text-white border-b-4 border-red-800`
- Supermarket: `bg-teal-500 text-white border-b-4 border-teal-700`

**Inactive Tab States**:

- School: `bg-white text-gray-700 border border-gray-200`
- Station: `bg-white text-red-700 border border-gray-200`
- Supermarket: `bg-white text-teal-700 border border-gray-200`

**Dot Indicators** (middle snap):

- School (varies by selected school's sector):
  - Government: `bg-green-500`
  - Catholic: `bg-purple-500`
  - Independent: `bg-orange-500`
- Station: `bg-red-600`
- Supermarket: `bg-teal-500`

**User Location Marker**:

- Hex: `#ef4444` (red-500)
- Solid red dot with white border

---

## Implementation Overview

### What We're Building

A mobile-only persistent navigation drawer with 3 snap points:

1. **Lowest Snap (80px)**: Bottom navigation bar with 3 tabs
2. **Middle Snap (auto-height)**: Selected POI details
3. **Highest Snap (85vh)**: Full alternatives list

### Key Features

- ✅ Non-dismissible drawer (always visible at minimum)
- ✅ Color-coded tabs matching map markers
- ✅ Toggle behavior (tap active tab collapses)
- ✅ Floating search bar (fades when drawer expands)
- ✅ Floating settings button (top-right)
- ✅ Settings modal (simple overlay, not vaul)
- ✅ All icons from lucide-react
- ✅ 200ms transitions
- ✅ Desktop layout unchanged

---

## File Structure

Create these new files:

```
src/components/
  Drawer/
    ├── NavigationDrawer.tsx          # Main wrapper with vaul
    ├── DrawerTabBar.tsx              # 3 tabs for lowest snap
    ├── DrawerDetails.tsx             # Details view for middle snap
    ├── DrawerAlternatives.tsx        # Alternatives list for highest snap
    ├── FloatingSearchBar.tsx         # Floating search with smart button
    ├── FloatingSettingsButton.tsx    # Settings FAB
    └── SettingsModal.tsx             # Settings modal overlay
```

Modify these files:

```
src/
  ├── App.tsx                         # Update mobile section
  └── components/
      └── Sidebar/
          └── OfflineBanner.tsx       # Add lucide icons
```

---

## Dependencies

### Install vaul

```bash
npm install vaul
```

### Verify lucide-react

Already installed (v0.562.0). Import icons like:

```typescript
import {
  Search,
  MapPin,
  Settings,
  GraduationCap,
  Train,
  ShoppingCart,
} from "lucide-react"
```

---

## Implementation Phases

### Phase 1: Setup & Install (15 min)

**Tasks**:

1. Install vaul: `npm install vaul`
2. Create directory: `src/components/Drawer/`
3. Create 7 empty component files (listed above)
4. Test imports work: `import { Drawer } from 'vaul'`

**Verification**:

- [ ] `node_modules/vaul` exists
- [ ] All 7 new files created
- [ ] No import errors

---

### Phase 2: DrawerTabBar Component (60 min)

**File**: `src/components/Drawer/DrawerTabBar.tsx`

**Purpose**: Display 3 color-coded tabs at lowest snap point

**Requirements**:

1. Import lucide icons: `GraduationCap`, `Train`, `ShoppingCart`
2. Use exact colors from "Color System Reference" section
3. Show walking time (from route if available, estimate otherwise)
4. Handle "no results" state (grayed out, show "No results")
5. Active tab has border-bottom accent
6. Grid layout: 3 equal columns

**Props Interface**:

```typescript
interface DrawerTabBarProps {
  activeTab: POICategory
  onTabClick: (category: POICategory) => void

  // POI data
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]

  // Selected indices
  selectedPOIs: SelectedPOIs

  // Routes (for walking time)
  schoolRoute?: WalkingRoute | null
  stationRoute?: WalkingRoute | null
  supermarketRoute?: WalkingRoute | null
}
```

**Key Logic**:

```typescript
// Get walking time for a category
const getWalkingTime = (category: POICategory): string => {
  const route = getRouteForCategory(category)
  if (route) {
    return formatDuration(route.duration) // e.g., "12 min"
  }

  const items = getItemsForCategory(category)
  if (items.length === 0) return ""

  const selectedItem = items[selectedPOIs[category]]
  return `~${formatDuration(selectedItem.estimatedWalkingTime)}`
}

// Check if category has results
const hasResults = (category: POICategory): boolean => {
  return getItemsForCategory(category).length > 0
}
```

**Layout Example**:

```tsx
<div className="grid grid-cols-3 gap-2 p-3">
  {(["school", "station", "supermarket"] as POICategory[]).map(category => (
    <button
      key={category}
      onClick={() => onTabClick(category)}
      disabled={!hasResults(category)}
      className={`
        flex flex-col items-center justify-center p-3 rounded-xl
        transition-all duration-200 min-h-[72px]
        ${activeTab === category ? getActiveStyle(category) : getInactiveStyle(category)}
        ${!hasResults(category) ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-semibold">{getLabel(category)}</span>
      <span className="text-xs mt-0.5">
        {hasResults(category) ? getWalkingTime(category) : "No results"}
      </span>
    </button>
  ))}
</div>
```

**Color Functions** (use exact colors from reference):

```typescript
const getActiveStyle = (category: POICategory): string => {
  switch (category) {
    case "school":
      return "bg-blue-600 text-white border-b-4 border-blue-800"
    case "station":
      return "bg-red-600 text-white border-b-4 border-red-800"
    case "supermarket":
      return "bg-teal-500 text-white border-b-4 border-teal-700"
  }
}

const getInactiveStyle = (category: POICategory): string => {
  switch (category) {
    case "school":
      return "bg-white text-gray-700 border border-gray-200"
    case "station":
      return "bg-white text-red-700 border border-gray-200"
    case "supermarket":
      return "bg-white text-teal-700 border border-gray-200"
  }
}
```

**Icon Mapping**:

```typescript
const getIcon = (category: POICategory) => {
  switch (category) {
    case "school":
      return GraduationCap
    case "station":
      return Train
    case "supermarket":
      return ShoppingCart
  }
}
```

**Testing**:

- [ ] All 3 tabs render
- [ ] Active tab has correct colors
- [ ] Icons display correctly
- [ ] Walking times show
- [ ] "No results" state works
- [ ] Click handler fires

---

### Phase 3: NavigationDrawer Component (90 min)

**File**: `src/components/Drawer/NavigationDrawer.tsx`

**Purpose**: Main drawer wrapper managing snap points and state

**Requirements**:

1. Use vaul's Drawer component
2. Configure 3 snap points: `[80, 'fit-content', '85vh']`
3. Non-dismissible: `dismissible={false}`
4. Modal: `modal={false}` (doesn't block map)
5. Manage state: `snapIndex`, `activeTab`
6. Implement toggle behavior
7. Render appropriate content per snap point

**Props Interface**:

```typescript
interface NavigationDrawerProps {
  // POI data
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]

  // Selection
  selectedPOIs: SelectedPOIs
  onSelectPOI: (category: POICategory, index: number) => void

  // Routes
  schoolRoute?: WalkingRoute | null
  stationRoute?: WalkingRoute | null
  supermarketRoute?: WalkingRoute | null
  routeLoading: { school: boolean; station: boolean; supermarket: boolean }

  // School filters
  sectors: Set<SchoolSector>
  onToggleSector: (sector: SchoolSector) => void

  // State control (passed from App.tsx)
  snapIndex: number
  onSnapIndexChange: (index: number) => void
  activeTab: POICategory
  onActiveTabChange: (tab: POICategory) => void
}
```

**State & Logic**:

```typescript
export function NavigationDrawer({
  schools, stations, supermarkets,
  selectedPOIs, onSelectPOI,
  schoolRoute, stationRoute, supermarketRoute, routeLoading,
  sectors, onToggleSector,
  snapIndex, onSnapIndexChange,
  activeTab, onActiveTabChange,
}: NavigationDrawerProps) {

  // Tab click toggle behavior
  const handleTabClick = (category: POICategory) => {
    if (activeTab === category && snapIndex === 1) {
      // Tapping active tab at middle → collapse to lowest
      onSnapIndexChange(0);
    } else {
      // Different tab OR at lowest/highest → switch tab and go to middle
      onActiveTabChange(category);
      onSnapIndexChange(1);
    }
  };

  // Helper to get current category items
  const getCurrentItems = (): POI[] => {
    switch (activeTab) {
      case 'school': return schools;
      case 'station': return stations;
      case 'supermarket': return supermarkets;
    }
  };

  // Helper to get current route
  const getCurrentRoute = (): WalkingRoute | null | undefined => {
    switch (activeTab) {
      case 'school': return schoolRoute;
      case 'station': return stationRoute;
      case 'supermarket': return supermarketRoute;
    }
  };

  return (
    <Drawer.Root
      open={true}
      modal={false}
      dismissible={false}
      snapPoints={[80, 'fit-content', '85vh']}
      activeSnapPoint={snapIndex}
      setActiveSnapPoint={onSnapIndexChange}
      fadeFromIndex={1}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/20" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-3xl shadow-soft-lg">
          {/* Drag handle - always visible */}
          <div className="pt-3 pb-2 flex justify-center">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Content based on snap point */}
          {snapIndex === 0 && (
            <DrawerTabBar
              activeTab={activeTab}
              onTabClick={handleTabClick}
              schools={schools}
              stations={stations}
              supermarkets={supermarkets}
              selectedPOIs={selectedPOIs}
              schoolRoute={schoolRoute}
              stationRoute={stationRoute}
              supermarketRoute={supermarketRoute}
            />
          )}

          {snapIndex === 1 && (
            <DrawerDetails
              activeTab={activeTab}
              onTabChange={(tab) => {
                onActiveTabChange(tab);
                // Stay at current snap point
              }}
              items={getCurrentItems()}
              selectedIndex={selectedPOIs[activeTab]}
              route={getCurrentRoute()}
              routeLoading={routeLoading[activeTab]}
              sectors={sectors}
              onToggleSector={onToggleSector}
              onShowAlternatives={() => onSnapIndexChange(2)}
              hasAlternatives={getCurrentItems().length > 1}
            />
          )}

          {snapIndex === 2 && (
            <DrawerAlternatives
              activeTab={activeTab}
              items={getCurrentItems()}
              selectedIndex={selectedPOIs[activeTab]}
              onSelectItem={(index) => {
                onSelectPOI(activeTab, index);
                onSnapIndexChange(1); // Auto-collapse to middle
              }}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

**Key Points**:

- Snap points: `[80, 'fit-content', '85vh']`
- Transition duration: 200ms (vaul default, or set with `transitionDuration={200}`)
- State is controlled from parent (App.tsx)
- Toggle logic: active tab at middle → collapse

**Testing**:

- [ ] Drawer renders at bottom
- [ ] Starts at lowest snap (80px)
- [ ] Drag handle visible
- [ ] Can drag between snap points
- [ ] Tap tab expands to middle
- [ ] Tap active tab collapses
- [ ] Content switches correctly

---

### Phase 4: DrawerDetails Component (75 min)

**File**: `src/components/Drawer/DrawerDetails.tsx`

**Purpose**: Show selected POI details at middle snap point

**Requirements**:

1. Tab switcher (3 dots) at top
2. Selected item name and details
3. Badges: walking time, distance, sector (schools)
4. Sector filters (schools only)
5. "View alternatives" button (if > 1 result)
6. "No results" placeholder

**Props Interface**:

```typescript
interface DrawerDetailsProps {
  activeTab: POICategory
  onTabChange: (tab: POICategory) => void

  items: POI[]
  selectedIndex: number

  route?: WalkingRoute | null
  routeLoading?: boolean

  sectors?: Set<SchoolSector>
  onToggleSector?: (sector: SchoolSector) => void

  onShowAlternatives: () => void
  hasAlternatives: boolean
}
```

**Layout**:

```tsx
export function DrawerDetails({
  activeTab,
  onTabChange,
  items,
  selectedIndex,
  route,
  routeLoading,
  sectors,
  onToggleSector,
  onShowAlternatives,
  hasAlternatives,
}: DrawerDetailsProps) {
  const selectedItem = items[selectedIndex]

  // No results case
  if (!selectedItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">
          No{" "}
          {activeTab === "school"
            ? "schools"
            : activeTab === "station"
              ? "train stations"
              : "supermarkets"}{" "}
          found nearby
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Try searching a different address or adjusting filters
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Tab switcher dots */}
      <div className="flex items-center justify-center gap-2 py-3 border-b border-gray-100">
        {(["school", "station", "supermarket"] as POICategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => onTabChange(cat)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
              activeTab === cat
                ? getCategoryDotColor(cat, selectedItem) + " scale-110"
                : "bg-gray-300"
            }`}
            aria-label={`Switch to ${cat}`}
          />
        ))}
      </div>

      {/* Selected item details */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {selectedItem.name}
          </h3>
          {selectedItem.details && (
            <p className="text-sm text-gray-600 mt-1">{selectedItem.details}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {/* Walking time */}
          {routeLoading ? (
            <Badge
              variant="loading"
              icon={<Loader2 className="w-3 h-3 animate-spin" />}
            >
              Loading...
            </Badge>
          ) : route ? (
            <Badge variant="actual" icon={<Check className="w-3 h-3" />}>
              {formatDuration(route.duration)}
            </Badge>
          ) : (
            <Badge variant="estimate">
              ~{formatDuration(selectedItem.estimatedWalkingTime)}
            </Badge>
          )}

          {/* Distance */}
          <Badge variant="default">
            {formatDistance(selectedItem.distance)}
          </Badge>

          {/* Sector (schools only) */}
          {activeTab === "school" && selectedItem.sector && (
            <Badge variant="default">{selectedItem.sector}</Badge>
          )}
        </div>

        {/* Sector filters (schools only) */}
        {activeTab === "school" && sectors && onToggleSector && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Filter by sector:
            </p>
            <SectorCheckboxes sectors={sectors} onToggle={onToggleSector} />
          </div>
        )}

        {/* View alternatives button */}
        {hasAlternatives && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowAlternatives}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            View {items.length - 1} more option
            {items.length - 1 !== 1 ? "s" : ""}
            <ChevronUp className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Dot color helper (use exact colors from reference)
function getCategoryDotColor(category: POICategory, selectedItem: POI): string {
  if (category === "school" && selectedItem.sector) {
    switch (selectedItem.sector) {
      case "Government":
        return "bg-green-500"
      case "Catholic":
        return "bg-purple-500"
      case "Independent":
        return "bg-orange-500"
    }
  }

  switch (category) {
    case "school":
      return "bg-blue-600" // Fallback if no sector
    case "station":
      return "bg-red-600"
    case "supermarket":
      return "bg-teal-500"
  }
}
```

**Imports Needed**:

```typescript
import { Check, Loader2, ChevronUp } from "lucide-react"
import { Badge } from "../UI/Badge"
import { Button } from "../UI/Button"
import { SectorCheckboxes } from "../Sidebar/SectorCheckboxes"
import { formatDistance, formatDuration } from "../../utils/format"
```

**Testing**:

- [ ] Dot switcher renders
- [ ] Dots have correct colors
- [ ] Clicking dot switches content
- [ ] Selected item displays
- [ ] Badges show correctly
- [ ] Sector filters work (schools)
- [ ] "View alternatives" button appears
- [ ] "No results" placeholder shows

---

### Phase 5: DrawerAlternatives Component (45 min)

**File**: `src/components/Drawer/DrawerAlternatives.tsx`

**Purpose**: Show full list of alternatives at highest snap point

**Requirements**:

1. Reuse existing `POIAlternatives` component logic
2. Scrollable list
3. Click alternative → collapse to middle
4. Show all items except selected

**Props Interface**:

```typescript
interface DrawerAlternativesProps {
  activeTab: POICategory
  items: POI[]
  selectedIndex: number
  onSelectItem: (index: number) => void
}
```

**Implementation**:

```tsx
import { POIAlternatives } from "../Sidebar/POIAlternatives"

export function DrawerAlternatives({
  activeTab,
  items,
  selectedIndex,
  onSelectItem,
}: DrawerAlternativesProps) {
  const categoryLabel =
    activeTab === "school"
      ? "Schools"
      : activeTab === "station"
        ? "Train Stations"
        : "Supermarkets"

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-lg">{categoryLabel}</h3>
        <p className="text-xs text-gray-600 mt-1">
          {items.length} option{items.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        <POIAlternatives
          items={items}
          selectedIndex={selectedIndex}
          onSelect={onSelectItem}
        />
      </div>
    </div>
  )
}
```

**Testing**:

- [ ] List scrolls
- [ ] All alternatives show
- [ ] Selected item highlighted
- [ ] Click alternative works
- [ ] Collapses to middle after selection

---

### Phase 6: FloatingSearchBar Component (60 min)

**File**: `src/components/Drawer/FloatingSearchBar.tsx`

**Purpose**: Floating search bar with smart button (search vs location)

**Requirements**:

1. Rounded pill shape
2. Input field + embedded button
3. Button changes based on input:
   - Empty → MapPin icon (use location)
   - Has text → Search icon (submit search)
4. Loading state → Loader2 spinner
5. Error display in drawer middle snap (not in search bar)
6. Position: `bottom-24` (96px from bottom)
7. Fade out when drawer expands

**Props Interface**:

```typescript
interface FloatingSearchBarProps {
  onSearch: (address: string) => void
  onUseLocation: () => void
  loading?: boolean
  className?: string
}
```

**Implementation**:

```tsx
import { useState } from "react"
import { Search, MapPin, Loader2 } from "lucide-react"

export function FloatingSearchBar({
  onSearch,
  onUseLocation,
  loading,
  className = "",
}: FloatingSearchBarProps) {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    if (inputValue.trim()) {
      onSearch(inputValue)
    } else {
      onUseLocation()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  return (
    <div className={`fixed left-4 right-4 bottom-24 z-40 ${className}`}>
      <div className="bg-white rounded-full shadow-soft-lg p-2 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search address..."
          className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
          aria-label="Search address"
          disabled={loading}
        />

        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 shadow-soft"
          aria-label={inputValue.trim() ? "Search" : "Use current location"}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : inputValue.trim() ? (
            <Search className="w-5 h-5" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  )
}
```

**Note**: Error display is handled in the drawer middle snap point (DrawerDetails component), not in the search bar.

**Usage in App.tsx**:

```tsx
<FloatingSearchBar
  onSearch={handleSearch}
  onUseLocation={handleUseMyLocation}
  loading={loading}
  className={`transition-opacity duration-200 ${
    drawerSnapIndex === 0 ? "opacity-100" : "opacity-0 pointer-events-none"
  }`}
/>
```

**Testing**:

- [ ] Renders at correct position
- [ ] Input works
- [ ] Button shows MapPin when empty
- [ ] Button shows Search when has text
- [ ] Button shows Loader2 when loading
- [ ] Enter key submits
- [ ] Fades when drawer expands

---

### Phase 7: FloatingSettingsButton Component (30 min)

**File**: `src/components/Drawer/FloatingSettingsButton.tsx`

**Purpose**: Floating action button for settings (top-right)

**Requirements**:

1. Circular button
2. Settings icon from lucide
3. Position: `top-4 right-4`
4. Mobile only: `md:hidden`
5. Z-index: `z-50`

**Implementation**:

```tsx
import { Settings } from "lucide-react"

interface FloatingSettingsButtonProps {
  onClick: () => void
}

export function FloatingSettingsButton({
  onClick,
}: FloatingSettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-50 w-12 h-12 bg-white rounded-full shadow-soft-lg text-gray-700 hover:text-gray-900 hover:shadow-soft-xl transition-all duration-200 flex items-center justify-center md:hidden"
      aria-label="Settings"
    >
      <Settings className="w-6 h-6" />
    </button>
  )
}
```

**Testing**:

- [ ] Renders top-right
- [ ] Circular shape
- [ ] Settings icon shows
- [ ] Click handler fires
- [ ] Only on mobile
- [ ] Hover effects work

---

### Phase 8: SettingsModal Component (45 min)

**File**: `src/components/Drawer/SettingsModal.tsx`

**Purpose**: Simple modal overlay for settings (NOT using vaul to avoid confusion)

**Requirements**:

1. Slides up from bottom
2. Backdrop darkens screen
3. Click backdrop → close
4. X button → close
5. Escape key → close
6. Reuse existing `SettingsPanel` component

**Implementation**:

```tsx
import { useEffect } from "react"
import { X } from "lucide-react"
import { SettingsPanel } from "../Settings/SettingsPanel"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // Escape key handler
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-t-3xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <SettingsPanel />
        </div>
      </div>
    </div>
  )
}
```

**Testing**:

- [ ] Modal slides up from bottom
- [ ] Backdrop darkens screen
- [ ] Click backdrop closes
- [ ] Click X closes
- [ ] Escape key closes
- [ ] Settings panel renders
- [ ] Body scroll locked when open

---

### Phase 9: Update OfflineBanner (15 min)

**File**: `src/components/Sidebar/OfflineBanner.tsx`

**Purpose**: Replace SVG icons with lucide icons

**Changes**:

```tsx
import { WifiOff, X } from "lucide-react"

interface OfflineBannerProps {
  onDismiss: () => void
}

export function OfflineBanner({ onDismiss }: OfflineBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-900">Offline mode</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-600 hover:text-amber-800 transition-colors duration-200"
        aria-label="Dismiss offline banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
```

**Testing**:

- [ ] Icons render correctly
- [ ] Styling unchanged
- [ ] Dismiss button works

---

### Phase 10: Update App.tsx Mobile Section (90 min)

**File**: `src/App.tsx`

**Purpose**: Replace mobile tab view with drawer + floating elements

**New State Variables**:

```typescript
// Add near other state declarations (around line 40-62)
const [drawerSnapIndex, setDrawerSnapIndex] = useState<number>(0)
const [activeDrawerTab, setActiveDrawerTab] = useState<POICategory>("school")
const [showSettingsMobile, setShowSettingsMobile] = useState(false)
const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false)
```

**Imports**:

```typescript
// Add to existing imports (around line 1-24)
import { NavigationDrawer } from "./components/Drawer/NavigationDrawer"
import { FloatingSearchBar } from "./components/Drawer/FloatingSearchBar"
import { FloatingSettingsButton } from "./components/Drawer/FloatingSettingsButton"
import { SettingsModal } from "./components/Drawer/SettingsModal"
```

**State Sync Logic** (add after handleSelectPOI function):

```typescript
/**
 * Reset drawer when search completes
 */
useEffect(() => {
  if (searchResults) {
    // Collapse to lowest snap
    setDrawerSnapIndex(0)

    // Auto-select first category with results
    const firstCategory =
      searchResults.schools.length > 0
        ? "school"
        : searchResults.stations.length > 0
          ? "station"
          : searchResults.supermarkets.length > 0
            ? "supermarket"
            : "school"

    setActiveDrawerTab(firstCategory)
  }
}, [searchResults])

/**
 * Sync drawer when map marker clicked
 */
const handleMapMarkerClick = (category: POICategory, index: number) => {
  handleSelectPOI(category, index)
  setActiveDrawerTab(category)

  // Expand to middle if currently at lowest
  if (drawerSnapIndex === 0) {
    setDrawerSnapIndex(1)
  }
}
```

**Replace Mobile Section** (around line 556-727):

**BEFORE** (remove this):

```typescript
{/* Mobile: Tabbed view with toggle */}
<div className="flex md:hidden flex-col h-full">
  {/* Mobile view toggle tabs */}
  <div className="flex border-b border-gray-200 bg-white shadow-soft">
    {/* ... tab buttons ... */}
  </div>

  {mobileView === 'list' && <Sidebar />}
  {mobileView === 'map' && <Map />}
</div>
```

**AFTER** (new code):

```typescript
{/* Mobile: Drawer with floating elements */}
<div className="flex md:hidden flex-col h-full relative">
  {/* Offline banner (skinny strip at top) */}
  {!isOnline && !offlineBannerDismissed && (
    <div className="absolute top-0 left-0 right-0 z-50">
      <OfflineBanner onDismiss={() => setOfflineBannerDismissed(true)} />
    </div>
  )}

  {/* Map (full screen) */}
  <div className="absolute inset-0">
    <Map center={mapCenter} zoom={mapZoom} bounds={mapBounds}>
      {/* User location marker */}
      {searchResults && (
        <MapMarker
          position={[searchResults.location.lat, searchResults.location.lng]}
          type="user"
        />
      )}

      {/* Selected POI markers with pins */}
      {selectedSchool && (
        <MapMarker
          position={[selectedSchool.latitude, selectedSchool.longitude]}
          type="school"
          sector={selectedSchool.sector}
          selected={true}
          onClick={() => handleMapMarkerClick('school', selectedPOIs.school)}
        />
      )}

      {selectedStation && (
        <MapMarker
          position={[selectedStation.latitude, selectedStation.longitude]}
          type="station"
          selected={true}
          onClick={() => handleMapMarkerClick('station', selectedPOIs.station)}
        />
      )}

      {selectedSupermarket && (
        <MapMarker
          position={[selectedSupermarket.latitude, selectedSupermarket.longitude]}
          type="supermarket"
          selected={true}
          onClick={() => handleMapMarkerClick('supermarket', selectedPOIs.supermarket)}
        />
      )}

      {/* Alternative POI markers (hollow dots) */}
      {searchResults?.schools.map((school, index) => {
        if (index === selectedPOIs.school) return null;
        return (
          <MapMarker
            key={school.id}
            position={[school.latitude, school.longitude]}
            type="school"
            sector={school.sector}
            isAlternative={true}
            onClick={() => handleMapMarkerClick('school', index)}
          />
        );
      })}

      {searchResults?.stations.map((station, index) => {
        if (index === selectedPOIs.station) return null;
        return (
          <MapMarker
            key={station.id}
            position={[station.latitude, station.longitude]}
            type="station"
            isAlternative={true}
            onClick={() => handleMapMarkerClick('station', index)}
          />
        );
      })}

      {searchResults?.supermarkets.map((supermarket, index) => {
        if (index === selectedPOIs.supermarket) return null;
        return (
          <MapMarker
            key={supermarket.id}
            position={[supermarket.latitude, supermarket.longitude]}
            type="supermarket"
            isAlternative={true}
            onClick={() => handleMapMarkerClick('supermarket', index)}
          />
        );
      })}

      {/* Walking route polylines for selected POIs */}
      {schoolRoute && selectedSchool && (
        <MapPolyline
          encodedPolyline={schoolRoute.polyline}
          category="school"
          sector={selectedSchool.sector}
        />
      )}

      {stationRoute && (
        <MapPolyline
          encodedPolyline={stationRoute.polyline}
          category="station"
        />
      )}

      {supermarketRoute && (
        <MapPolyline
          encodedPolyline={supermarketRoute.polyline}
          category="supermarket"
        />
      )}
    </Map>
  </div>

  {/* Floating settings button */}
  <FloatingSettingsButton onClick={() => setShowSettingsMobile(true)} />

  {/* Floating search bar (fades when drawer expands) */}
  <FloatingSearchBar
    onSearch={handleSearch}
    onUseLocation={handleUseMyLocation}
    loading={loading}
    className={`transition-opacity duration-200 ${
      drawerSnapIndex === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
  />

  {/* Navigation drawer */}
  <NavigationDrawer
    schools={searchResults?.schools || []}
    stations={searchResults?.stations || []}
    supermarkets={searchResults?.supermarkets || []}
    selectedPOIs={selectedPOIs}
    onSelectPOI={handleSelectPOI}
    schoolRoute={schoolRoute}
    stationRoute={stationRoute}
    supermarketRoute={supermarketRoute}
    routeLoading={routeLoadingStates}
    sectors={sectors}
    onToggleSector={toggleSector}
    snapIndex={drawerSnapIndex}
    onSnapIndexChange={setDrawerSnapIndex}
    activeTab={activeDrawerTab}
    onActiveTabChange={setActiveDrawerTab}
  />

  {/* Settings modal */}
  <SettingsModal
    open={showSettingsMobile}
    onClose={() => setShowSettingsMobile(false)}
  />
</div>
```

**Remove Old State** (around line 62):

```typescript
// DELETE THIS LINE:
const [mobileView, setMobileView] = useState<"list" | "map">("list")
```

**Desktop Section** (keep unchanged, around line 421-554):

```typescript
{/* Desktop: Side-by-side layout */}
<div className="hidden md:flex md:flex-row flex-1 overflow-hidden">
  {/* ... existing desktop code ... */}
</div>
```

**Add Error Display in DrawerDetails** (if search error exists):
In `DrawerDetails.tsx`, add error display at the top of the component when `error` prop is passed:

```tsx
{
  error && (
    <div className="px-4 pt-4">
      <div className="px-4 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
        {error}
      </div>
    </div>
  )
}
```

**Testing**:

- [ ] Mobile shows drawer + map
- [ ] Desktop unchanged (sidebar visible)
- [ ] Floating search bar visible at lowest snap
- [ ] Search bar fades when drawer expands
- [ ] Settings button visible top-right
- [ ] Settings modal opens/closes
- [ ] Offline banner shows at top
- [ ] Map markers clickable
- [ ] Clicking marker syncs drawer state
- [ ] Search error displays in drawer

---

### Phase 11: Accessibility Features (45 min)

**Add to NavigationDrawer.tsx**:

```typescript
// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't interfere with input fields
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    // Arrow Left/Right: Switch tabs
    if (e.key === "ArrowLeft") {
      const tabs: POICategory[] = ["school", "station", "supermarket"]
      const idx = tabs.indexOf(activeTab)
      onActiveTabChange(tabs[idx > 0 ? idx - 1 : 2])
    }

    if (e.key === "ArrowRight") {
      const tabs: POICategory[] = ["school", "station", "supermarket"]
      const idx = tabs.indexOf(activeTab)
      onActiveTabChange(tabs[idx < 2 ? idx + 1 : 0])
    }

    // Arrow Up: Expand drawer
    if (e.key === "ArrowUp" && snapIndex < 2) {
      e.preventDefault()
      onSnapIndexChange(snapIndex + 1)
    }

    // Arrow Down: Collapse drawer
    if (e.key === "ArrowDown" && snapIndex > 0) {
      e.preventDefault()
      onSnapIndexChange(snapIndex - 1)
    }

    // Escape: Collapse to lowest
    if (e.key === "Escape" && snapIndex > 0) {
      onSnapIndexChange(0)
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [activeTab, snapIndex, onActiveTabChange, onSnapIndexChange])

// Focus management
useEffect(() => {
  if (snapIndex === 1) {
    // Focus on details when expanded to middle
    const detailsPanel = document.querySelector('[role="tabpanel"]')
    if (detailsPanel instanceof HTMLElement) {
      detailsPanel.focus()
    }
  }
}, [snapIndex])
```

**ARIA Labels** (add to components):

**DrawerTabBar.tsx**:

```typescript
<div role="tablist" aria-label="Category navigation">
  <button
    role="tab"
    aria-selected={activeTab === category}
    aria-controls={`${category}-panel`}
    id={`${category}-tab`}
    aria-label={`${label}, ${walkingTime || 'no results'}`}
  >
```

**DrawerDetails.tsx**:

```typescript
<div
  role="tabpanel"
  id={`${activeTab}-panel`}
  aria-labelledby={`${activeTab}-tab`}
  tabIndex={-1}
>
```

**Drag Handle**:

```typescript
<div
  role="separator"
  aria-label="Drag to expand or collapse navigation"
  aria-orientation="vertical"
  className="pt-3 pb-2 flex justify-center"
>
```

**Testing**:

- [ ] Tab key navigates through elements
- [ ] Arrow keys switch tabs
- [ ] Arrow up/down change snap points
- [ ] Escape collapses drawer
- [ ] Screen reader announces changes
- [ ] Focus visible on keyboard nav
- [ ] All buttons have aria-label

---

### Phase 12: Final Testing & Validation (60 min)

**Functional Tests**:

- [ ] Install vaul completes without errors
- [ ] All 7 new components compile
- [ ] App runs without console errors
- [ ] Drawer renders at lowest snap on load
- [ ] Tap tab expands to middle
- [ ] Tap active tab collapses to lowest
- [ ] Drag up/down transitions smoothly
- [ ] Drag handle always visible
- [ ] Tab colors match exactly (based on sector for schools, red for stations, teal for supermarkets)
- [ ] Walking times display correctly
- [ ] "No results" placeholder shows
- [ ] Alternative selection collapses to middle
- [ ] Search bar fades when drawer expands
- [ ] Search button changes (search/location)
- [ ] Settings button opens modal
- [ ] Settings modal closes (backdrop/X/Escape)
- [ ] Offline banner shows at top
- [ ] Map markers clickable
- [ ] Clicking marker syncs drawer

**Color Validation** (use browser DevTools):

- [ ] School tab active (Government): `#22c55e` (green-500)
- [ ] School tab active (Catholic): `#a855f7` (purple-500)
- [ ] School tab active (Independent): `#f97316` (orange-500)
- [ ] Station tab active: `#dc2626` (red-600)
- [ ] Supermarket tab active: `#14b8a6` (teal-500)
- [ ] School dot (varies by sector): green/purple/orange
- [ ] Station dot: `#dc2626`
- [ ] Supermarket dot: `#14b8a6`
- [ ] Map markers match tab colors

**Visual Tests**:

- [ ] Drawer rounded corners at top
- [ ] Shadow visible
- [ ] Transitions smooth (200ms)
- [ ] No layout shift when expanding
- [ ] Search bar fully rounded
- [ ] Settings button circular
- [ ] Modal slides up smoothly
- [ ] Backdrop dims screen

**Device Tests**:

- [ ] iOS Safari (test viewport height)
- [ ] Android Chrome
- [ ] Landscape orientation
- [ ] Small screen (iPhone SE)
- [ ] Large screen (iPad mini)

**Accessibility Tests**:

- [ ] Keyboard navigation works
- [ ] Tab key moves focus
- [ ] Arrow keys change content
- [ ] Screen reader announces changes
- [ ] Focus visible on all elements
- [ ] Color contrast sufficient (WCAG AA)

**Desktop Tests**:

- [ ] Desktop layout unchanged
- [ ] Sidebar still visible
- [ ] No drawer on desktop
- [ ] No floating elements on desktop

---

## Z-Index Hierarchy

```
z-0    → Map (base layer)
z-40   → Floating search bar
z-50   → Navigation drawer + settings button + offline banner
z-[60] → Settings modal backdrop & content
```

---

## Animation Timings

All transitions use **200ms**:

```css
/* Snap point transitions */
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Search bar fade */
transition: opacity 200ms ease-in-out;

/* Tab active state */
transition: all 200ms ease-in-out;

/* Button hover */
transition: colors 200ms ease-in-out;
```

---

## Troubleshooting

### Issue: Drawer not expanding/collapsing

**Solution**: Check vaul props, ensure `dismissible={false}` and `modal={false}`

### Issue: Search bar not fading

**Solution**: Verify `pointer-events-none` is applied when opacity is 0

### Issue: Colors don't match

**Solution**: Use exact hex values from "Color System Reference" section

### Issue: iOS Safari viewport clipping

**Solution**: Use `100dvh` instead of `100vh`, add `env(safe-area-inset-bottom)`

### Issue: Drawer blocks map touches

**Solution**: Ensure map has `pointer-events-auto`, drawer overlay is transparent

### Issue: State not syncing

**Solution**: Check that all state updates use proper setters, not direct mutation

### Issue: TypeScript errors

**Solution**: Ensure all imports match existing types from `src/types/index.ts`

---

## Success Criteria

Implementation is complete when:

1. ✅ Drawer renders at 3 snap points (80px, auto, 85vh)
2. ✅ Tabs use correct colors (varies by school sector, red for stations, teal for supermarkets)
3. ✅ Toggle behavior works (tap active → collapse)
4. ✅ Search bar fades smoothly
5. ✅ Settings accessible via floating button + modal
6. ✅ Alternative selection auto-collapses to middle
7. ✅ "No results" placeholders work
8. ✅ All transitions are 200ms
9. ✅ Desktop layout completely unchanged
10. ✅ Accessible (keyboard nav, ARIA labels)
11. ✅ Works on iOS Safari and Android Chrome
12. ✅ Map markers match drawer colors exactly

---

## Post-Implementation

After completing implementation:

1. **Test on real devices** (iOS + Android)
2. **Update desktop sidebar colors** (optional future task - match drawer)
3. **Add swipe gestures** between tabs (optional enhancement)
4. **Add route caching optimization** (optional performance boost)

---

## Notes for Implementer

- **React Compiler**: Project uses React Compiler - NO manual memoization needed
- **Desktop**: Leave desktop sidebar completely alone (separate update later)
- **Colors**: Triple-check colors match exactly - this is critical for UX consistency
- **Icons**: All icons from lucide-react - NO custom SVGs
- **Vaul**: Only for navigation drawer - settings uses simple modal
- **State**: All state managed in App.tsx, passed down as props
- **Testing**: Test each phase before moving to next
- **School Colors**: Active tab color varies by selected school's sector (Government/Catholic/Independent)

---

## Estimated Timeline

- Phase 1: Setup (15 min)
- Phase 2: DrawerTabBar (60 min)
- Phase 3: NavigationDrawer (90 min)
- Phase 4: DrawerDetails (75 min)
- Phase 5: DrawerAlternatives (45 min)
- Phase 6: FloatingSearchBar (60 min)
- Phase 7: FloatingSettingsButton (30 min)
- Phase 8: SettingsModal (45 min)
- Phase 9: OfflineBanner update (15 min)
- Phase 10: App.tsx integration (90 min)
- Phase 11: Accessibility (45 min)
- Phase 12: Testing (60 min)

**Total: ~10.5 hours**

---

## End of Plan

This document contains everything needed to implement the persistent navigation drawer. Follow phases sequentially, test after each phase, and refer to "Color System Reference" frequently to ensure consistency.

Good luck! 🚀
