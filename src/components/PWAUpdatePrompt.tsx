import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

const RELOAD_FLAG = '__sw_reloaded_once';

/**
 * Shows a brief confirmation toast immediately after the service worker
 * auto-reload completes, so users know why the page just refreshed.
 *
 * The actual update + reload is fully automatic (see src/registerSW.ts);
 * no user action is required.
 */
export function PWAUpdatePrompt() {
  useEffect(() => {
    let didReload = false;
    try {
      didReload = sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (didReload) sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }

    if (didReload) {
      toast({
        title: 'Updated to latest version',
        description: 'You\'re now running the newest build.',
        duration: 2500,
      });
    }
  }, []);

  return null;
}
