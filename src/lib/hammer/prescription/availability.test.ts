import { expect, it } from 'vitest';
import { availableTrainingDays, unavailableTrainingDate } from '../../../../supabase/functions/_shared/wic/schedule/availability';
it('six available days preserve Monday through Saturday and Sunday rest', () => {
  expect(availableTrainingDays(6)).toEqual([1,2,3,4,5,6]);
  expect(unavailableTrainingDate('2026-11-01', 6)).toBe(true);
});
it('four available days reshape the week without increasing training days', () => {
  expect(availableTrainingDays(4)).toEqual([1,2,3,5]);
  expect(unavailableTrainingDate('2026-10-29', 4)).toBe(true);
  expect(unavailableTrainingDate('2026-10-30', 4)).toBe(false);
});
it('unknown availability preserves six days without inventing a smaller week', () => {
  expect(availableTrainingDays(null)).toHaveLength(6);
});