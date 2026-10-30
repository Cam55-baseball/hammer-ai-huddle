import { expect, it } from 'vitest';
import { parseScheduleRequest } from '@/lib/hammer/tellHammers/parse';
it.each([['Offseason is beginning', 'off_season'], ['In-season today', 'in_season'], ['Preseason begins today', 'preseason'], ['Postseason today', 'post_season']])('explicit %s selects %s', (text, phase) => {
  const result = parseScheduleRequest(text, '2026-10-29');
  expect(result.ok).toBe(true);
  if (result.ok) { expect(result.draft.tag).toBe('SEASON'); expect(result.draft.payload.phase).toBe(phase); expect(result.draft.start_date).toBe('2026-10-29'); }
});
it('available days stores the exact declared number', () => {
  const result = parseScheduleRequest('I can train 4 days per week', '2026-10-29');
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.draft.payload).toMatchObject({ kind: 'availability', days: 4 });
});
it('season ends Nov 20 keeps the final day and starts offseason Nov 21', () => {
  const r=parseScheduleRequest('my season ends Nov 20','2026-10-30');
  expect(r).toMatchObject({ok:true,draft:{tag:'SEASON',start_date:'2026-11-21',payload:{which:'ends',season_end:'2026-11-20'}}});
});
it('offseason started today takes effect today', () => {
  expect(parseScheduleRequest('offseason started today','2026-10-30')).toMatchObject({ok:true,draft:{start_date:'2026-10-30',payload:{phase:'off_season'}}});
});
it('in-season date range retains the exact last date', () => {
  expect(parseScheduleRequest('in-season Oct 30 to Nov 20','2026-10-30')).toMatchObject({ok:true,draft:{start_date:'2026-10-30',end_date:'2026-11-20',payload:{phase:'in_season',window_end:'2026-11-20'}}});
});