/**
 * MapPolyline Component
 * 
 * Renders walking routes on the map from encoded polylines.
 */

import { Polyline } from 'react-leaflet';
import { decodePolyline } from '../../utils/polyline';
import type { POICategory, SchoolSector } from '../../types';
import { getPolylineColor } from '../../utils/map-helpers';

interface MapPolylineProps {
  encodedPolyline: string;
  category: POICategory;
  sector?: SchoolSector;
}

export function MapPolyline({ encodedPolyline, category, sector }: MapPolylineProps) {
  const positions = decodePolyline(encodedPolyline);
  const color = getPolylineColor(category, sector);
  
  return (
    <Polyline
      positions={positions}
      color={color}
      weight={4}
      opacity={0.7}
    />
  );
}
