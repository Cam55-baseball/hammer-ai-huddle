import { expect, it } from 'vitest';
import { buildCalendarEvents, type CoachPrescriptionRow } from '@/lib/calendar/buildCalendarEvents';
const build = (coachPrescriptions: CoachPrescriptionRow[]) => buildCalendarEvents({ gamePlanDays: [], logs: [], templates: [], blocks: [], blockWorkouts: [], coachPrescriptions });
const row: CoachPrescriptionRow = { id: 'rx-1', title: 'Fielding', category: 'fielding', status: 'pending', plan_date: '2026-10-26', schedule_type: 'recurring' };
it('a coach moving October 26 to October 28 moves the calendar occurrence', () => {
  expect(build([row]).map(e => e.date)).toEqual(['2026-10-26']);
  expect(build([{ ...row, plan_date: '2026-10-28' }]).map(e => e.date)).toEqual(['2026-10-28']);
});
it('cancelled dates disappear from the calendar', () => { expect(build([{ ...row, cancelled_at: '2026-10-24T21:30:00Z' }])).toEqual([]); });
it('Any day has no calendar date before player activation', () => { expect(build([{ ...row, schedule_type: 'any_day' }])).toEqual([]); });