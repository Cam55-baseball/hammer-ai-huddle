import type { GoalType } from '@/utils/tdeeCalculations';

export const healthNutritionGoals = (age: number | null): { value: GoalType; label: string }[] => [
  { value: 'gain_lean_muscle', label: 'Build muscle' },
  { value: 'maintain', label: 'Maintain' },
  ...(age !== null && age >= 18 ? [{ value: 'lose_fat' as const, label: 'Lean out' }] : []),
];
export function safeNutritionGoal(goal: string | null, age: number | null): GoalType | null {
  if (!goal) return null;
  if ((goal === 'lose_fat' || goal === 'lose_weight') && (age === null || age < 18)) return 'maintain';
  return goal as GoalType;
}
export function enteredTargets(values: Record<string, string>) {
  const result: Record<string, number> = {};
  for (const key of ['calorie_goal','protein_goal','carbs_goal','fats_goal','hydration_goal']) {
    if (!values[key]?.trim()) continue;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error('Check your suggested amounts.');
    result[key] = Math.round(value);
  }
  return result;
}