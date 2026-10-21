#!/usr/bin/env tsx

/**
 * Builds public/data/vic/supermarkets.json from BBBike's OpenStreetMap
 * extract for Melbourne. States without a file simply show no supermarkets
 * in the app.
 *
 * The extract (~130MB, xz-compressed GeoJSON with one feature per line) is
 * kept in data-sources/supermarkets/ so re-running doesn't download it again.
 * Pass --refresh to download a fresh copy (BBBike rebuilds it weekly).
 *
 * Requires the `xz` command (macOS: `brew install xz`).
 *
 * BBBike's Melbourne area is roughly Werribee to Ringwood and Craigieburn
 * to Mordialloc: https://download.bbbike.org/osm/bbbike/Melbourne/
 */

import { spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"
import { Readable } from "stream"
import { pipeline } from "stream/promises"

type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT"

type Position = [number, number]

interface Feature {
  geometry: {
    type: string
    coordinates: unknown
  }
  properties: Record<string, string>
}

interface Supermarket {
  id: string
  name: string
  suburb?: string
  postcode?: string
  state: AustralianState
  latitude: number
  longitude: number
}

const EXTRACT_URL =
  "https://download.bbbike.org/osm/bbbike/Melbourne/Melbourne.osm.geojson.xz"
const USER_AGENT =
  "local-search-data-build/1.0 (+https://local-search-map.vercel.app)"
const STATE: AustralianState = "VIC"

const RAW_PATH = path.join(
  process.cwd(),
  "data-sources/supermarkets/Melbourne.osm.geojson.xz"
)

async function downloadExtract(refresh: boolean): Promise<void> {
  if (!refresh && fs.existsSync(RAW_PATH)) {
    console.log(`  ↺ Using cached ${path.relative(process.cwd(), RAW_PATH)}`)
    return
  }

  console.log(`  ⬇️  Downloading ${EXTRACT_URL} (~130MB)...`)
  const response = await fetch(EXTRACT_URL, {
    headers: { "User-Agent": USER_AGENT },
  })
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: HTTP ${response.status}`)
  }

  fs.mkdirSync(path.dirname(RAW_PATH), { recursive: true })
  const partialPath = `${RAW_PATH}.partial`
  await pipeline(
    Readable.fromWeb(response.body as import("stream/web").ReadableStream),
    fs.createWriteStream(partialPath)
  )
  fs.renameSync(partialPath, RAW_PATH)
}

/** Stream the extract through `xz` and yield supermarket features. */
async function* readSupermarketFeatures(): AsyncGenerator<Feature> {
  const xz = spawn("xz", ["-dc", RAW_PATH], { stdio: ["ignore", "pipe", "inherit"] })
  const exited = new Promise<void>((resolve, reject) => {
    xz.on("error", error =>
      reject(new Error(`Could not run xz (brew install xz): ${error.message}`))
    )
    xz.on("close", code =>
      code === 0 ? resolve() : reject(new Error(`xz exited with code ${code}`))
    )
  })

  const lines = readline.createInterface({ input: xz.stdout, crlfDelay: Infinity })
  for await (const line of lines) {
    // Cheap check before parsing; almost every line is something else
    if (!line.includes('"shop":"supermarket"')) continue

    const feature = JSON.parse(line.replace(/,\s*$/, "")) as Feature
    if (feature.properties?.shop === "supermarket") yield feature
  }

  await exited
}

/** Collect every [lng, lat] position in a GeoJSON geometry. */
function positionsOf(coordinates: unknown): Position[] {
  if (
    Array.isArray(coordinates) &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return [coordinates as Position]
  }
  return Array.isArray(coordinates) ? coordinates.flatMap(positionsOf) : []
}

/** Centre of the feature's bounding box (buildings are outlines, not points). */
function centreOf(feature: Feature): { latitude: number; longitude: number } | null {
  const positions = positionsOf(feature.geometry.coordinates)
  if (positions.length === 0) return null

  const lngs = positions.map(([lng]) => lng)
  const lats = positions.map(([, lat]) => lat)
  return {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  }
}

/**
 * Build a display name with location context so nearby branches of the same
 * chain can be told apart. Priority: Suburb > Street > Branch > Postcode.
 */
function formatName(tags: Record<string, string>): string {
  const baseName = tags.name || tags.brand || "Supermarket"

  // Remove store numbers/branch suffixes from base name
  const cleanName =
    baseName
      .replace(/\s+(Store|Branch|Outlet)\s*#?\d+/gi, "")
      .replace(/\s+#?\d+$/g, "")
      .trim() || baseName

  const fullName = tags.full_name
  if (fullName && fullName !== baseName && fullName.includes(baseName)) {
    return fullName
  }

  const suburb = tags["addr:suburb"] || tags["addr:city"]
  if (suburb) return `${cleanName} - ${suburb}`

  const street = tags["addr:street"]
  if (street) {
    // Drop "Street", "Road", etc. for brevity
    const shortStreet = street.replace(
      /\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Boulevard|Blvd)$/i,
      ""
    )
    return `${cleanName} - ${shortStreet}`
  }

  if (tags.branch) return `${cleanName} - ${tags.branch}`
  if (tags["addr:postcode"]) return `${cleanName} - ${tags["addr:postcode"]}`

  return cleanName
}

function toSupermarket(feature: Feature): Supermarket | null {
  const centre = centreOf(feature)
  if (!centre) return null

  // 6 decimal places is ~10cm, plenty for walking distances
  const latitude = Number(centre.latitude.toFixed(6))
  const longitude = Number(centre.longitude.toFixed(6))
  const tags = feature.properties

  const supermarket: Supermarket = {
    // The extract has no OSM ids, so derive a stable one from the location
    id: `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
    name: formatName(tags),
    state: STATE,
    latitude,
    longitude,
  }

  const suburb = tags["addr:suburb"] || tags["addr:city"]
  if (suburb) supermarket.suburb = suburb
  if (tags["addr:postcode"]) supermarket.postcode = tags["addr:postcode"]

  return supermarket
}

async function processSupermarkets() {
  console.log("🛒 Processing supermarkets data...\n")

  const refresh = process.argv.includes("--refresh")
  await downloadExtract(refresh)

  // Keyed by id: a shop mapped as both a point and a building collapses to one
  const supermarkets = new Map<string, Supermarket>()
  for await (const feature of readSupermarketFeatures()) {
    const supermarket = toSupermarket(feature)
    if (supermarket) supermarkets.set(supermarket.id, supermarket)
  }

  const outputDir = path.join(process.cwd(), `public/data/${STATE.toLowerCase()}`)
  fs.mkdirSync(outputDir, { recursive: true })
  const json = JSON.stringify([...supermarkets.values()], null, 2)
  fs.writeFileSync(path.join(outputDir, "supermarkets.json"), json)

  const sizeKB = (json.length / 1024).toFixed(1)
  console.log(`  ✓ ${STATE}: ${supermarkets.size} supermarkets → ${sizeKB}KB`)
  console.log("\n✅ Supermarkets processing complete!\n")

  return { [STATE]: { count: supermarkets.size, size: `${sizeKB}KB` } }
}

export { processSupermarkets }

// Run directly (npm run data:supermarkets)
if (import.meta.url === `file://${process.argv[1]}`) {
  processSupermarkets().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
