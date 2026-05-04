import { useEffect, useRef } from 'react';
import { useDemoProgress } from '@/hooks/useDemoProgress';

/**
 * Tracks shell interactions + dwell time on a submodule slug.
 * Returns a `bump()` function shells call on every meaningful input change (debounced server-side).
 */
export function useDemoInteract(submoduleSlug: string) {
  const { bumpInteraction, addDwell } = useDemoProgress();
  const start = useRef<number>(performance.now());
  const flushed = useRef(false);

  useEffect(() => {
    flushed.current = false;
    start.current = performance.now();

    const flush = () => {
      if (flushed.current) return;
      const ms = Math.min(5 * 60 * 1000, performance.now() - start.current);
      if (ms > 1000) addDwell(submoduleSlug, ms);
      flushed.current = true;
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submoduleSlug]);

  return { bump: () => bumpInteraction(submoduleSlug) };
}
