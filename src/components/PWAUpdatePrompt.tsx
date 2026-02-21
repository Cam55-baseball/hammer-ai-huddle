import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { getWaitingSW } from '@/registerSW';

export function PWAUpdatePrompt() {
  useEffect(() => {
    const handler = () => {
      toast({
        title: 'Update Available',
        description: 'A new version is ready. Tap to update.',
        duration: 0,
        action: (
          <button
            className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
            onClick={() => {
              const sw = getWaitingSW();
              if (sw) {
                sw.postMessage({ type: 'SKIP_WAITING' });
              }
              window.location.reload();
            }}
          >
            Update
          </button>
        ),
      });
    };

    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  return null;
}
