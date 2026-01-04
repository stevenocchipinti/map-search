# Data Sources

This document describes the data sources used in the Local Search app and how to update them.

## Overview

The app uses three types of Point of Interest (POI) data:

1. **Schools** - Pre-processed static data, split by state
2. **Train Stations** - Pre-processed static data, split by state
3. **Supermarkets** - Live data from Overpass API (OpenStreetMap)

## Schools Data

### Source

**File**: `data-sources/schools.json` or `data-sources/School Location 2024.xlsx`

**Origin**: Australian government official school location data

**Format**: JSON array or Excel spreadsheet

**Schema**:

```json
{
  "name": "School Name",
  "suburb": "SUBURB",
  "state": "NSW|VIC|QLD|WA|SA|TAS|ACT|NT",
  "postcode": "1234",
  "sector": "Government|Catholic|Independent",
  "type": "Primary|Secondary|Combined",
  "latitude": -33.123456,
  "longitude": 151.123456
}
```

**Count**: ~11,000 schools across Australia

### Processing

The processing script (`scripts/process-schools.ts`) performs the following:

1. Reads the source JSON file
2. Validates that coordinates exist (light validation only)
3. Groups schools by state
4. Writes separate JSON files for each state to `public/data/{state}/schools.json`

**Output files**:

- `public/data/nsw/schools.json` - ~3,400 schools (~770KB)
- `public/data/vic/schools.json` - ~2,800 schools (~650KB)
- `public/data/qld/schools.json` - ~2,000 schools (~450KB)
- `public/data/wa/schools.json` - ~1,300 schools (~290KB)
- `public/data/sa/schools.json` - ~800 schools (~180KB)
- `public/data/tas/schools.json` - ~300 schools (~65KB)
- `public/data/act/schools.json` - ~150 schools (~33KB)
- `public/data/nt/schools.json` - ~220 schools (~50KB)

### How to Update

1. Obtain the latest school location data (JSON or Excel format)
2. Place it in `data-sources/schools.json`
3. Run: `npm run data:schools`
4. Commit the generated files in `public/data/*/schools.json`

**Update Frequency**: Annually or when significant changes occur (new schools, closures)

---

## Train Stations Data

### Source

**File**: `data-sources/stations.geojson`

**Origin**: GeoScience Australia - Railway Stations dataset

**Format**: GeoJSON FeatureCollection with Point geometries

**Schema**:

```json
{
  "type": "Feature",
  "properties": {
    "name": "STATION NAME",
    "state": "NSW|VIC|QLD|WA|SA|TAS|ACT|NT",
    "operationalstatus": "Operational|Inactive|...",
    "featuresubtype": "Railway Station",
    ...
  },
  "geometry": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  }
}
```

**Count**: ~3,300 total features, ~1,700 operational stations

### Processing

The processing script (`scripts/process-stations.ts`) performs the following:

1. Reads the source GeoJSON file
2. Filters only operational stations (`operationalstatus: "Operational"`)
3. Validates that coordinates exist
4. Extracts relevant properties (name, state, coordinates)
5. Groups stations by state
6. Writes separate JSON files (simplified format) for each state

**Output Schema** (simplified):

```json
{
  "name": "Station Name",
  "state": "NSW",
  "latitude": -33.123456,
  "longitude": 151.123456
}
```

**Output files**:

- `public/data/nsw/stations.json` - ~440 stations (~60KB)
- `public/data/vic/stations.json` - ~410 stations (~51KB)
- `public/data/qld/stations.json` - ~380 stations (~47KB)
- `public/data/wa/stations.json` - ~340 stations (~42KB)
- `public/data/sa/stations.json` - ~130 stations (~16KB)
- `public/data/tas/stations.json` - ~3 stations (~0.3KB)
- `public/data/act/stations.json` - 0 stations
- `public/data/nt/stations.json` - ~11 stations (~1.4KB)

### How to Update

1. Download the latest Railway Stations GeoJSON from GeoScience Australia
2. Place it in `data-sources/stations.geojson`
3. Run: `npm run data:stations`
4. Commit the generated files in `public/data/*/stations.json`

**Update Frequency**: Quarterly or when new stations open/close

---

## Supermarkets Data

### Source

**API**: Overpass API (OpenStreetMap data)

**Query**: `shop=supermarket` within 2000m radius of search location

**Format**: Real-time API response (not pre-processed)

### Why Not Pre-processed?

Supermarket data changes more frequently than schools/stations:

- New stores open regularly
- Stores close or relocate
- Hours and details change

Using live data ensures users always see current information.

### Future Enhancement

Consider pre-processing supermarket data (similar to schools/stations) if:

- API rate limits become problematic
- Offline support for supermarkets is required
- Data freshness requirements change (e.g., quarterly updates acceptable)

---

## Processing All Data

To process both schools and stations in one command:

```bash
npm run data:all
```

This runs both processing scripts and displays a summary report:

```
State   | Schools | Stations | Total Size
--------|---------|----------|------------
NSW     |    3429 |      436 |    832.5KB
VIC     |    2842 |      413 |    698.8KB
QLD     |    2003 |      377 |    495.5KB
...
```

## State-Based Loading

The app uses state-based data loading for optimal performance:

1. **User searches** for an address
2. **Geocoding API** returns coordinates + state
3. **App loads** only that state's data files:
   - `public/data/{state}/schools.json`
   - `public/data/{state}/stations.json`
4. **Service worker caches** the loaded files for offline use
5. **Future searches** in the same state use cached data

### Benefits

- **Faster initial load**: Only ~0.5-1.5MB per state vs ~5.5MB for all of Australia
- **Lower bandwidth**: Users only download data for areas they search
- **Better mobile experience**: Especially on slow connections
- **Offline-ready**: Cached data available without internet

## Data Validation

The processing scripts perform light validation:

- ✅ **Coordinates exist**: Both latitude and longitude are present
- ✅ **State is valid**: Matches one of the 8 Australian states/territories

**Not validated** (assumed from official sources):

- Coordinate accuracy (within Australia bounding box)
- Postal code format
- Name/suburb formatting

This keeps processing fast and simple since data comes from official government sources.

## Troubleshooting

### Processing fails with "File not found"

Ensure source files exist in `data-sources/`:

```bash
ls -lh data-sources/
# Should show: schools.json, stations.geojson
```

### Output files are empty

Check the console output for warnings. Common issues:

- Source file is corrupted
- JSON parsing failed
- All records filtered out due to validation

### State counts seem wrong

Compare with source data:

```bash
# Count schools by state in source file
cat data-sources/schools.json | jq '[.[] | .state] | group_by(.) | map({state: .[0], count: length})'

# Check processed output
ls -lh public/data/*/schools.json
```

## File Locations

```
map-search2/
├── data-sources/          # Source data (not committed to git)
│   ├── schools.json       # or School Location 2024.xlsx
│   └── stations.geojson
├── public/
│   └── data/              # Processed output (committed to git)
│       ├── nsw/
│       │   ├── schools.json
│       │   └── stations.json
│       ├── vic/
│       │   ├── schools.json
│       │   └── stations.json
│       └── ...
└── scripts/               # Processing scripts
    ├── process-schools.ts
    ├── process-stations.ts
    └── process-all.ts
```

## Git Ignore

**Ignored** (`.gitignore`):

- `data-sources/` - Large source files, don't commit
- `.env` - API keys

**Committed**:

- `public/data/*/*.json` - Processed state files (part of app)
- `.env.example` - Template for environment variables

The processed files are small enough (~2.7MB total) to commit to git and deploy with the app.
