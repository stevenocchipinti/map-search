/**
 * Hook for PWA install prompt
 * 
 * Manages the beforeinstallprompt event and provides install functionality
 */

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptResult {
  installable: boolean;
  installed: boolean;
  promptInstall: () => Promise<void>;
  dismissPrompt: () => void;
}

export function useInstallPrompt(): InstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      console.log('[Install Prompt] App already installed');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default browser install prompt
      e.preventDefault();
      
      console.log('[Install Prompt] beforeinstallprompt event fired');
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      setInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[Install Prompt] App installed');
      setInstalled(true);
      setInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Show the install prompt
   */
  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('[Install Prompt] No deferred prompt available');
      return;
    }

    try {
      console.log('[Install Prompt] Showing install prompt');
      await deferredPrompt.prompt();
      
      const choiceResult = await deferredPrompt.userChoice;
      console.log('[Install Prompt] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[Install Prompt] User accepted installation');
      } else {
        console.log('[Install Prompt] User dismissed installation');
      }
      
      // Clear the deferred prompt after use
      setDeferredPrompt(null);
      setInstallable(false);
    } catch (error) {
      console.error('[Install Prompt] Failed to show prompt:', error);
    }
  };

  /**
   * Dismiss the install prompt (user explicitly declined)
   */
  const dismissPrompt = (): void => {
    console.log('[Install Prompt] User dismissed prompt');
    setInstallable(false);
    // Keep deferredPrompt in case user changes mind
  };

  return {
    installable,
    installed,
    promptInstall,
    dismissPrompt,
  };
}
