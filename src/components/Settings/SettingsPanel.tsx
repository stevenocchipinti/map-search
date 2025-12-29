import { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Switch } from '../UI/Switch';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import type { SchoolSector, SchoolType } from '../../types';

interface SettingsPanelProps {
  sectors?: Set<SchoolSector>;
  onToggleSector?: (sector: SchoolSector) => void;
  schoolTypes?: Set<SchoolType>;
  onToggleSchoolType?: (type: SchoolType) => void;
}

const ALL_SECTORS: SchoolSector[] = ['Government', 'Catholic', 'Independent'];
const ALL_TYPES: SchoolType[] = ['Primary', 'Secondary', 'Combined'];

export function SettingsPanel({ sectors, onToggleSector, schoolTypes, onToggleSchoolType }: SettingsPanelProps) {
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [cachedStates, setCachedStates] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);
  const { getCachedStates, clearCache: clearServiceWorkerCache } = useServiceWorker();

  useEffect(() => {
    updateCacheInfo();
  }, []);

  const updateCacheInfo = async () => {
    // Get cache size
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        setCacheSize(Math.round(used / 1024 / 1024 * 10) / 10); // MB with 1 decimal
      } catch (error) {
        console.error('Failed to estimate storage:', error);
      }
    }
    
    // Get cached states
    try {
      const states = await getCachedStates();
      setCachedStates(states);
    } catch (error) {
      console.error('Failed to get cached states:', error);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      // Use the service worker hook to clear cache
      await clearServiceWorkerCache();
      
      // Clear localStorage
      localStorage.clear();
      
      await updateCacheInfo();
      
      // Show success message
      alert('Cache cleared successfully! The page will reload.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl space-y-6 p-5 min-h-full">
        {/* School Filters Section */}
        {sectors && onToggleSector && schoolTypes && onToggleSchoolType && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">School Filters</h3>
            <div className="space-y-3">
              {/* Sector Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">Sector</p>
                <div className="space-y-2">
                  {ALL_SECTORS.map((sector) => (
                    <label
                      key={sector}
                      htmlFor={`sector-${sector.toLowerCase()}`}
                      className="flex items-center justify-between cursor-pointer py-1"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {sector}
                      </span>
                      <Switch
                        id={`sector-${sector.toLowerCase()}`}
                        checked={sectors.has(sector)}
                        onCheckedChange={() => onToggleSector(sector)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Level Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">Level</p>
                <div className="space-y-2">
                  {ALL_TYPES.map((type) => (
                    <label
                      key={type}
                      htmlFor={`type-${type.toLowerCase()}`}
                      className="flex items-center justify-between cursor-pointer py-1"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {type}
                      </span>
                      <Switch
                        id={`type-${type.toLowerCase()}`}
                        checked={schoolTypes.has(type)}
                        onCheckedChange={() => onToggleSchoolType(type)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Storage Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Storage</h3>
          <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Used</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{cacheSize} <span className="text-sm font-medium text-gray-600">MB</span></span>
            </div>
            
            {/* Cached States */}
            {cachedStates.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Cached States</p>
                <div className="flex flex-wrap gap-2">
                  {cachedStates.map(state => (
                    <span 
                      key={state} 
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {cachedStates.length === 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">No state data cached yet. Search for an address to cache data for offline use.</p>
              </div>
            )}

            {/* Clear Cache Button */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                size="md"
                onClick={handleClearCache}
                loading={clearing}
                className="w-full"
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
