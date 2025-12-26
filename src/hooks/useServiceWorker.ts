/**
 * Hook for service worker management
 * 
 * Phase 6: Full service worker registration and lifecycle management
 */

import { useState, useEffect } from 'react';

interface ServiceWorkerResult {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  installing: boolean;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  getCachedStates: () => Promise<string[]>;
}

export function useServiceWorker(): ServiceWorkerResult {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Only register in production or when explicitly enabled
    if ('serviceWorker' in navigator && (import.meta.env.PROD || import.meta.env.VITE_SW_DEV === 'true')) {
      registerServiceWorker();
    } else {
      console.log('[SW Hook] Service worker not registered (dev mode or not supported)');
    }

    // Cleanup on unmount
    return () => {
      // No cleanup needed - service worker persists beyond component lifecycle
    };
  }, []);

  /**
   * Register the service worker
   */
  async function registerServiceWorker() {
    try {
      console.log('[SW Hook] Registering service worker...');
      
      const reg = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      setRegistration(reg);
      console.log('[SW Hook] Service worker registered:', reg);

      // Set initial installing state
      if (reg.installing) {
        setInstalling(true);
        reg.installing.addEventListener('statechange', handleStateChange);
      }

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        console.log('[SW Hook] Update found');
        const newWorker = reg.installing;
        
        if (newWorker) {
          setInstalling(true);
          
          newWorker.addEventListener('statechange', () => {
            console.log('[SW Hook] New worker state:', newWorker.state);
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              setUpdateAvailable(true);
              setInstalling(false);
              console.log('[SW Hook] Update available - reload to activate');
            } else if (newWorker.state === 'activated') {
              setInstalling(false);
            }
          });
        }
      });

      // Check for updates periodically (every 5 minutes)
      setInterval(() => {
        console.log('[SW Hook] Checking for updates...');
        reg.update();
      }, 5 * 60 * 1000);

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Hook] Controller changed - reloading page');
        window.location.reload();
      });

    } catch (error) {
      console.error('[SW Hook] Service worker registration failed:', error);
    }
  }

  /**
   * Handle service worker state changes
   */
  function handleStateChange(event: Event) {
    const worker = event.target as ServiceWorker;
    console.log('[SW Hook] Worker state changed:', worker.state);
    
    if (worker.state === 'activated') {
      setInstalling(false);
    }
  }

  /**
   * Trigger service worker update
   */
  const update = async (): Promise<void> => {
    if (!registration) {
      console.warn('[SW Hook] No registration available for update');
      return;
    }
    
    try {
      console.log('[SW Hook] Triggering update check...');
      await registration.update();
      
      // If new worker is available, tell it to skip waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('[SW Hook] Service worker update failed:', error);
    }
  };

  /**
   * Clear all caches
   */
  const clearCache = async (): Promise<void> => {
    if (!('caches' in window)) {
      console.warn('[SW Hook] Cache API not available');
      return;
    }

    try {
      console.log('[SW Hook] Clearing all caches...');
      
      // Send message to service worker to clear caches
      if (registration && registration.active) {
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              console.log('[SW Hook] Caches cleared successfully');
              resolve();
            } else {
              reject(new Error('Cache clear failed'));
            }
          };
          
          registration.active?.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
          );
        });
      } else {
        // Fallback: Clear caches directly
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SW Hook] All caches cleared (fallback method)');
      }
    } catch (error) {
      console.error('[SW Hook] Cache clearing failed:', error);
      throw error;
    }
  };

  /**
   * Get total cache size
   */
  const getCacheSize = async (): Promise<number> => {
    if (!('caches' in window)) {
      console.warn('[SW Hook] Cache API not available');
      return 0;
    }

    try {
      // Ask service worker for cache size
      if (registration && registration.active) {
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.size || 0);
          };
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(0), 5000);
          
          registration.active?.postMessage(
            { type: 'GET_CACHE_SIZE' },
            [messageChannel.port2]
          );
        });
      } else {
        // Fallback: Calculate cache size directly
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }

        return totalSize;
      }
    } catch (error) {
      console.error('[SW Hook] Cache size calculation failed:', error);
      return 0;
    }
  };

  /**
   * Get list of cached states
   */
  const getCachedStates = async (): Promise<string[]> => {
    if (!('caches' in window)) {
      console.warn('[SW Hook] Cache API not available');
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const dataCache = cacheNames.find(name => name.includes('map-search-data'));
      
      if (!dataCache) {
        return [];
      }

      const cache = await caches.open(dataCache);
      const keys = await cache.keys();
      
      // Extract state codes from cached URLs
      const statePattern = /\/data\/([a-z]+)\/(schools|stations)\.json$/;
      const states = new Set<string>();
      
      keys.forEach(request => {
        const match = request.url.match(statePattern);
        if (match) {
          states.add(match[1].toUpperCase());
        }
      });
      
      return Array.from(states).sort();
    } catch (error) {
      console.error('[SW Hook] Failed to get cached states:', error);
      return [];
    }
  };

  return {
    registration,
    updateAvailable,
    installing,
    update,
    clearCache,
    getCacheSize,
    getCachedStates,
  };
}
