import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'demo_session_id';

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Subscribes to BroadcastChannel('demo-events') and persists each event into
 * the demo_events table. A stable per-tab session_id is attached to every row
 * so a user's full demo journey can be replayed via useDemoReplay.
 *
 * Mount once at the demo root (DemoLayout).
 */
export function useDemoTelemetry() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(getOrCreateSessionId());

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    if (!user) return; // demo_events RLS requires auth.uid() = user_id

    const ch = new BroadcastChannel('demo-events');
    const sessionId = sessionIdRef.current;

    ch.onmessage = async (e) => {
      try {
        const { type, payload, ts } = e.data ?? {};
        if (typeof type !== 'string') return;
        await supabase.from('demo_events').insert({
          user_id: user.id,
          session_id: sessionId,
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

/** Read the current demo session id (or null in non-browser contexts). */
export function getDemoSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
