import { getV2, normalizeCategoryGoals, CATEGORY_INTENTS } from '@/lib/hammer/goals/categoryGoals';
import { findSubGoal, type CategoryKey, type Sport, type Discipline } from '@/lib/hammer/goals/subGoalCatalog';
export function savedTrendGoals(raw: unknown, sport: Sport) {
  const v2 = getV2(raw);
  if (v2) return (['position','pitcher'] as Discipline[]).flatMap(discipline => {
    const pane = v2[sport]?.[discipline];
    if (!pane) return [];
    return (Object.keys(pane) as CategoryKey[]).flatMap(category => (pane[category] ?? []).map(pick=>({title:findSubGoal(sport,discipline,category,pick.id)?.label ?? pick.id,module:category})));
  });
  return (normalizeCategoryGoals(raw)?.goals ?? []).map(g=>({title:CATEGORY_INTENTS[g.category].find(i=>i.id===g.intent)?.label ?? g.category,module:g.category}));
}