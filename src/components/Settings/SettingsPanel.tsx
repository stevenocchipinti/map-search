import { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import { SectorCheckboxes } from '../Sidebar/SectorCheckboxes';
import type { SchoolSector } from '../../types';

interface SettingsPanelProps {
  sectors?: Set<SchoolSector>;
  onToggleSector?: (sector: SchoolSector) => void;
}

export function SettingsPanel({ sectors, onToggleSector }: SettingsPanelProps) {
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
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
      <div className="max-w-2xl">        
        <div className="space-y-4">
          {/* School Sector Filters */}
          {sectors && onToggleSector && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900">School Sectors</p>
                <p className="text-xs text-gray-600 mt-1">Filter schools by sector type</p>
              </div>
              <SectorCheckboxes sectors={sectors} onToggle={onToggleSector} />
            </div>
          )}
          
          {/* Cache Info Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Storage Used</p>
                <p className="text-xs text-gray-600 mt-1">Cached data and assets</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{cacheSize} <span className="text-sm font-medium text-gray-600">MB</span></span>
            </div>
            
            {/* Cached States */}
            {cachedStates.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Cached States:</p>
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
          </div>

          {/* Clear Cache Button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleClearCache}
            loading={clearing}
            className="w-full"
          >
            Clear Cache
          </Button>

          {/* About */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">About</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Find schools, train stations, and supermarkets near any address in Australia.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
