#!/usr/bin/env tsx

import { processSchools } from './process-schools';
import { processStations } from './process-stations';

async function processAll() {
  console.log('🚀 Processing all data files...\n');
  console.log('=' .repeat(50));
  console.log('\n');

  const schoolStats = await processSchools();
  console.log('=' .repeat(50));
  console.log('\n');
  
  const stationStats = await processStations();
  console.log('=' .repeat(50));
  console.log('\n');

  // Summary report
  console.log('📊 SUMMARY REPORT\n');
  console.log('State   | Schools | Stations | Total Size');
  console.log('--------|---------|----------|------------');
  
  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
  let totalSchools = 0;
  let totalStations = 0;
  
  for (const state of states) {
    const schools = schoolStats[state] || { count: 0, size: '0KB' };
    const stations = stationStats[state] || { count: 0, size: '0KB' };
    
    if (schools.count === 0 && stations.count === 0) continue;
    
    totalSchools += schools.count;
    totalStations += stations.count;
    
    // Calculate total size (rough estimate)
    const schoolsKB = parseFloat(schools.size) || 0;
    const stationsKB = parseFloat(stations.size) || 0;
    const totalKB = (schoolsKB + stationsKB).toFixed(1);
    
    console.log(
      `${state.padEnd(7)} | ${schools.count.toString().padStart(7)} | ${stations.count.toString().padStart(8)} | ${totalKB.padStart(8)}KB`
    );
  }
  
  console.log('--------|---------|----------|------------');
  console.log(`${'TOTAL'.padEnd(7)} | ${totalSchools.toString().padStart(7)} | ${totalStations.toString().padStart(8)} |`);
  console.log('\n');
  console.log('✅ All data processing complete!');
  console.log('\n📁 Output directory: public/data/{state}/');
  console.log('   - schools.json');
  console.log('   - stations.json');
  console.log('\n');
}

processAll().catch(console.error);
