import { describe, expect, it } from 'vitest';
import { prioritizeGoalPick, toggleGoalPick } from './pickRanking';
import { scoreSkillLevers } from './categoryGoals';

describe('two selected goals keep an explicit priority', () => {
  it('selects both goals and reverses their ranks without removing either', () => {
    const selected = toggleGoalPick(toggleGoalPick([], 'barrel_control'), 'plate_discipline');
    expect(selected).toEqual([{ id: 'barrel_control', rank: 'primary' }, { id: 'plate_discipline', rank: 'secondary' }]);
    const ranked = prioritizeGoalPick(selected, 'plate_discipline');
    expect(ranked).toEqual([{ id: 'plate_discipline', rank: 'primary' }, { id: 'barrel_control', rank: 'secondary' }]);
    const weights = scoreSkillLevers({ version: 2, baseball: { position: { hitting: ranked } } });
    expect(weights.hitting_plate_discipline).toBeCloseTo(0.63);
    expect(weights.hitting_contact).toBeCloseTo(0.21);
  });
  it('deselection leaves a full-weight primary rather than a lone secondary', () => {
    expect(toggleGoalPick([{ id: 'barrel_control', rank: 'primary' }], 'barrel_control')).toEqual([]);
    expect(toggleGoalPick([{ id: 'barrel_control', rank: 'primary' }, { id: 'plate_discipline', rank: 'secondary' }], 'barrel_control')).toEqual([{ id: 'plate_discipline', rank: 'primary' }]);
  });
});