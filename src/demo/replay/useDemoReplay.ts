import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DemoReplayEvent {
  id: number;
  user_id: string;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Loads every demo_events row for a session id, in order.
 * Read-only; uses the raw client so admin/debug routes can introspect any session
 * (RLS still restricts to rows the caller can see).
 */
export function useDemoReplay(sessionId: string | null | undefined) {
  const [events, setEvents] = useState<DemoReplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('demo_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setEvents([]);
        } else {
          setEvents((data ?? []) as DemoReplayEvent[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  return { events, loading, error };
}
