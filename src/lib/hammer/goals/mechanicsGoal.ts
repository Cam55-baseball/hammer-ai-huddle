import { getV2, normalizeCategoryGoals, rankedCategories, type CategoryKey } from './categoryGoals';

/**
 * Owner rule (Oct 20): a "mechanics goal" is when the mechanics category appears
 * in the player's top three ranked goals. Exact category match only — a throwing
 * goal never counts as a hitting mechanics goal, and an unreadable or unsaved
 * ranking is never a mechanics goal.
 */
export function categoryInTopThree(raw: unknown, sport: 'baseball' | 'softball', category: CategoryKey): boolean {
  const v2 = getV2(raw);
  if (v2 && !v2[sport]) return false;
  const scoped = v2 ? { version: 2, [sport]: v2[sport], updatedAt: v2.updatedAt } : raw;
  const categories = v2?.categoryOrder?.length ? v2.categoryOrder : rankedCategories(normalizeCategoryGoals(scoped));
  return categories.slice(0, 3).includes(category);
}

/** Delaycam works on swings: the hitting mechanics goal is hitting in the top three. */
export function hittingMechanicsGoal(raw: unknown, sport: 'baseball' | 'softball'): boolean {
  return categoryInTopThree(raw, sport, 'hitting');
}
