import { describe, it, expect } from 'vitest';
import { savedWeek } from './savedWeek';
describe('saved weekly work', () => {
  it('uses only the selected sport and Monday–Sunday saved days with real prescribed work', () => {
    const payload = { blocks: [{ status: 'ready', title: 'Hitting', drills: [{ name: 'Tee', dosage: '10 swings' }, { name: 'Bunt', dosage: '7 attempts', bunt: {} }] }, { status: 'suppressed', drills: [{ name: 'Hidden', dosage: '9 reps' }] }] };
    const result = savedWeek([{ plan_date: '2026-10-26', sport: 'baseball', payload }, { plan_date: '2026-10-25', sport: 'baseball', payload }, { plan_date: '2026-11-02', sport: 'baseball', payload }, { plan_date: '2026-10-27', sport: 'softball', payload }], 'baseball', '2026-10-27');
    expect(result.start).toBe('2026-10-26'); expect(result.end).toBe('2026-11-01');
    expect(result.days).toHaveLength(1);
    expect(result.days[0].activities).toEqual([{ category: 'Hitting', name: 'Tee', dosage: '10 swings' }, { category: 'Bunting', name: 'Bunt', dosage: '7 attempts' }]);
  });
  it('does not invent unsaved days or volume', () => {
    expect(savedWeek([], 'softball', '2026-10-27').days).toEqual([]);
  });
});