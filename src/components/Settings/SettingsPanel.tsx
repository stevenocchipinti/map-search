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
    <div className="p-4 bg-white border-t border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">Settings</h3>
      
      <div className="space-y-4">
        {/* Cache Info */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Storage Used</p>
            <p className="text-xs text-gray-600 mt-0.5">Cached data and assets</p>
          </div>
          <span className="text-sm font-semibold text-gray-900">{cacheSize} MB</span>
        </div>

        {/* Clear Cache Button */}
        <Button
          variant="secondary"
          size="md"
          onClick={handleClearCache}
          loading={clearing}
          className="w-full"
        >
          Clear Cache
        </Button>

        {/* About */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            Map Search v1.0.0
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Find schools, train stations, and supermarkets near any address in Australia.
          </p>
        </div>
      </div>
    </div>
  );
}
