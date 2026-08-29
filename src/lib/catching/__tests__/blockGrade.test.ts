import { describe, expect, it } from 'vitest';
import { scoreBlock, scoreReboundDistance } from '@/lib/catching/blockGrade';

describe('scoreBlock — two-way perfect definition', () => {
  it('scores a mitt-stick as perfect', () => {
    const r = scoreBlock({ outcome: 'stuck_in_mitt' });
    if (r.missing) throw new Error('unexpected missing');
    expect(r.score).toBe(100);
    expect(r.perfect).toBe(true);
  });

  it('scores a deadened ball at the plate as equally perfect', () => {
    const r = scoreBlock({ outcome: 'deadened_at_plate' });
    if (r.missing) throw new Error('unexpected missing');
    expect(r.score).toBe(100);
    expect(r.perfect).toBe(true);
  });
});

describe('rebound grading', () => {
  it('is monotonically worse with distance', () => {
    const dists = [0, 2, 3, 6, 8, 12, 15, 20, 25, 40];
    const scores = dists.map(scoreReboundDistance);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('hits the documented breakpoints', () => {
    expect(scoreReboundDistance(0)).toBe(100);
    expect(scoreReboundDistance(3)).toBe(85);
    expect(scoreReboundDistance(8)).toBe(60);
    expect(scoreReboundDistance(15)).toBe(30);
    expect(scoreReboundDistance(25)).toBe(0);
    expect(scoreReboundDistance(60)).toBe(0);
  });

  it('keeps a short rebound in the blocking zone highly scored', () => {
    const r = scoreBlock({ outcome: 'rebound', rebound_distance_ft: 2 });
    if (r.missing) throw new Error('unexpected missing');
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it('returns missing when a rebound has no distance', () => {
    const r = scoreBlock({ outcome: 'rebound' });
    expect(r.missing).toBe(true);
    if (r.missing) expect(r.missing_reason).toBe('no_rebound_distance');
  });

  it('returns missing for a negative distance', () => {
    const r = scoreBlock({ outcome: 'rebound', rebound_distance_ft: -3 });
    if (!r.missing) throw new Error('expected missing');
    expect(r.missing_reason).toBe('negative_rebound_distance');
  });
});
