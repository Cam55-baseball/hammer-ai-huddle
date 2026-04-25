// Phase 10.7/10.8 — Silent launch event tracker + dedupe lock.
// DEV-only console emission; future-ready hook for analytics forwarding.
// Do NOT add scoring or derivation logic here — fire-and-forget only.

import { safeHas, safeSet } from './safeStorage';

export type LaunchEvent =
  | 'NN_COMPLETED'
  | 'STANDARD_MET'
  | 'NIGHT_CHECKIN_COMPLETED'
  | 'DAY_SKIPPED';

export function trackLaunchEvent(
  event: LaunchEvent,
  payload?: Record<string, unknown>,
): void {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[HM-EVENT] ${event}`, payload ?? {});
    }
    // Future: forward to analytics endpoint here without touching call sites.
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
