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