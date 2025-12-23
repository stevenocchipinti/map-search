// Australian States
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

// School Types
export type SchoolSector = 'Government' | 'Catholic' | 'Independent';
export type SchoolType = 'Primary' | 'Secondary' | 'Combined';

export interface School {
  name: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  sector: SchoolSector;
  type: SchoolType;
  latitude: number;
  longitude: number;
}

// Station Types
export interface Station {
  name: string;
  state: AustralianState;
  latitude: number;
  longitude: number;
}

// Supermarket Types
export interface Supermarket {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

// POI (Point of Interest) Types
export type POICategory = 'school' | 'station' | 'supermarket';

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  latitude: number;
  longitude: number;
  distance: number; // Haversine distance in km
  estimatedWalkingTime: number; // Estimated minutes based on distance
  details?: string; // Suburb, sector, etc.
  sector?: SchoolSector; // For schools
}

// Walking Route Types
export interface WalkingRoute {
  duration: number; // Accurate walking time in minutes from API
  distance: number; // Distance in meters
  polyline: string; // Encoded polyline from OpenRouteService
}

export interface RouteRequest {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  category: POICategory;
  itemId: string;
}

// Search Types
export interface SearchLocation {
  lat: number;
  lng: number;
  state: AustralianState;
  displayName: string;
}

export interface SearchResponse {
  location: SearchLocation;
  schools: POI[];
  stations: POI[];
  supermarkets: POI[];
}

// API Response Types
export interface GeocodeResponse {
  lat: number;
  lng: number;
  state: AustralianState;
  displayName: string;
  error?: string;
}

export interface SupermarketsResponse {
  supermarkets: POI[];
  error?: string;
}

export interface WalkingRoutesResponse {
  routes: (WalkingRoute | null)[];
  error?: string;
}

// Cache Types
export interface CachedRoute {
  route: WalkingRoute;
  timestamp: number;
}

export interface CachedSearch {
  address: string;
  location: SearchLocation;
  timestamp: number;
}

// Map State Types
export interface MapState {
  center: [number, number];
  zoom: number;
}

export interface SelectedPOIs {
  school: number;
  station: number;
  supermarket: number;
}

// UI State Types
export interface UIState {
  sidebarCollapsed: boolean;
  alternativesExpanded: {
    school: boolean;
    station: boolean;
    supermarket: boolean;
  };
}
