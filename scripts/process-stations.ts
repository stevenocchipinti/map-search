#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

interface StationFeature {
  type: 'Feature';
  properties: {
    name: string;
    state: string;
    operationalstatus: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface GeoJSON {
  type: 'FeatureCollection';
  features: StationFeature[];
  [key: string]: any;
}

interface Station {
  name: string;
  state: AustralianState;
  latitude: number;
  longitude: number;
}

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

async function processStations() {
  console.log('🚉 Processing stations data...\n');

  // Read source file
  const sourcePath = path.join(process.cwd(), 'data-sources/stations.geojson');
  const geojson: GeoJSON = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  
  console.log(`📍 Loaded ${geojson.features.length} features from source file`);

  // Filter operational stations and group by state
  const stationsByState = new Map<AustralianState, Station[]>();
  
  for (const state of STATES) {
    stationsByState.set(state, []);
  }

  let operationalCount = 0;
  let skippedCount = 0;

  for (const feature of geojson.features) {
    // Only include operational stations
    if (feature.properties.operationalstatus !== 'Operational') {
      skippedCount++;
      continue;
    }

    // Light validation: ensure coordinates exist
    if (!feature.geometry?.coordinates || feature.geometry.coordinates.length !== 2) {
      console.warn(`⚠️  Skipping station with missing coordinates: ${feature.properties.name}`);
      skippedCount++;
      continue;
    }

    operationalCount++;

    const [longitude, latitude] = feature.geometry.coordinates;
    const state = feature.properties.state as AustralianState;
    
    const station: Station = {
      name: feature.properties.name,
      state,
      latitude,
      longitude,
    };

    const stateStations = stationsByState.get(state);
    if (stateStations) {
      stateStations.push(station);
    } else {
      console.warn(`⚠️  Unknown state: ${state} for station ${station.name}`);
    }
  }

  console.log(`  Operational: ${operationalCount}, Skipped: ${skippedCount}\n`);

  // Write state files
  const stats: Record<string, { count: number; size: string }> = {};
  
  for (const [state, stateStations] of stationsByState.entries()) {
    if (stateStations.length === 0) continue;

    const outputPath = path.join(process.cwd(), `public/data/${state.toLowerCase()}/stations.json`);
    const json = JSON.stringify(stateStations, null, 2);
    
    fs.writeFileSync(outputPath, json);
    
    const sizeKB = (json.length / 1024).toFixed(1);
    stats[state] = { count: stateStations.length, size: `${sizeKB}KB` };
    
    console.log(`  ✓ ${state}: ${stateStations.length} stations → ${sizeKB}KB`);
  }

  console.log('\n✅ Stations processing complete!\n');
  
  return stats;
}

export { processStations };
