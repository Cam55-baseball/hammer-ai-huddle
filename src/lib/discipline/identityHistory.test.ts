import { expect, it } from 'vitest';
import { identityHistoryStart, readIdentityHistory } from '../../../supabase/functions/evaluate-behavioral-state/history';

it('reads a full year plus the partial rest week for identity streaks', () => {
  expect(identityHistoryStart('2026-10-28')).toBe('2025-10-23');
});
it('keeps all 1201 records beyond a single page', async () => {
  const source = Array.from({ length: 1201 }, (_, id) => ({ id }));
  expect((await readIdentityHistory(async (from, to) => ({ data: source.slice(from, to + 1), error: null }))).length).toBe(1201);
});
it('rejects missing history rather than certifying a short or empty streak', async () => {
  await expect(readIdentityHistory(async () => ({ data: null, error: null }))).rejects.toThrow('unavailable');
  await expect(readIdentityHistory(async () => ({ data: [], error: new Error('denied') }))).rejects.toThrow('denied');
});