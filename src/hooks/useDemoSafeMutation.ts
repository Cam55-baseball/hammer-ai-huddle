import { useCallback } from 'react';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Wraps a real mutation. In demo mode it short-circuits, logs the blocked attempt,
// and returns a synthetic success.
export function useDemoSafeMutation<TArgs extends unknown[], TResult>(
  realFn: (...args: TArgs) => Promise<TResult>,
  opName = 'unknown',
) {
  const { isDemo } = useDemoMode();
  const { user } = useAuth();

  return useCallback(
    async (...args: TArgs): Promise<TResult | { ok: true; demo: true }> => {
      if (isDemo) {
        if (user) {
          // Fire-and-forget telemetry
          void supabase.from('demo_events').insert([{
            user_id: user.id,
            event_type: 'sim_write_blocked',
            metadata: { op: opName } as any,
          }]);
        }
        return { ok: true, demo: true };
      }
      return realFn(...args);
    },
    [isDemo, user, realFn, opName],
  );
}
