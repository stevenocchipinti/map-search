/**
 * Polyline Decoder
 *
 * Decodes Google's encoded polyline format into an array of lat/lng coordinates.
 * Used for rendering walking routes on the map.
 */

/**
 * Decodes an encoded polyline string into an array of [lat, lng] coordinates
 *
 * @param encoded - The encoded polyline string from OpenRouteService
 * @param precision - The precision factor (default: 5 for standard polylines)
 * @returns Array of [latitude, longitude] tuples
 */
export function decodePolyline(
  encoded: string,
  precision: number = 5
): [number, number][] {
  const factor = Math.pow(10, precision)
  const coordinates: [number, number][] = []

  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    // Decode longitude
    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / factor, lng / factor])
  }

  return coordinates
}
