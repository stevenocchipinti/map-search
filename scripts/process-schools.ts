#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

interface School {
  name: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  sector: 'Government' | 'Catholic' | 'Independent';
  type: 'Primary' | 'Secondary' | 'Combined';
  latitude: number;
  longitude: number;
}

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

async function processSchools() {
  console.log('🏫 Processing schools data...\n');

  // Read source file
  const sourcePath = path.join(process.cwd(), 'data-sources/schools.json');
  const schools: School[] = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  
  console.log(`📚 Loaded ${schools.length} schools from source file`);

  // Group by state
  const schoolsByState = new Map<AustralianState, School[]>();
  
  for (const state of STATES) {
    schoolsByState.set(state, []);
  }

  for (const school of schools) {
    // Light validation: ensure coordinates exist
    if (!school.latitude || !school.longitude) {
      console.warn(`⚠️  Skipping school with missing coordinates: ${school.name}`);
      continue;
    }

    const stateSchools = schoolsByState.get(school.state);
    if (stateSchools) {
      stateSchools.push(school);
    } else {
      console.warn(`⚠️  Unknown state: ${school.state} for school ${school.name}`);
    }
  }

  // Write state files
  const stats: Record<string, { count: number; size: string }> = {};
  
  for (const [state, stateSchools] of schoolsByState.entries()) {
    if (stateSchools.length === 0) continue;

    const outputPath = path.join(process.cwd(), `public/data/${state.toLowerCase()}/schools.json`);
    const json = JSON.stringify(stateSchools, null, 2);
    
    fs.writeFileSync(outputPath, json);
    
    const sizeKB = (json.length / 1024).toFixed(1);
    stats[state] = { count: stateSchools.length, size: `${sizeKB}KB` };
    
    console.log(`  ✓ ${state}: ${stateSchools.length} schools → ${sizeKB}KB`);
  }

  console.log('\n✅ Schools processing complete!\n');
  
  return stats;
}

export { processSchools };
