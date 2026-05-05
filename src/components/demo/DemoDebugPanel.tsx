import { useEffect, useRef, useState } from 'react';
import { getDemoSessionId } from '@/demo/useDemoTelemetry';

interface Props {
  progress: any;
}

interface RingEvent { type: string; ts: number }

/**
 * Toggleable real-time inspector for the demo system.
 * Enable via console: localStorage.setItem('demo_debug', '1') and reload.
 *
 * Shows: completion %, demo state, session id, last 5 events (live, in-memory).
 */
export function DemoDebugPanel({ progress }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [recent, setRecent] = useState<RingEvent[]>([]);
  const ringRef = useRef<RingEvent[]>([]);

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
      ringRef.current = [{ type, ts: ts ?? Date.now() }, ...ringRef.current].slice(0, 5);
      setRecent([...ringRef.current]);
    };
    return () => { try { ch.close(); } catch { /* noop */ } };
  }, [enabled]);

  if (!enabled) return null;

  const sessionId = getDemoSessionId();
  const presHistCount = progress?.prescribed_history
    ? Object.keys(progress.prescribed_history).length
    : 0;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] w-[300px] rounded-md border border-border bg-card/95 p-2 text-[10px] shadow-lg backdrop-blur">
      <p className="mb-1 font-black uppercase tracking-wide text-muted-foreground">Demo Inspector</p>
      <Row label="Completion" value={`${progress?.completion_pct ?? 0}%`} />
      <Row label="State" value={progress?.demo_state ?? '—'} />
      <Row label="Session" value={sessionId ? sessionId.slice(0, 8) + '…' : '—'} />
      <Row label="Sim history" value={String(presHistCount)} />
      <p className="mt-2 mb-0.5 font-bold uppercase tracking-wide text-muted-foreground">Last events</p>
      {recent.length === 0 ? (
        <p className="text-muted-foreground">(none yet)</p>
      ) : (
        <ul className="space-y-0.5">
          {recent.map((e, i) => (
            <li key={i} className="flex justify-between gap-2 truncate">
              <span className="truncate font-mono">{e.type}</span>
              <span className="shrink-0 text-muted-foreground">
                {new Date(e.ts).toLocaleTimeString([], { hour12: false })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono font-bold">{value}</span>
    </div>
  );
}
