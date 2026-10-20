import { normalizeCategoryGoals, normalizeCategoryOrder, type CategoryKey } from './categoryGoals';

/** Preserve saved sport choices and legacy intents; a confirmation only changes rank/date. */
export function confirmCategoryOrder(raw: Record<string, unknown> | null, picked: readonly CategoryKey[], updatedAt: string) {
  const order = normalizeCategoryOrder(picked);
  if (!order) throw new Error('Choose all five training areas');
  const base = raw ?? { version: 2 };
  const legacy = base.version === 1 ? normalizeCategoryGoals(base) : null;
  return {
    ...base,
    version: base.version ?? 2,
    ...(legacy ? { goals: order.map((category, index) => {
      const goal = legacy.goals.find(item => item.category === category);
      return { ...goal, category, rank: index + 1 };
    }) } : {}),
    categoryOrder: order,
    updatedAt,
  };
}