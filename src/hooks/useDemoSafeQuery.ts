import { useEffect, useRef, useState } from 'react';
import { useDemoMode } from '@/contexts/DemoModeContext';

// In demo mode, returns the fixture; otherwise returns the live result.
// `live` is optional because most demo shells don't need a real path.
export function useDemoSafeQuery<T>(
  key: string,
  fixture: T | (() => T | Promise<T>),
  live?: () => Promise<T>,
): { data: T | null; loading: boolean; isDemo: boolean } {
  const { isDemo } = useDemoMode();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setLoading(true);
    (async () => {
      try {
        if (isDemo) {
          const v = typeof fixture === 'function' ? await (fixture as () => T | Promise<T>)() : fixture;
          if (!cancelled.current) setData(v);
        } else if (live) {
          const v = await live();
          if (!cancelled.current) setData(v);
        }
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    })();
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isDemo]);

  return { data, loading, isDemo };
}
