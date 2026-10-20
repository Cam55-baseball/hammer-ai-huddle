import { describe, it, expect } from 'vitest';
import { majorMechanicalFlag } from './delaycamMajorFlag';

const r = (date: string, ...keys: string[]) => ({ date, issues: keys.map(key => ({ key })) });

describe('majorMechanicalFlag', () => {
  it('same issue in 3 of last 5 reports is major', () => {
    expect(majorMechanicalFlag([r('2026-10-01', 'late'), r('2026-10-05', 'late'), r('2026-10-09'), r('2026-10-12', 'late')])).toBe(true);
  });
  it('only 2 of last 5 is not major', () => {
    expect(majorMechanicalFlag([r('2026-10-01', 'late'), r('2026-10-05', 'late'), r('2026-10-09', 'cast')])).toBe(false);
  });
  it('older reports beyond the last 5 do not count', () => {
    const old = [r('2026-01-01', 'late'), r('2026-01-02', 'late')];
    const recent = [r('2026-10-01', 'late'), r('2026-10-02'), r('2026-10-03'), r('2026-10-04'), r('2026-10-05')];
    expect(majorMechanicalFlag([...old, ...recent])).toBe(false);
  });
  it('one severe issue is major; broken dates and repeats in one report ignored', () => {
    expect(majorMechanicalFlag([{ date: '2026-10-01', issues: [{ key: 'cast', severe: true }] }])).toBe(true);
    expect(majorMechanicalFlag([r('bad', 'late'), r('bad', 'late'), r('2026-10-01', 'late', 'late', 'late')])).toBe(false);
  });
  it('impossible calendar dates cannot establish three matching reports', () => {
    expect(majorMechanicalFlag([r('2026-02-30', 'late'), r('2026-02-31', 'late'), r('2026-10-01', 'late')])).toBe(false);
  });
});
