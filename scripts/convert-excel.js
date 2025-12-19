import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sector code mapping
const sectorMap = {
  'G': 'Government',
  'Government': 'Government',
  'C': 'Catholic',
  'Catholic': 'Catholic',
  'I': 'Independent',
  'Independent': 'Independent'
};

// Read the Excel file
const excelPath = join(__dirname, '../public/School Location 2024.xlsx');
const workbook = readFile(excelPath);

// Get the SchoolLocations sheet
const sheetName = 'SchoolLocations 2024';
const worksheet = workbook.Sheets[sheetName];

if (!worksheet) {
  console.error(`Sheet "${sheetName}" not found!`);
  console.log('Available sheets:', workbook.SheetNames);
  process.exit(1);
}

// Convert to JSON
const rawData = utils.sheet_to_json(worksheet);

console.log(`Found ${rawData.length} rows in Excel file`);

// Transform the data
const schools = rawData
  .map((row, index) => {
    const sectorCode = row['School Sector'];
    const sector = sectorMap[sectorCode];
    
    if (!sector) {
      console.warn(`Unknown sector code "${sectorCode}" at row ${index + 2}`);
      return null;
    }
    
    const latitude = parseFloat(row['Latitude']);
    const longitude = parseFloat(row['Longitude']);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn(`Invalid coordinates at row ${index + 2}: lat=${row['Latitude']}, lng=${row['Longitude']}`);
      return null;
    }
    
    return {
      name: row['School Name']?.trim() || '',
      suburb: row['Suburb']?.trim() || '',
      state: row['State']?.trim() || '',
      postcode: String(row['Postcode'] || '').trim(),
      sector,
      type: row['School Type']?.trim() || '',
      latitude,
      longitude
    };
  })
  .filter(school => school !== null);

console.log(`\nProcessed ${schools.length} valid schools`);

// Count by sector
const sectorCounts = schools.reduce((acc, school) => {
  acc[school.sector] = (acc[school.sector] || 0) + 1;
  return acc;
}, {});

console.log('\nSchools by sector:');
Object.entries(sectorCounts).forEach(([sector, count]) => {
  console.log(`  ${sector}: ${count}`);
});

// Count by state
const stateCounts = schools.reduce((acc, school) => {
  acc[school.state] = (acc[school.state] || 0) + 1;
  return acc;
}, {});

console.log('\nSchools by state:');
Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).forEach(([state, count]) => {
  console.log(`  ${state}: ${count}`);
});

// Write to JSON file
const outputPath = join(__dirname, '../public/schools.json');
writeFileSync(outputPath, JSON.stringify(schools, null, 2));

console.log(`\nWritten to ${outputPath}`);
console.log(`File size: ${(JSON.stringify(schools).length / 1024).toFixed(2)} KB`);
