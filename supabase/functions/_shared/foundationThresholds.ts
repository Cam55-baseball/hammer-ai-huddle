/**
 * Phase I — CANONICAL Foundation thresholds.
 * Single source of truth shared by frontend (`src/lib/foundationThresholds.ts`
 * re-exports from here) AND every Foundations edge function.
 *
 * No runtime branches. Pure constants only — safe under both Vite and Deno.
 */

export const CRON_STALE_MIN: Record<string, number> = {
  // Cron only calls it while unresolved triggers exist (WHERE EXISTS guard);
  // the monitor skips staleness when the queue is empty.
  'hourly-trigger-decay': 90,
  'daily-trace-prune': 60 * 26,
  'nightly-foundation-health': 60 * 26,
  'recompute-foundation-effectiveness': 60 * 26,
  // Scheduled '5 */4 * * *' — every 4 hours, not hourly.
  'foundation-health-alerts': 60 * 4 + 30,
  'foundation-alert-retention': 60 * 26,
};

export const ALERT = {
  SUPPRESSION_RATE_WARN: 0.55,
  SUPPRESSION_RATE_CRIT: 0.75,
  SUPPRESSION_MIN_SAMPLE: 50,
  /** Holds that are the recommender working as designed — never counted as a problem. */
  SUPPRESSION_BY_DESIGN: ['semantic_duplicate', 'onboarding_gate'] as readonly string[],

  UNRESOLVED_TRIGGERS_WARN: 500,
  UNRESOLVED_TRIGGERS_CRIT: 1500,

  STUCK_TRIGGER_DAYS: 30,
  STUCK_TRIGGER_WARN: 5,
  STUCK_TRIGGER_CRIT: 25,

  REPLAY_MISMATCH_WARN: 0.10,
  REPLAY_MISMATCH_CRIT: 0.25,
  REPLAY_MISMATCH_MIN_SAMPLE: 20,

  HEARTBEAT_MISSING_CRIT_RATIO: 2,
} as const;

export const TRACE_PAGE_SIZE = 100;
export const TRACE_EXPORT_MAX = 10_000;
export const TRACE_EXPORT_CHUNK = 1_000;
export const TRACE_SEARCH_DEBOUNCE_MS = 300;

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

export const ALERT_RETENTION_DAYS = 365;

export type AlertSeverity = 'info' | 'warning' | 'critical';
