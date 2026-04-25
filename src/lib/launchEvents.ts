// Phase 10.7/10.8/11 — Silent launch event tracker + dedupe lock + analytics transport.
// DEV: console emission. PROD: non-blocking POST to analytics-ingest edge function.
// Do NOT add scoring or derivation logic here — fire-and-forget only.

import { safeHas, safeSet } from './safeStorage';

export type LaunchEvent =
  | 'NN_COMPLETED'
  | 'STANDARD_MET'
  | 'NIGHT_CHECKIN_COMPLETED'
  | 'DAY_SKIPPED'
  | 'FEEDBACK';

// Phase 11 — non-blocking transport.
const ANALYTICS_URL = (() => {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
    if (!projectId) return '';
    return `https://${projectId}.supabase.co/functions/v1/analytics-ingest`;
  } catch {
    return '';
  }
})();

function sendToAnalytics(event: LaunchEvent, payload?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    if (!ANALYTICS_URL) return;
    const body = JSON.stringify({ event, payload: payload ?? {}, ts: Date.now() });

    // sendBeacon: fire-and-forget, survives page unload, never blocks UI.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ANALYTICS_URL, blob)) return;
      } catch {
        /* fall through to fetch */
      }
    }

    // Fallback: non-blocking keepalive fetch.
    void fetch(ANALYTICS_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from tracker */
  }
}

export function trackLaunchEvent(
  event: LaunchEvent,
  payload?: Record<string, unknown>,
): void {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[HM-EVENT] ${event}`, payload ?? {});
      // eslint-disable-next-line no-console
      console.log('[HM-ANALYTICS-PAYLOAD]', { event, payload: payload ?? {} });
    }
    if (import.meta.env.PROD) {
      sendToAnalytics(event, payload);
    }
  } catch {
    /* never throw from tracker */
  }
}

// Phase 10.8 — In-memory dedupe set, survives storage failure.
const firedThisSession = new Set<string>();

/**
 * Fire an event at most once per dedupeKey. Returns true if it fired.
 * Safe under spam clicks, double subscriptions, remounts, and storage failure.
 */
export function trackOnce(
  event: LaunchEvent,
  dedupeKey: string,
  payload?: Record<string, unknown>,
): boolean {
  const storageKey = `hm:event:${dedupeKey}`;
  if (firedThisSession.has(storageKey)) return false;
  if (safeHas(storageKey)) {
    firedThisSession.add(storageKey);
    return false;
  }
  firedThisSession.add(storageKey);
  safeSet(storageKey, '1');
  trackLaunchEvent(event, payload);
  return true;
}
