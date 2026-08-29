import { describe, expect, it } from 'vitest';
import {
  EXCHANGE_TIME_METRIC,
  computeExchangeTimeGrade,
} from '@/lib/catching/exchangeTimeGrade';
import type { ScaleReferenceRow } from '@/lib/defense/beatenRunnerGrade';

const rows: ScaleReferenceRow[] = [
  {
    metric: EXCHANGE_TIME_METRIC,
    direction: 'lower_better',
    floor_value: 0.85,
    avg_value: 0.7,
    record_value: 0.5,
  },
];

describe('computeExchangeTimeGrade', () => {
  it('grades the anchors', () => {
    const rec = computeExchangeTimeGrade(0.5, rows);
    const avg = computeExchangeTimeGrade(0.7, rows);
    const floor = computeExchangeTimeGrade(0.85, rows);
    if (rec.missing || avg.missing || floor.missing) throw new Error('missing');
    expect(rec.grade).toBe(80);
    expect(avg.grade).toBe(50);
    expect(floor.grade).toBe(20);
  });

  it('grades a documented elite transfer (0.54s) well above average', () => {
    const r = computeExchangeTimeGrade(0.54, rows);
    if (r.missing) throw new Error('missing');
    expect(r.grade).toBeGreaterThanOrEqual(70);
  });

  it('is monotonic — faster is never graded lower', () => {
    const vals = [0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.1];
    const grades = vals.map(v => {
      const r = computeExchangeTimeGrade(v, rows);
      return r.missing ? -1 : r.grade;
    });
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]).toBeLessThanOrEqual(grades[i - 1]);
    }
  });

  it('returns missing without a value or an anchor', () => {
    expect(computeExchangeTimeGrade(null, rows).missing).toBe(true);
    const noAnchor = computeExchangeTimeGrade(0.6, []);
    if (!noAnchor.missing) throw new Error('expected missing');
    expect(noAnchor.missing_reason).toBe('no_scale_reference');
  });
});
