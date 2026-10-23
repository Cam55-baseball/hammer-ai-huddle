import { describe, expect, it } from 'vitest';
import { mergeActivityPerformance } from './mergeActivityPerformance';
describe('accepted activity performance saves', () => {
  it('preserves the first exercise while saving a second exercise with hundredths', () => {
    const result = mergeActivityPerformance({ exerciseSets: { first: { sets: [{ reps: 8 }] } }, checkboxStates: { first: false } }, { exerciseSets: { second: { sets: [{ time: 1.47, time_unit: 'sec' }] } } });
    expect(result.exerciseSets).toEqual({ first: { sets: [{ reps: 8 }] }, second: { sets: [{ time: 1.47, time_unit: 'sec' }] } });
    expect(result.checkboxStates.first).toBe(false);
  });
});