/**
 * Phase H — Centralized Foundation thresholds.
 * Single source of truth for every operational constant in the
 * Foundations engine UI + admin tooling. No magic numbers in components.
 *
 * MIRROR WARNING: Edge function `foundation-health-alerts` keeps a small
 * mirror block of the ALERT + CRON_STALE_MIN values at the top of its file,
 * because Deno cannot import from `src/`. Update both when tuning.
 */

// Cron staleness — minutes since the last heartbeat before status flips.
export const CRON_STALE_MIN: Record<string, number> = {
  'hourly-trigger-decay': 90,                  // runs every 1h, allow 1.5x
  'daily-trace-prune': 60 * 26,                // runs daily, allow 26h
  'nightly-foundation-health': 60 * 26,        // runs daily
  'recompute-foundation-effectiveness': 60 * 26,
  'foundation-health-alerts': 90,              // runs hourly, allow 1.5x
};

// Health-alert thresholds. Severity escalates when the CRIT line is crossed.
export const ALERT = {
  SUPPRESSION_RATE_WARN: 0.55,        // >55% of surfacings suppressed in 24h
  SUPPRESSION_RATE_CRIT: 0.75,
  SUPPRESSION_MIN_SAMPLE: 50,         // ignore noisy small windows

  UNRESOLVED_TRIGGERS_WARN: 500,      // org-wide active triggers
  UNRESOLVED_TRIGGERS_CRIT: 1500,

  STUCK_TRIGGER_DAYS: 30,             // trigger age that counts as "stuck"
  STUCK_TRIGGER_WARN: 5,
  STUCK_TRIGGER_CRIT: 25,

  REPLAY_MISMATCH_WARN: 0.10,         // 10% of recent replays drift
  REPLAY_MISMATCH_CRIT: 0.25,

  HEARTBEAT_MISSING_CRIT_RATIO: 2,    // >2× CRON_STALE_MIN = critical
} as const;

// Trace inspector / export.
export const TRACE_PAGE_SIZE = 100;        // cursor pagination page size
export const TRACE_EXPORT_MAX = 10_000;    // hard cap per CSV
export const TRACE_EXPORT_CHUNK = 1_000;   // server fetch chunk
export const TRACE_SEARCH_DEBOUNCE_MS = 300;

// System user excluded from all behavioral pipelines (mem://core).
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

export type AlertSeverity = 'info' | 'warning' | 'critical';
