import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Subscribes to BroadcastChannel('demo-events') and persists each event into
 * the demo_events table. Fully fire-and-forget; failures are swallowed so
 * telemetry can never break the demo experience.
 *
 * Mount once at the demo root (DemoLayout).
 */
export function useDemoTelemetry() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    if (!user) return; // demo_events requires auth.uid() = user_id

    const ch = new BroadcastChannel('demo-events');

    ch.onmessage = async (e) => {
      try {
        const { type, payload, ts } = e.data ?? {};
        if (typeof type !== 'string') return;
        // Bypass the demo-safe client wrapper by calling supabase directly
        // (demo_events is in DEMO_SAFE_TABLES anyway, so insert is allowed).
        await supabase.from('demo_events').insert({
          user_id: user.id,
          event_type: type,
          metadata: { ...(payload ?? {}), ts: ts ?? Date.now() } as any,
        });
      } catch {
        /* swallow */
      }
    };

    return () => {
      try { ch.close(); } catch { /* noop */ }
    };
  }, [user]);
}
