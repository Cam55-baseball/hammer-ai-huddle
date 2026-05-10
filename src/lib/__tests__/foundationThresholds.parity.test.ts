/**
 * Phase I — parity test.
 * Locks the canonical thresholds. Any drift here triggers a review.
 */
import { describe, it, expect } from 'vitest';
import {
  CRON_STALE_MIN,
  ALERT,
  TRACE_PAGE_SIZE,
  TRACE_EXPORT_MAX,
  TRACE_EXPORT_CHUNK,
  TRACE_SEARCH_DEBOUNCE_MS,
  SYSTEM_USER_ID,
  ALERT_RETENTION_DAYS,
} from '@/lib/foundationThresholds';

describe('foundation thresholds parity', () => {
  it('locks alert thresholds', () => {
    expect(ALERT).toMatchInlineSnapshot(`
      {
        "HEARTBEAT_MISSING_CRIT_RATIO": 2,
        "REPLAY_MISMATCH_CRIT": 0.25,
        "REPLAY_MISMATCH_MIN_SAMPLE": 20,
        "REPLAY_MISMATCH_WARN": 0.1,
        "STUCK_TRIGGER_CRIT": 25,
        "STUCK_TRIGGER_DAYS": 30,
        "STUCK_TRIGGER_WARN": 5,
        "SUPPRESSION_MIN_SAMPLE": 50,
        "SUPPRESSION_RATE_CRIT": 0.75,
        "SUPPRESSION_RATE_WARN": 0.55,
        "UNRESOLVED_TRIGGERS_CRIT": 1500,
        "UNRESOLVED_TRIGGERS_WARN": 500,
      }
    `);
  });
  it('locks cron staleness windows', () => {
    expect(CRON_STALE_MIN['hourly-trigger-decay']).toBe(90);
    expect(CRON_STALE_MIN['foundation-health-alerts']).toBe(90);
    expect(CRON_STALE_MIN['foundation-alert-retention']).toBe(60 * 26);
  });
  it('locks trace inspector + retention constants', () => {
    expect(TRACE_PAGE_SIZE).toBe(100);
    expect(TRACE_EXPORT_MAX).toBe(10_000);
    expect(TRACE_EXPORT_CHUNK).toBe(1_000);
    expect(TRACE_SEARCH_DEBOUNCE_MS).toBe(300);
    expect(SYSTEM_USER_ID).toBe('00000000-0000-0000-0000-000000000001');
    expect(ALERT_RETENTION_DAYS).toBe(365);
  });
});
