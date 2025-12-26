/**
 * MapPolyline Component
 * 
 * Renders walking routes on the map from encoded polylines.
 */

import { Polyline } from 'react-leaflet';
import { decodePolyline } from '../../utils/polyline';
import type { POICategory } from '../../types';
import { getPolylineColor } from '../../utils/map-helpers';

interface MapPolylineProps {
  encodedPolyline: string;
  category: POICategory;
  sector?: string; // Keep for compatibility but not used
}

export function MapPolyline({ encodedPolyline, category }: MapPolylineProps) {
  const positions = decodePolyline(encodedPolyline);
  const color = getPolylineColor(category);
  
  return (
    <Polyline
      positions={positions}
      color={color}
      weight={4}
      opacity={0.7}
    />
  );
}
