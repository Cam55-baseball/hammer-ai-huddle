import { expect, it } from 'vitest';
import { availableTrainingDays, unavailableTrainingDate } from '../../supabase/functions/_shared/wic/schedule/availability';

it.each([null, undefined, 0, 1, 2, 3, 4, 5, 6, 7])('availability %s retains exactly six training dates for every rest choice', days => {
  for (let rest = 0; rest < 7; rest++) {
    const training = availableTrainingDays(days, rest);
    expect(training).toHaveLength(6);
    expect(training).not.toContain(rest);
    const week = Array.from({length:7}, (_,i) => `2026-11-${String(2+i).padStart(2,'0')}`);
    expect(week.filter(date => unavailableTrainingDate(date, days, rest))).toHaveLength(1);
  }
});