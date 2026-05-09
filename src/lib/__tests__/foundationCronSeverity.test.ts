/**
 * Phase I — cron severity transitions.
 * Mirrors statusFor() logic from FoundationHealthDashboard so the threshold
 * boundaries are pinned by tests independent of the rendering layer.
 */
import { describe, it, expect } from 'vitest';
import { CRON_STALE_MIN, ALERT } from '@/lib/foundationThresholds';

function statusFor(beat: { ran_at: string; status: string } | undefined, fn: string, now = Date.now()): 'green' | 'amber' | 'red' {
  const maxAgeMin = CRON_STALE_MIN[fn] ?? 90;
  if (!beat) return 'red';
  if (beat.status !== 'ok') return 'red';
  const ageMin = (now - new Date(beat.ran_at).getTime()) / 60_000;
  if (ageMin > maxAgeMin * ALERT.HEARTBEAT_MISSING_CRIT_RATIO) return 'red';
  if (ageMin > maxAgeMin) return 'amber';
  return 'green';
}

const FN = 'foundation-health-alerts'; // 90 min window
const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

describe('cron heartbeat severity transitions', () => {
  it('returns red for missing beat', () => {
    expect(statusFor(undefined, FN, NOW)).toBe('red');
  });
  it('returns red on errored beat', () => {
    const ran_at = new Date(NOW - 10 * 60_000).toISOString();
    expect(statusFor({ ran_at, status: 'error' }, FN, NOW)).toBe('red');
  });
  it('returns green when fresh', () => {
    const ran_at = new Date(NOW - 30 * 60_000).toISOString();
    expect(statusFor({ ran_at, status: 'ok' }, FN, NOW)).toBe('green');
  });
  it('returns amber just past max age', () => {
    const ran_at = new Date(NOW - 91 * 60_000).toISOString();
    expect(statusFor({ ran_at, status: 'ok' }, FN, NOW)).toBe('amber');
  });
  it('returns red past 2× max age', () => {
    const ran_at = new Date(NOW - 181 * 60_000).toISOString();
    expect(statusFor({ ran_at, status: 'ok' }, FN, NOW)).toBe('red');
  });
});
