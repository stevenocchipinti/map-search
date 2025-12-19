# Agent Guidelines for map-search

## Build/Test Commands
- **Dev**: `npm run dev` - Start dev server at localhost:4321
- **Build**: `npm run build` - Build production site
- **Preview**: `npm run preview` - Preview production build
- **No tests**: This project has no test suite currently

## Tech Stack
- Astro 5 with TypeScript (strict mode)
- Vercel adapter for SSG/SSR hybrid
- Tailwind CSS 4, Leaflet maps
- API routes use Nominatim, OpenRouteService, Overpass APIs

## Code Style
- **Imports**: Named imports, omit extensions, use `import type` for types
- **Formatting**: 2 spaces, semicolons, single quotes (TS), double quotes (strings)
- **Types**: Explicit interfaces, prefer `null` over `undefined`, use built-in types (e.g., GeoJSON.LineString)
- **Naming**: camelCase (functions/vars), PascalCase (types/interfaces), SCREAMING_SNAKE_CASE (constants)
- **API Routes**: Export `prerender = false` for dynamic endpoints, use `APIRoute` type from astro
- **Error Handling**: Try-catch with console.error, return graceful error responses (status 200 with error field or appropriate status codes)
- **Comments**: JSDoc for public functions, inline for complex logic
