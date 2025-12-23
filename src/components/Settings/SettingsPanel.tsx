import { useState, useEffect } from 'react';
import { Button } from '../UI/Button';

export function SettingsPanel() {
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    updateCacheSize();
  }, []);

  const updateCacheSize = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        setCacheSize(Math.round(used / 1024 / 1024 * 10) / 10); // MB with 1 decimal
      } catch (error) {
        console.error('Failed to estimate storage:', error);
      }
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage
      localStorage.clear();
      
      await updateCacheSize();
      
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
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Settings</h3>
        
        <div className="space-y-4">
          {/* Cache Info Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Storage Used</p>
                <p className="text-xs text-gray-600 mt-1">Cached data and assets</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{cacheSize} <span className="text-sm font-medium text-gray-600">MB</span></span>
            </div>
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
