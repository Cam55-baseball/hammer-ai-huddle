import { describe, expect, it } from 'vitest';
import { analysisGoalOrder } from './analysisGoalOrder';
describe('analysis reminders follow exact goal categories', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    it(`${sport}: saved category order changes reminder priority`, () => {
      const raw = { version: 2, [sport]: { position: { hitting: [{ id: 'contact_quality', rank: 'primary' }] } }, updatedAt: '2026-10-20', categoryOrder: ['throwing', 'hitting', 'speed', 'power', 'fielding'] };
      expect(analysisGoalOrder(raw, sport)).toEqual(['throwing', 'hitting']);
      expect(analysisGoalOrder({ ...raw, categoryOrder: ['hitting', 'throwing', 'speed', 'power', 'fielding'] }, sport)).toEqual(['hitting', 'throwing']);
    });
  }
  it('another sport cannot supply goal priority', () => {
    expect(analysisGoalOrder({ version: 2, baseball: { position: {} }, categoryOrder: ['hitting', 'throwing', 'speed', 'power', 'fielding'], updatedAt: '2026-10-20' }, 'softball')).toEqual([]);
  });
  it('throwing priority never becomes pitching priority', () => {
    const goals = ['throwing', 'hitting', 'fielding', 'speed', 'power'].map((category, i) => ({ category, rank: i + 1, intent: null }));
    expect(analysisGoalOrder({ version: 1, goals, updatedAt: '2026-10-20' }, 'baseball')).toEqual(['throwing', 'hitting']);
  });
  it('missing goals remain missing', () => {
    expect(analysisGoalOrder(null, 'baseball')).toEqual([]);
  });
});