import type { AnalysisModule } from '@/lib/assessment/initialAssessment';
import { getV2, normalizeCategoryGoals, rankedCategories } from '@/lib/hammer/goals/categoryGoals';

/** Exact category names only: a throwing goal never invents a pitching goal. */
export function analysisGoalOrder(raw: unknown, sport: 'baseball' | 'softball'): AnalysisModule[] {
  const v2 = getV2(raw);
  if (v2 && !v2[sport]) return [];
  const scoped = v2 ? { version: 2, [sport]: v2[sport], updatedAt: v2.updatedAt } : raw;
  const categories = v2?.categoryOrder?.length ? v2.categoryOrder : rankedCategories(normalizeCategoryGoals(scoped));
  return categories.flatMap(category => category === 'hitting' || category === 'throwing' ? [category] : []);
}