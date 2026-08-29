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

const gradeOf = (v: number): number => {
  const r = computeExchangeTimeGrade(v, rows);
  if (r.missing) throw new Error('unexpected missing result');
  return r.grade as number;
};

describe('computeExchangeTimeGrade', () => {
  it('grades the anchors', () => {
    expect(gradeOf(0.5)).toBe(80);
    expect(gradeOf(0.7)).toBe(50);
    expect(gradeOf(0.85)).toBe(20);
  });

  it('grades a documented elite transfer (0.54s) well above average', () => {
    expect(gradeOf(0.54)).toBeGreaterThanOrEqual(70);
  });

  it('is monotonic — faster is never graded lower', () => {
    const vals = [0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.1];
    const grades = vals.map(gradeOf);
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]).toBeLessThanOrEqual(grades[i - 1]);
    }
  });

  it('returns missing without a value or an anchor', () => {
    expect(computeExchangeTimeGrade(null, rows).missing).toBe(true);
    const noAnchor = computeExchangeTimeGrade(0.6, []);
    expect(noAnchor.missing && noAnchor.missing_reason).toBe('no_scale_reference');
  });
});
