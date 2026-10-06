import { useEffect, useState } from 'react';
import { getDemoSessionId } from '@/demo/useDemoTelemetry';

interface Props {
  progress: any;
}

/**
 * Toggleable console-only inspector for the demo system.
 * Enable via console: localStorage.setItem('demo_debug', '1') and reload.
 *
 * Internal demo state and events must never render in the app.
 */
export function DemoDebugPanel({ progress }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    setEnabled(localStorage.getItem('demo_debug') === '1');
  }, []);

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('demo-events');
    ch.onmessage = (e) => {
      const { type, ts } = e.data ?? {};
      if (typeof type !== 'string') return;
      console.debug('[demo inspector event]', { type, ts: ts ?? Date.now() });
    };
    return () => { try { ch.close(); } catch { /* noop */ } };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    console.debug('[demo inspector]', {
      completion: progress?.completion_pct ?? 0,
      state: progress?.demo_state ?? null,
      session: getDemoSessionId(),
      simHistory: Object.keys(progress?.prescribed_history ?? {}).length,
    });
  }, [enabled, progress]);

  return null;
}
