# Key Decisions & Rationale

This document captures all major decisions made during planning and implementation, along with the reasoning behind each decision.

## Architecture Decisions

### ✅ Client-Side Data Loading (Schools & Stations)

**Decision**: Load school and station data on the client-side, split by state.

**Rationale**:
- Saves serverless function execution time and cost
- Faster response times (no server roundtrip)
- Better offline support (data cached locally)
- JavaScript Haversine calculations are fast enough (~100ms for 10k records)
- Enables true Progressive Web App functionality

**Trade-off Accepted**: Initial data load size (0.5-1.5MB per state)

**Alternative Rejected**: Server-side processing (more complex, slower, more costly)

---

### ✅ State-Based File Splitting

**Decision**: Split schools.json and stations.json into 8 separate files (one per Australian state).

**Rationale**:
- Reduces initial load size by 70-85% (only load needed state)
- Better mobile experience on slow connections
- Faster parsing (smaller JSON files)
- More granular caching (service worker can cache per state)
- Prepares for future state-specific features

**Data**:
- NSW: 832KB (largest)
- TAS: 65KB (smallest)
- Average: ~340KB per state

**Alternative Rejected**: Single monolithic file (5.5MB, slow on mobile)

---

### ✅ School Sector Filters in POI Card

**Decision**: Move school sector checkboxes (Government/Catholic/Independent) from the search bar into the Schools POI card.

**Rationale**:
- Cleaner search bar UI (less visual clutter)
- Contextual filtering (filters near the results they affect)
- Stations and supermarkets don't need filters (consistent UX)
- Persisted in localStorage for user convenience
- Only visible when relevant (schools section)

**Alternative Rejected**: Filters in search bar (cluttered, less contextual)

---

### ✅ Manual Data Updates Only

**Decision**: No automatic version checking or prompts to update data files. Users manually refresh via settings panel.

**Rationale**:
- Simpler implementation (no version metadata system)
- Respects user bandwidth (no surprise downloads)
- Data changes infrequently (schools/stations updated quarterly at most)
- Clear user control over when updates happen
- Reduces complexity and potential bugs

**Future Enhancement**: Could add "Last updated: 2024-Q4" display + manual "Check for updates" button

**Alternative Rejected**: Automatic version checking on load (complex, unwanted data usage)

---

### ✅ Stale-While-Revalidate for Static Assets

**Decision**: Use stale-while-revalidate caching strategy for HTML/CSS/JS files.

**Rationale**:
- Best of both worlds: instant load + auto-updates
- Users always see latest version after one visit
- No manual cache clearing needed
- Standard PWA pattern (used by Twitter, GitHub, etc.)
- Works perfectly offline (cached fallback)

**How it works**:
1. First visit: Network fetch (slow), cache for later
2. Return visits: Instant cached version, silent background update
3. Next visit: New version already cached from background fetch

**Alternative Rejected**: 
- Cache-first (stale code after deployments)
- Network-first (slow, doesn't work offline)

---

### ✅ Network-First with Smart Caching for APIs

**Decision**: Use network-first strategy for API endpoints, but with intelligent caching (TTL-based, deduplication).

**Rationale**:
- Balances freshness with performance
- Respects external API rate limits
- Instant responses for fresh cached data (no network call)
- Graceful degradation when network fails
- Request deduplication prevents duplicate API calls

**TTL Values**:
- Geocoding: 30 days (addresses don't change)
- Supermarkets: 7 days (stores change occasionally)
- Walking routes: 30 days (routes rarely change)

**Smart Behaviors**:
- If cached data is fresh (within TTL), return immediately (no API call)
- If request already in-flight, wait for it (no duplicate call)
- If network fails, return stale cache (graceful degradation)

**Alternative Rejected**: 
- Always network-first (too many API calls, rate limit issues)
- Cache-first (stale data, doesn't respect updates)

---

### ✅ Cache-First for Data Files

**Decision**: Use cache-first strategy for state-based data files.

**Rationale**:
- Data files change very infrequently (quarterly updates)
- Large file sizes (500KB-1MB per state)
- User controls updates manually (no surprise downloads)
- Instant loading on repeat visits
- Perfect for offline use

**Alternative Rejected**: Network-first (unnecessary network calls, slower)

---

### ✅ Light Offline Mode

**Decision**: Implement basic offline support (cached searches only), not full offline functionality.

**Rationale**:
- Supermarkets API requires internet (live data)
- Walking routes API requires internet (OpenRouteService)
- Geocoding new addresses requires internet
- Full offline would require massive pre-computation
- Light mode provides value without over-engineering

**What Works Offline**:
- Previously searched addresses (select dropdown)
- "Use my location" + local data (schools/stations)
- Cached walking routes
- Map tiles (if previously cached)

**What Doesn't Work Offline**:
- New address searches
- Supermarket data
- New walking routes

**Future Enhancement**: Could pre-compute walking routes for top 1000 searches

**Alternative Rejected**: Full offline mode (too complex, requires massive data pre-processing)

---

### ✅ Share Target Prepared but Not Implemented

**Decision**: Add share target to PWA manifest, but only log shared text (not auto-search yet).

**Rationale**:
- Need to experiment with different address formats from various apps
- realestate.com.au includes URLs that need filtering
- Different apps may format addresses differently
- Logging allows testing without committing to parsing logic
- Easy to implement full feature later

**Current Implementation**:
```typescript
console.group('🔗 Share Target Activated');
console.log('Raw shared text:', sharedText);
console.log('Cleaned address (preview):', cleanedAddress);
console.groupEnd();
// TODO: handleSearch(cleanedAddress);
```

**Future Implementation**: Parse, clean, and auto-search shared addresses

**Alternative Rejected**: Full implementation now (too many unknowns about address formats)

---

### ❌ No Border Proximity Detection

**Decision**: Do NOT automatically load neighboring states when near state borders.

**Rationale**:
- Edge case (most searches are not near borders)
- Adds complexity (bounding box checks, distance calculations)
- Doubles data loading (e.g., NSW + VIC near border)
- Can be added later if users report missing results
- Keep implementation simple for MVP

**Future Enhancement**: Could add if users report issues with missing results near borders

**Alternative Rejected**: Auto-load neighboring states within 10km of border (over-engineering)

---

### ❌ No Pre-Caching

**Decision**: Do NOT pre-cache common areas or pre-warm the cache.

**Rationale**:
- Wastes bandwidth for users who never search those areas
- Mobile users on metered connections
- Cache will build naturally as users search
- Service worker caches on-demand efficiently
- Respects user data usage

**Future Enhancement**: Could add "Pre-load data for: [Sydney] [Melbourne] [Brisbane]" in settings

**Alternative Rejected**: Pre-cache top 5 cities (unwanted data usage)

---

### ❌ No Supermarket Pre-Processing (For Now)

**Decision**: Keep supermarkets as live API calls to Overpass, don't pre-process into static files.

**Rationale**:
- Supermarket data changes frequently (stores open/close regularly)
- Overpass API is fast enough (~200-500ms)
- Static files would go stale quickly
- Rate limits are manageable with caching (7 day TTL)
- Can always add later if API becomes problematic

**Future Enhancement**: If Overpass becomes unreliable or rate-limited, generate state-based supermarket files updated weekly via automated script

**Alternative Rejected**: Pre-process supermarkets now (data goes stale, adds complexity)

---

## Technical Decisions

### ✅ React 19 + TypeScript

**Decision**: Use React 19 with TypeScript strict mode.

**Rationale**:
- Modern React features (Compiler, concurrent rendering)
- Type safety prevents bugs
- Better IDE support
- Future-proof

**Alternative Rejected**: Plain JavaScript (less safe, more bugs)

---

### ✅ React Compiler (Experimental)

**Decision**: Enable React Compiler (babel-plugin-react-compiler).

**Rationale**:
- Automatic memoization (no manual useMemo/useCallback)
- Better performance out of the box
- Becoming React standard
- Good learning opportunity

**Risk Accepted**: Experimental feature (may have bugs)

**Alternative Rejected**: Manual memoization (more boilerplate, easier to forget)

---

### ✅ Vite with Rolldown

**Decision**: Use Vite with rolldown-vite (modern bundler).

**Rationale**:
- Faster builds than Webpack
- Modern ESM-based dev server
- Great DX (instant HMR)
- Smaller bundle sizes

**Alternative Rejected**: Create React App (deprecated), Webpack (slower)

---

### ✅ Tailwind CSS

**Decision**: Use Tailwind CSS for styling.

**Rationale**:
- Rapid development (utility-first)
- Consistent design system
- Small production bundle (only used classes)
- Mobile-first responsive design built-in
- Great with React components

**Alternative Rejected**: CSS Modules (more boilerplate), styled-components (runtime cost)

---

### ✅ Leaflet + react-leaflet

**Decision**: Use Leaflet for maps, not Mapbox or Google Maps.

**Rationale**:
- Free and open source
- No API key required
- Works offline with cached tiles
- Lightweight (~40KB gzipped)
- Good enough for this use case

**Trade-off Accepted**: Not as modern or feature-rich as Mapbox GL JS

**Alternative Rejected**: Mapbox GL JS (requires API key, costs money at scale)

---

### ✅ Vercel Hosting

**Decision**: Host on Vercel with serverless functions.

**Rationale**:
- Zero-config deployment
- Automatic HTTPS
- Edge network (fast globally)
- Generous free tier
- Serverless functions (no server management)
- Preview deployments

**Alternative Rejected**: Self-hosted (more complex, costs more)

---

### ✅ No State Management Library

**Decision**: Use React state + custom hooks only, no Redux/Zustand.

**Rationale**:
- App state is simple enough
- Custom hooks provide good encapsulation
- Less boilerplate
- Smaller bundle size
- React Compiler optimizes automatically

**Alternative Rejected**: Redux (overkill), Zustand (unnecessary)

---

### ✅ Lucide React Icons

**Decision**: Use lucide-react for icons.

**Rationale**:
- Modern, clean icons
- Tree-shakeable (only import what you use)
- Consistent style
- Good React integration
- Free and open source

**Alternative Rejected**: Font Awesome (larger bundle), Material Icons (different style)

---

## UX Decisions

### ✅ Progressive Enhancement Pattern

**Decision**: Show estimated walking times immediately, fetch accurate times in background.

**Rationale**:
- Users see results instantly (perceived performance)
- No blocking on slow API calls
- Respects API rate limits (sequential fetching)
- Graceful degradation (estimates if API fails)
- Industry standard pattern

**Alternative Rejected**: Wait for all accurate times before showing results (slow, poor UX)

---

### ✅ Sequential API Fetching (1 Second Delays)

**Decision**: Fetch walking routes one at a time with 1 second delays, not in parallel.

**Rationale**:
- Respects OpenRouteService rate limits (40 req/min)
- Prevents 429 errors
- Provides progressive updates (cards update one by one)
- Better than showing nothing for 3+ seconds

**Alternative Rejected**: Parallel fetching (rate limit errors, poor UX)

---

### ✅ Mobile-First Design

**Decision**: Design for mobile first, enhance for desktop.

**Rationale**:
- Most real estate searches happen on mobile
- Harder to shrink desktop design than expand mobile design
- Tailwind is mobile-first by default
- Better touch targets and usability

**Alternative Rejected**: Desktop-first (harder to adapt to mobile)

---

### ✅ Sidebar Slide-In on Mobile

**Decision**: Sidebar slides in as overlay on mobile, fixed panel on desktop.

**Rationale**:
- Maximizes map visibility on mobile
- Common mobile pattern (Google Maps, etc.)
- Easy to toggle with button
- Desktop has room for side-by-side layout

**Alternative Rejected**: Bottom sheet (harder to scroll long content)

---

### ✅ Alternatives Collapsed by Default

**Decision**: POI alternatives start collapsed, expand on click.

**Rationale**:
- Less visual clutter
- Top result is usually what user wants
- Easy to expand if needed
- Standard pattern (search results, etc.)

**Alternative Rejected**: Always expanded (too much scrolling)

---

### ✅ Auto-Fetch Top 3 POIs

**Decision**: Automatically fetch walking routes for top school, station, and supermarket after search.

**Rationale**:
- Users almost always want the top results
- Provides value without user action
- Background fetching doesn't block UI
- Sequential with delays respects rate limits

**Alternative Rejected**: Wait for user to manually click each (poor UX, more clicks)

---

### ✅ Time Badges: Gray (Estimate) vs Blue (Actual)

**Decision**: Use different colored badges to distinguish estimates from accurate times.

**Rationale**:
- Clear visual feedback
- Users know when accurate time is available
- Smooth transition (gray → blue) shows progress
- Industry pattern (Google Maps uses similar approach)

**Alternative Rejected**: Same color (confusing what's estimate vs actual)

---

## Future Enhancement Decisions

### Considered but Deferred

**These features were discussed but intentionally deferred for later:**

1. **Automatic data version checking**
   - Reason: Adds complexity, user can manually update
   - Future: Could add "Last updated" display + manual check

2. **Border proximity detection**
   - Reason: Edge case, adds complexity
   - Future: Add if users report missing results near borders

3. **Pre-caching common areas**
   - Reason: Wastes bandwidth
   - Future: Optional "Pre-load data for [city]" in settings

4. **Supermarket pre-processing**
   - Reason: Data goes stale, API fast enough
   - Future: Add if Overpass becomes problematic

5. **Full offline mode**
   - Reason: Requires massive pre-computation
   - Future: Pre-compute walking routes for top 1000 searches

6. **Share target auto-search**
   - Reason: Need to test address formats first
   - Future: Implement after testing with real data

7. **Route preferences (avoid highways, etc.)**
   - Reason: API complexity, MVP doesn't need it
   - Future: Add based on user demand

8. **Multiple transport modes (cycling, transit)**
   - Reason: Scope creep
   - Future: Separate feature

9. **User accounts / saved searches**
   - Reason: Adds backend complexity
   - Future: Could use localStorage first, then backend

10. **Analytics / usage tracking**
    - Reason: Privacy concerns, not needed for MVP
    - Future: Add with user consent if needed

---

## Lessons & Insights

### What Went Well

1. **Early state-based splitting decision** saved implementation time
2. **Client-side data loading** simplified architecture significantly
3. **React Compiler** eliminated need for manual memoization
4. **Comprehensive planning** prevented scope creep

### What We'd Do Differently

1. **Consider CDN** for data files earlier (faster global access)
2. **Design API contracts** before implementation (better types)
3. **Set up testing** from the start (prevent regressions)

### Key Takeaways

1. **Simple is better**: Avoided over-engineering (no border detection, no pre-caching)
2. **Progressive enhancement works**: Users get value immediately, accuracy comes later
3. **Caching is powerful**: Eliminates most API calls with smart TTL strategy
4. **Mobile-first pays off**: Easier to enhance than shrink
5. **Documentation matters**: This file will save hours of future debugging

---

## Decision Log Template

For future decisions, use this format:

```markdown
### [✅/❌] Decision Title

**Decision**: Clear statement of what was decided

**Rationale**:
- Reason 1
- Reason 2
- Data/evidence supporting decision

**Trade-off Accepted** (if applicable): What we gave up

**Alternative Rejected**: What we considered but didn't choose

**Future Enhancement** (if applicable): How we might revisit this
```
