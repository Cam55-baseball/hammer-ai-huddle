import { describe, expect, it } from 'vitest';
import { enteredNutritionGoals } from './planInputReview';
describe('initial nutrition targets', () => {
  it('keeps missing goals missing instead of saving default calorie targets', () => expect(enteredNutritionGoals({}, '')).toBeNull());
  it('saves every entered nutrition goal and existing supplements', () => {
    expect(enteredNutritionGoals({ calorie_goal: '2200', protein_goal: '100', carbs_goal: '250', fats_goal: '70', hydration_goal: '90' }, ' vitamin D, ')).toEqual({ calorie_goal: 2200, protein_goal: 100, carbs_goal: 250, fats_goal: 70, hydration_goal: 90, supplement_goals: ['vitamin D'] });
  });
  it('refuses incomplete targets instead of filling in the missing macros', () => expect(() => enteredNutritionGoals({ calorie_goal: '2200' }, '')).toThrow());
  it('rejects negative and invalid target values', () => {
    const full = { calorie_goal: '2200', protein_goal: '100', carbs_goal: '250', fats_goal: '70', hydration_goal: '90' };
    expect(() => enteredNutritionGoals({ ...full, protein_goal: '-1' }, '')).toThrow();
    expect(() => enteredNutritionGoals({ ...full, calorie_goal: 'not a number' }, '')).toThrow();
  });
});