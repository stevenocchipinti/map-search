/**
 * Hook for managing school sector preferences
 * 
 * Persists sector selections (Government/Catholic/Independent) to localStorage
 */

import { useState, useEffect } from 'react';
import type { SchoolSector } from '../types';

const STORAGE_KEY = 'schoolSectors';
const DEFAULT_SECTORS: SchoolSector[] = ['Government', 'Catholic', 'Independent'];

interface SectorPreferencesResult {
  sectors: Set<SchoolSector>;
  toggleSector: (sector: SchoolSector) => void;
  hasAnySectorSelected: boolean;
}

export function useSectorPreferences(): SectorPreferencesResult {
  const [sectors, setSectors] = useState<Set<SchoolSector>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SchoolSector[];
        return new Set(parsed);
      }
    } catch (error) {
      console.error('Failed to load sector preferences:', error);
    }
    return new Set(DEFAULT_SECTORS);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...sectors]));
    } catch (error) {
      console.error('Failed to save sector preferences:', error);
    }
  }, [sectors]);

  const toggleSector = (sector: SchoolSector) => {
    setSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        // Prevent removing all sectors
        if (next.size > 1) {
          next.delete(sector);
        }
      } else {
        next.add(sector);
      }
      return next;
    });
  };

  return {
    sectors,
    toggleSector,
    hasAnySectorSelected: sectors.size > 0,
  };
}
