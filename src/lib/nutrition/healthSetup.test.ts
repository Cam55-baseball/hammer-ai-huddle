import { describe, expect, it } from 'vitest';
import { enteredTargets, healthNutritionGoals, safeNutritionGoal } from './healthSetup';
describe('Nov3 optional growth-safe health setup', () => {
  it('lean out is unavailable under 18', () => expect(healthNutritionGoals(17).map(g => g.value)).toEqual(['gain_lean_muscle','maintain']));
  it('lean out becomes available at 18', () => expect(healthNutritionGoals(18).map(g => g.value)).toEqual(['gain_lean_muscle','maintain','lose_fat']));
  it('unknown age never permits cutting', () => expect(safeNutritionGoal('lose_fat', null)).toBe('maintain'));
  it('a minor existing cut goal resolves to maintenance', () => expect(safeNutritionGoal('lose_weight', 17)).toBe('maintain'));
  it('optional targets do not require calorie or macro answers', () => expect(enteredTargets({})).toEqual({}));
  it('saves only accepted suggestions, including water', () => expect(enteredTargets({protein_goal:'100',hydration_goal:'90',calorie_goal:''})).toEqual({protein_goal:100,hydration_goal:90}));
});