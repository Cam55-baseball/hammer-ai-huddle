import { describe, it, expect } from 'vitest';
import { categoryInTopThree, hittingMechanicsGoal } from './mechanicsGoal';

const v2 = (order: string[], sport: 'baseball' | 'softball' = 'baseball') => ({
  version: 2,
  [sport]: { hitting: { rank: 'primary', picks: [] } },
  categoryOrder: order,
  updatedAt: '2026-10-01T00:00:00.000Z',
});

describe('mechanics goal = category in the top three ranked goals', () => {
  it('hitting ranked first, second or third counts', () => {
    expect(hittingMechanicsGoal(v2(['hitting', 'throwing', 'fielding', 'power', 'speed']), 'baseball')).toBe(true);
    expect(hittingMechanicsGoal(v2(['throwing', 'hitting', 'fielding', 'power', 'speed']), 'baseball')).toBe(true);
    expect(hittingMechanicsGoal(v2(['throwing', 'fielding', 'hitting', 'power', 'speed']), 'baseball')).toBe(true);
  });

  it('hitting ranked fourth or fifth does not count', () => {
    expect(hittingMechanicsGoal(v2(['throwing', 'fielding', 'power', 'hitting', 'speed']), 'baseball')).toBe(false);
    expect(hittingMechanicsGoal(v2(['throwing', 'fielding', 'power', 'speed', 'hitting']), 'baseball')).toBe(false);
  });

  it('a throwing goal never counts as a hitting mechanics goal', () => {
    expect(hittingMechanicsGoal(v2(['throwing', 'fielding', 'power', 'speed', 'hitting']), 'baseball')).toBe(false);
  });

  it('scopes to the selected sport: no saved goals for that sport is not a mechanics goal', () => {
    expect(hittingMechanicsGoal(v2(['hitting', 'throwing', 'fielding', 'power', 'speed']), 'softball')).toBe(false);
  });

  it('missing or unreadable rankings are never a mechanics goal', () => {
    expect(hittingMechanicsGoal(null, 'baseball')).toBe(false);
    expect(hittingMechanicsGoal(undefined, 'baseball')).toBe(false);
    expect(hittingMechanicsGoal({ version: 2 }, 'baseball')).toBe(false);
  });

  it('legacy V1 rankings count by rank', () => {
    const v1 = { goals: [
      { category: 'throwing', rank: 1, intent: '', notes: '' },
      { category: 'hitting', rank: 2, intent: '', notes: '' },
      { category: 'fielding', rank: 3, intent: '', notes: '' },
      { category: 'power', rank: 4, intent: '', notes: '' },
      { category: 'speed', rank: 5, intent: '', notes: '' },
    ] };
    expect(categoryInTopThree(v1, 'baseball', 'hitting')).toBe(true);
    expect(categoryInTopThree(v1, 'baseball', 'speed')).toBe(false);
  });
});
