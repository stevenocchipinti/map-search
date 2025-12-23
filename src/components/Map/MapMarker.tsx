/**
 * MapMarker Component
 * 
 * Custom marker for displaying POIs on the map with appropriate styling.
 */

import { Marker } from 'react-leaflet';
import type { POICategory, SchoolSector } from '../../types';
import { createMarkerIcon } from '../../utils/map-helpers';

interface MapMarkerProps {
  position: [number, number];
  type: POICategory | 'user';
  selected?: boolean;
  sector?: SchoolSector;
  isAlternative?: boolean;
  onClick?: () => void;
}

export function MapMarker({ 
  position, 
  type, 
  selected = false, 
  sector, 
  isAlternative = false,
  onClick 
}: MapMarkerProps) {
  const icon = createMarkerIcon(type, selected, sector, isAlternative);
  
  return (
    <Marker 
      position={position} 
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
    />
  );
}
