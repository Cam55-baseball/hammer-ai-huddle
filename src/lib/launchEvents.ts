// Phase 10.7 — Silent launch event tracker.
// DEV-only console emission; future-ready hook for analytics forwarding.
// Do NOT add scoring or derivation logic here — fire-and-forget only.

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
