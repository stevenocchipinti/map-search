# Map Search

A mobile-first Progressive Web App for finding the nearest schools, train stations, and supermarkets to any address in Australia.

## Features

- 🗺️ Interactive map with walking routes
- 🏫 Search schools by sector (Government, Catholic, Independent)
- 🚉 Find nearest train stations
- 🛒 Locate nearby supermarkets
- 📱 Mobile-first responsive design
- 📶 Offline support with service workers
- ⚡ Fast client-side data processing
- 🎯 Progressive enhancement (estimates → accurate walking times)

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite (Rolldown)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + react-leaflet
- **Compiler**: React Compiler (experimental)
- **Hosting**: Vercel (SPA + Serverless Functions)

## Getting Started

### Prerequisites

- Node.js 18+ (tested with v22)
- npm or yarn
- Vercel CLI (for local development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd map-search2
```

2. Install dependencies:
```bash
npm install
```

3. Install Vercel CLI globally (if not already installed):
```bash
npm install -g vercel
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenRouteService API key:
# ORS_API_KEY=your_api_key_here
```

Get a free API key at: https://openrouteservice.org/dev/#/signup

5. Process data files (first time only):
```bash
npm run data:all
```

This will split the source data files by state and generate optimized files in `public/data/{state}/`.

6. Authenticate with Vercel (first time only):
```bash
vercel login
```

Follow the prompts to authenticate.

7. Start the development server:
```bash
vercel dev
```

The app will be available at `http://localhost:3000` (or the next available port).

**Note:** Use `vercel dev` (not `npm run dev`) to run both the Vite dev server AND the serverless API functions locally. This is required for testing the full application including API endpoints.

## Development Scripts

- `npm run dev` - Start Vite dev server only (frontend only, no API)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code
- `npm run test:api` - Test API functions directly (no HTTP)
- `npm run data:all` - Process all data files
- `npm run data:schools` - Process schools data only
- `npm run data:stations` - Process stations data only

### Development Workflow

**For full-stack development** (recommended):
```bash
vercel dev
# Access at http://localhost:3000
# API endpoints available at /api/*
```

**For frontend-only development** (faster, but no API):
```bash
npm run dev
# Access at http://localhost:5173
# API endpoints will not work
```

**Testing API functions directly** (without HTTP layer):
```bash
npm run test:api
# Tests geocode, supermarkets, and walking routes functions
```

## Data Updates

The app uses pre-processed data for schools and train stations. To update this data:

1. Place updated source files in `data-sources/`:
   - `schools.json` - School locations (or `School Location 2024.xlsx`)
   - `stations.geojson` - Train station locations

2. Run the processing script:
```bash
npm run data:all
```

3. The processed files will be generated in `public/data/{state}/`

See [DATA_SOURCES.md](./DATA_SOURCES.md) for more details on data sources and processing.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Technical architecture, caching strategies, data flow diagrams
- **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)** - Phase-by-phase implementation plan with detailed task breakdowns
- **[DECISIONS.md](./docs/DECISIONS.md)** - All key decisions and rationale (why we chose what we chose)
- **[QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)** - Quick reference for commands, types, and common tasks
- **[DATA_SOURCES.md](./DATA_SOURCES.md)** - Data sources and processing instructions

## Architecture

### Client-Side

The app loads school and station data client-side, split by Australian state:

- **State detection**: Geocodes address → determines state → loads only that state's data
- **Haversine calculations**: Fast local distance calculations
- **Progressive loading**: Shows estimates immediately, fetches accurate walking times sequentially
- **Service Worker**: Caches data files and API responses for offline use

### Server-Side (Vercel Functions)

Minimal server-side processing:

- `/api/geocode` - Address → lat/lng/state (Nominatim)
- `/api/supermarkets` - Fetch nearby supermarkets (Overpass API)
- `/api/walking-routes` - Calculate accurate walking routes (OpenRouteService)

### Data Strategy

- **Schools**: ~11,000 schools, split by state (~30-800KB per state)
- **Stations**: ~1,700 operational stations, split by state (~0.3-60KB per state)
- **Supermarkets**: Live API (Overpass) - updated in real-time
- **Walking Routes**: OpenRouteService API with client-side caching

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `ORS_API_KEY` - Your OpenRouteService API key
3. Deploy!

The app will be deployed as:
- Static SPA (HTML, CSS, JS, data files)
- Serverless functions for API endpoints

### Other Platforms

The app can be deployed to any platform that supports:
- Static file hosting
- Serverless functions (for API endpoints)

## PWA Features

The app is a Progressive Web App with:

- **Installable**: Can be installed on mobile/desktop
- **Offline-capable**: Works without internet for previously loaded areas
- **Share target**: Can receive addresses shared from other apps (e.g., real estate apps)
- **App-like**: Runs in standalone mode without browser UI

## Troubleshooting

### "vercel dev must not recursively invoke itself" error

This happens if you try to run `npm run dev` when `vercel dev` is already configured to use it.

**Solution:** Run `vercel dev` directly from the command line, not through npm scripts:
```bash
vercel dev
```

### "Cannot find module" errors in API functions

If you see errors like:
```
Error: Cannot find module '/Users/.../src/lib/overpass' imported from .../api/supermarkets.ts
```

**Solution:** Make sure all imports in the `src/lib/` folder use `.js` extensions for ESM compatibility:
```typescript
// Correct
import { haversineDistance } from './haversine.js';

// Incorrect
import { haversineDistance } from './haversine';
```

### Blank page with "Expected a JavaScript module script" error

This happens when you navigate to `http://localhost:3000/` directly. The Vite frontend is not yet implemented.

**Solution:** Test the API endpoints directly:
```bash
# Test geocode
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "123 Elizabeth St, Sydney NSW"}'
```

Or use the test script:
```bash
npm run test:api
```

### "No existing credentials found" error from Vercel CLI

**Solution:** Authenticate with Vercel:
```bash
vercel login
```

### Port already in use

If port 3000 is already in use, Vercel will automatically use the next available port (3001, 3002, etc.). Check the terminal output for the actual URL.

### API key not working

Make sure your `.env` file has the correct format:
```bash
ORS_API_KEY=your_actual_key_here
```

No quotes, no extra spaces. Restart `npm run dev` after changing the `.env` file.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT

## Credits

### Data Sources

- **Schools**: Australian school location data (official government source)
- **Stations**: Australian train station data (GeoScience Australia)
- **Supermarkets**: OpenStreetMap via Overpass API
- **Geocoding**: Nominatim (OpenStreetMap)
- **Walking Routes**: OpenRouteService
- **Map Tiles**: Carto (Voyager style)
