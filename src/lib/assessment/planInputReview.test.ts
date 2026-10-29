import { describe, expect, it } from 'vitest';
import { enteredNutritionGoals, assessmentPlanMissing } from './planInputReview';
describe('initial nutrition targets', () => {
  it('lists every missing initial profile input independently', () => {
    expect(assessmentPlanMissing({}, null, null).map(item => item.key)).toEqual(['bats', 'throws', 'height', 'weight', 'sleep', 'lifting', 'calorie_goal', 'protein_goal', 'carbs_goal', 'fats_goal', 'hydration_goal', 'health']);
    expect(assessmentPlanMissing({ bats_hand: 'L', throws_hand: 'R', anthropometrics: { height_in: 70, weight_lb: 175 }, sleep_target_hrs: 8, lifting_age_years: 0 }, { calorie_goal: 2200, protein_goal: 100, carbs_goal: 250, fats_goal: 70, hydration_goal: 90 }, { setup_completed: true })).toEqual([]);
  });
  it('keeps missing goals missing instead of saving default calorie targets', () => expect(enteredNutritionGoals({}, '')).toBeNull());
  it('saves every entered nutrition goal and existing supplements', () => {
    expect(enteredNutritionGoals({ calorie_goal: '2200', protein_goal: '100', carbs_goal: '250', fats_goal: '70', hydration_goal: '90' }, ' vitamin D, ')).toEqual({ calorie_goal: 2200, protein_goal: 100, carbs_goal: 250, fats_goal: 70, hydration_goal: 90, supplement_goals: ['vitamin D'] });
  });
  it('refuses incomplete targets instead of filling in the missing macros', () => expect(() => enteredNutritionGoals({ calorie_goal: '2200' }, '')).toThrow());
  it('does not accept a nutrition row with no entered targets', () => expect(assessmentPlanMissing({}, { user_id: 'player' }, null).filter(item => item.key.endsWith('_goal')).map(item => item.key)).toEqual(['calorie_goal','protein_goal','carbs_goal','fats_goal','hydration_goal']));
  it('retains all optional existing nutrition limits without inventing them', () => {
    const saved = enteredNutritionGoals({ calorie_goal: '2200', protein_goal: '100', carbs_goal: '250', fats_goal: '70', hydration_goal: '90', fiber_goal: '30', sodium_limit: '2300', sugar_limit: '40' }, '');
    expect(saved).toMatchObject({ fiber_goal: 30, sodium_limit: 2300, sugar_limit: 40 });
  });
  it('rejects negative and invalid target values', () => {
    const full = { calorie_goal: '2200', protein_goal: '100', carbs_goal: '250', fats_goal: '70', hydration_goal: '90' };
    expect(() => enteredNutritionGoals({ ...full, protein_goal: '-1' }, '')).toThrow();
    expect(() => enteredNutritionGoals({ ...full, calorie_goal: 'not a number' }, '')).toThrow();
  });
});