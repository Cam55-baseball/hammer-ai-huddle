import { describe, it, expect } from 'vitest';
import { bucketize } from '@/pages/owner/FoundationOpsObservability';

describe('bucketize', () => {
  it('produces exactly 7 day buckets', () => {
    expect(bucketize([])).toHaveLength(7);
  });

  it('counts total + mismatched correctly', () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = [
      { ran_at: `${today}T01:00:00Z`, matched: true },
      { ran_at: `${today}T02:00:00Z`, matched: false },
      { ran_at: `${today}T03:00:00Z`, matched: false },
    ];
    const buckets = bucketize(rows);
    const todays = buckets.find(b => b.dayIso === today)!;
    expect(todays.total).toBe(3);
    expect(todays.mismatched).toBe(2);
  });

  it('ignores rows outside the 7d window', () => {
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const buckets = bucketize([{ ran_at: old, matched: false }]);
    expect(buckets.reduce((s, b) => s + b.total, 0)).toBe(0);
  });

  it('handles empty input without divide-by-zero', () => {
    const buckets = bucketize([]);
    for (const b of buckets) {
      expect(b.total).toBe(0);
      expect(b.mismatched).toBe(0);
    }
  });
});
