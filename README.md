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

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenRouteService API key
```

4. Process data files (first time only):
```bash
npm run data:all
```

This will split the source data files by state and generate optimized files in `public/data/{state}/`.

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code
- `npm run data:all` - Process all data files
- `npm run data:schools` - Process schools data only
- `npm run data:stations` - Process stations data only

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
