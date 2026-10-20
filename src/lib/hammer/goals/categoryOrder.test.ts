import { describe, expect, it } from 'vitest';
import { normalizeCategoryGoals, normalizeCategoryGoalsV2, rankedCategories } from './categoryGoals';

describe('saved ranked categories drive the canonical plan view', () => {
  const order = ['fielding', 'hitting', 'throwing', 'speed', 'power'];
  it('accepts a full saved order even before sub-goals are entered', () => {
    const raw = { version: 2, categoryOrder: order, updatedAt: '2026-10-20T12:00:00Z' };
    expect(normalizeCategoryGoalsV2(raw)?.categoryOrder).toEqual(order);
    expect(rankedCategories(normalizeCategoryGoals(raw))).toEqual(order);
  });
  it('explicit owner-approved category ranking wins over sub-goal presence', () => {
    const raw = { version: 2, categoryOrder: order, updatedAt: '2026-10-20T12:00:00Z',
      baseball: { position: { hitting: [{ id: 'barrel_control', rank: 'primary' }] } } };
    expect(rankedCategories(normalizeCategoryGoals(raw))).toEqual(order);
  });
  it('an incomplete ranking without sub-goals does not invent a ranking', () => {
    expect(normalizeCategoryGoals({ version: 2, categoryOrder: ['fielding'] })).toBeNull();
  });
});