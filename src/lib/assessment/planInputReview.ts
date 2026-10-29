export const NUTRITION_FIELDS = [
  ['calorie_goal', 'Daily calories (kcal)'], ['protein_goal', 'Protein (g)'],
  ['carbs_goal', 'Carbohydrates (g)'], ['fats_goal', 'Fat (g)'], ['hydration_goal', 'Water (oz)'],
] as const;
export const EXTRA_NUTRITION_FIELDS = [['fiber_goal', 'Fiber (g)'], ['sugar_limit', 'Existing sugar limit (g)'], ['sodium_limit', 'Existing sodium limit (mg)']] as const;
export function assessmentPlanMissing(context: Record<string, unknown>, nutrition: unknown, health: { setup_completed?: boolean } | null) {
  const missing: Array<{ key: string; label: string; to: string }> = [];
  const add = (key: string, label: string) => missing.push({ key, label, to: '/assessment?review=profile' });
  if (!['L', 'R', 'S'].includes(String(context.bats_hand))) add('bats', 'Which side you bat from');
  if (!['L', 'R', 'S'].includes(String(context.throws_hand))) add('throws', 'Which hand you throw with');
  const body = context.anthropometrics as Record<string, unknown> | null;
  if (!(Number(body?.height_in) > 0)) add('height', 'Your height');
  if (!(Number(body?.weight_lb) > 0)) add('weight', 'Your weight');
  if (!(Number(context.sleep_target_hrs) > 0)) add('sleep', 'Your usual sleep hours');
  if (context.lifting_age_years == null) add('lifting', 'Years of lifting (0 if never)');
  const targets = nutrition as Record<string, unknown> | null;
  for (const [key, label] of NUTRITION_FIELDS) if (targets?.[key] == null || !Number.isFinite(Number(targets[key])) || Number(targets[key]) < 0) add(key, label);
  if (!health?.setup_completed) add('health', 'Your health & physio information');
  return missing;
}
/** Explicit entered targets only: never generate restriction goals or missing numbers. */
export function enteredNutritionGoals(values: Record<string, string>, supplements: string) {
  if (NUTRITION_FIELDS.every(([key]) => !values[key]?.trim()) && !supplements.trim()) return null;
  const numbers = NUTRITION_FIELDS.map(([key]) => Number(values[key]));
  if (NUTRITION_FIELDS.some(([key], index) => !values[key]?.trim() || !Number.isFinite(numbers[index]) || numbers[index] < 0)) {
    throw new Error('Fill in each nutrition target with zero or a positive number.');
  }
  const extra: Record<string, number> = {};
  for (const [key] of EXTRA_NUTRITION_FIELDS) {
    if (!values[key]?.trim()) continue;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error('Check your existing nutrition targets.');
    extra[key] = value;
  }
  return { ...extra, calorie_goal: numbers[0], protein_goal: numbers[1], carbs_goal: numbers[2], fats_goal: numbers[3], hydration_goal: numbers[4],
    supplement_goals: supplements.split(',').map(value => value.trim()).filter(Boolean) };
}