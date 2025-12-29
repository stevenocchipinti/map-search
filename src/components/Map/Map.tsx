/**
 * Map Component
 * 
 * Leaflet map container with Carto tiles for visualizing search results and walking routes.
 */

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { LatLngBounds } from 'leaflet';

interface MapProps {
  center: [number, number];
  zoom: number;
  bounds?: LatLngBounds | null;
  children?: ReactNode;
}

/**
 * MapController - Updates map view when center/zoom/bounds change
 * This is needed because MapContainer only accepts center/zoom as initial props
 */
function MapController({ center, zoom, bounds }: { center: [number, number]; zoom: number; bounds?: LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      // If bounds are provided, fit the map to show all POIs
      // Minimal padding and max zoom for testing
      map.fitBounds(bounds, { padding: [10, 10], maxZoom: 19 });
    } else {
      // Otherwise, just set center and zoom
      map.setView(center, zoom);
    }
  }, [map, center, zoom, bounds]);

  return null;
}

export function Map({ center, zoom, bounds, children }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      scrollWheelZoom={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <MapController center={center} zoom={zoom} bounds={bounds} />
      {children}
    </MapContainer>
  );
}
