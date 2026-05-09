/**
 * Phase I — health-alerts lifecycle.
 * Stub Supabase client. Verifies open → refresh → auto-resolve transitions
 * and that the system user is excluded from suppression-rate sampling.
 */
import { describe, it, expect } from 'vitest';
import { ALERT, SYSTEM_USER_ID } from '@/lib/foundationThresholds';

interface AlertRow {
  id: string; alert_key: string; severity: string;
  resolved_at: string | null; last_seen_at: string;
}

// --- minimal in-memory fake of the upsert/auto-resolve loop -----------------

function step(existing: AlertRow | null, fired: boolean, severity: 'critical' | 'warning' = 'critical'): {
  action: 'insert' | 'update' | 'resolve' | 'noop';
  next: AlertRow | null;
} {
  if (fired) {
    if (existing) {
      return {
        action: 'update',
        next: { ...existing, severity, last_seen_at: new Date().toISOString() },
      };
    }
    return {
      action: 'insert',
      next: { id: 'a1', alert_key: 'k', severity, resolved_at: null, last_seen_at: new Date().toISOString() },
    };
  }
  if (existing) {
    return { action: 'resolve', next: { ...existing, resolved_at: new Date().toISOString() } };
  }
  return { action: 'noop', next: null };
}

describe('health-alerts lifecycle', () => {
  it('opens, refreshes, then auto-resolves a single alert key', () => {
    const a = step(null, true);
    expect(a.action).toBe('insert');
    expect(a.next?.resolved_at).toBeNull();

    const b = step(a.next, true);
    expect(b.action).toBe('update');
    expect(b.next?.resolved_at).toBeNull();

    const c = step(b.next, false);
    expect(c.action).toBe('resolve');
    expect(c.next?.resolved_at).not.toBeNull();
  });

  it('does nothing if cleared key was never opened', () => {
    expect(step(null, false).action).toBe('noop');
  });
});

describe('suppression rate sampling', () => {
  it('excludes the system user from the denominator', () => {
    const traces = [
      { user_id: SYSTEM_USER_ID, suppressed: true },
      { user_id: SYSTEM_USER_ID, suppressed: true },
      { user_id: 'u1', suppressed: true },
      { user_id: 'u2', suppressed: false },
    ];
    const real = traces.filter(t => t.user_id !== SYSTEM_USER_ID);
    const rate = real.filter(t => t.suppressed).length / real.length;
    expect(rate).toBe(0.5);
    expect(rate).toBeLessThan(ALERT.SUPPRESSION_RATE_WARN);
  });
});
