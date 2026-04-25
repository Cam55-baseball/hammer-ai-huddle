import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Watches custom_activity_logs for the current user. When a log
 * transitions to completion_state='completed', fires the engine
 * functions so identity + hammer state update within seconds —
 * no waiting for the hourly cron.
 *
 * Throttled to one trigger per 8s to avoid storms.
 */
export function useEngineRecomputeTrigger() {
  const { user } = useAuth();
  const lastFire = useRef(0);

  useEffect(() => {
    if (!user) return;

    const fire = () => {
      const now = Date.now();
      if (now - lastFire.current < 8000) return;
      lastFire.current = now;

      // Fire-and-forget — both are idempotent, both write snapshots
      supabase.functions
        .invoke('compute-hammer-state', { body: { user_id: user.id } })
        .catch((e) => console.warn('[engine-recompute] hammer failed', e));
      supabase.functions
        .invoke('evaluate-behavioral-state', { body: { user_id: user.id } })
        .catch((e) => console.warn('[engine-recompute] behavioral failed', e));
    };

    const channel = supabase
      .channel(`engine-trigger-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'custom_activity_logs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as any)?.completion_state === 'completed') fire();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'custom_activity_logs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as any)?.completion_state;
          const prev = (payload.old as any)?.completion_state;
          if (next === 'completed' && prev !== 'completed') fire();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
}
