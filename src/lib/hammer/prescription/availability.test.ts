import { expect, it } from 'vitest';
import { availableTrainingDays, unavailableTrainingDate } from '../../../../supabase/functions/_shared/wic/schedule/availability';
import { resolveWeeklyTemplate, applyMicrocycle, projectWeeklyRoadmap } from './weeklyMicrocycle';
import type { AthleteContextProjection } from '../context/decisionFilters';
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
it('in-season four-day skill overflow and roadmap never reopen unavailable dates', () => {
  const template = resolveWeeklyTemplate({seasonPhase:'in', lifecycleBand:'adult', liftingAgeYears:2, weeklyAvailabilityDays:4} as AthleteContextProjection);
  const targets={hitting:3,defense:4,throwing:5,baserunning:1};
  const thursday=applyMicrocycle(template,new Date(2026,9,29),targets);
  expect(thursday.perModality.hitting.scheduled).toBe(false);
  expect(thursday.perModality.defense.scheduled).toBe(false);
  const roadmap=projectWeeklyRoadmap(template,new Date(2026,9,29),targets);
  expect(roadmap.filter(d=>!d.restDay).map(d=>d.dow)).toEqual([1,2,3,5]);
  expect(thursday.skillDays.defense).toHaveLength(4);
  expect(thursday.skillDays.hitting).toHaveLength(3);
});