import { useEffect, useRef, useState } from 'react';
import { logDemoEvent } from '@/demo/guard';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function key(from: string, simId: string) {
  return `demo_urgency_${from}_${simId}`;
}

export function useDemoUrgency(from: string, simId: string) {
  const startedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(key(from, simId));
      if (raw) return parseInt(raw, 10);
    } catch { /* noop */ }
    return Date.now();
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key(from, simId));
      if (!raw) {
        sessionStorage.setItem(key(from, simId), String(startedAt));
        if (!startedRef.current) {
          logDemoEvent('urgency_started', { from, simId });
          startedRef.current = true;
        }
      }
    } catch { /* noop */ }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, simId]);

  const remainingMs = Math.max(0, startedAt + WINDOW_MS - now);
  const expired = remainingMs <= 0;
  return { remainingMs, expired, startedAt, reset: () => {
    const t = Date.now();
    setStartedAt(t);
    try { sessionStorage.setItem(key(from, simId), String(t)); } catch { /* noop */ }
  } };
}

export function formatMmSs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
