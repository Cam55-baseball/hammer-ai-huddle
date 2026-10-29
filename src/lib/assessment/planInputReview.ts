export const NUTRITION_FIELDS = [
  ['calorie_goal', 'Daily calories (kcal)'], ['protein_goal', 'Protein (g)'],
  ['carbs_goal', 'Carbohydrates (g)'], ['fats_goal', 'Fat (g)'], ['hydration_goal', 'Water (oz)'],
] as const;
/** Explicit entered targets only: never generate restriction goals or missing numbers. */
export function enteredNutritionGoals(values: Record<string, string>, supplements: string) {
  if (NUTRITION_FIELDS.every(([key]) => !values[key]?.trim()) && !supplements.trim()) return null;
  const numbers = NUTRITION_FIELDS.map(([key]) => Number(values[key]));
  if (NUTRITION_FIELDS.some(([key], index) => !values[key]?.trim() || !Number.isFinite(numbers[index]) || numbers[index] < 0)) {
    throw new Error('Fill in each nutrition target with zero or a positive number.');
  }
  return { calorie_goal: numbers[0], protein_goal: numbers[1], carbs_goal: numbers[2], fats_goal: numbers[3], hydration_goal: numbers[4],
    supplement_goals: supplements.split(',').map(value => value.trim()).filter(Boolean) };
}