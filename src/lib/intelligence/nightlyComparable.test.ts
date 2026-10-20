import { describe, expect, it } from 'vitest';
import { comparableClipPair, type ClipMeasure } from '../../../supabase/functions/intel-recheck-job/comparableRecheck';
const rec = { id: 'r', user_id: 'test', area: 'hitting', created_at: '2026-09-01T12:00:00Z', followed_at: '2026-09-01T12:00:00Z', baseline_value: 60 };
const clip = (id: string, date: string, score: number): ClipMeasure => ({ id, user_id: 'test', sport: 'baseball', module: 'hitting', created_at: date, efficiency_score: score });
const before = clip('b', '2026-09-01T11:00:00Z', 60);
describe('nightly comparable provenance and owner outcome rules', () => {
  it('requires two distinct same-athlete/sport/category/measure observations and uses 3 percent', () => {
    expect(comparableClipPair(rec, [before, clip('a', '2026-09-22T12:00:00Z', 62)])?.outcome).toBe('worked');
    expect(comparableClipPair(rec, [before, clip('a', '2026-09-22T12:00:00Z', 61)])?.outcome).toBe('no_change');
    expect(comparableClipPair(rec, [before, clip('a', '2026-09-22T12:00:00Z', 58)])?.outcome).toBe('got_worse');
    expect(comparableClipPair(rec, [before])).toBeNull();
  });
  it('rejects cross sport, athlete, category, outside 14–28 days and ambiguous baseline', () => {
    const after = clip('a', '2026-09-22T12:00:00Z', 65);
    for (const changed of [{ ...after, sport: 'softball' }, { ...after, user_id: 'other' }, { ...after, module: 'pitching' },
      { ...after, created_at: '2026-09-14T12:00:00Z' }, { ...after, created_at: '2026-09-30T12:00:00Z' }]) {
      expect(comparableClipPair(rec, [before, changed])).toBeNull();
    }
    expect(comparableClipPair(rec, [before, { ...before, id: 'b2', sport: 'softball' }, after])).toBeNull();
  });
  it('stores measurement time, not job time, and preserves missing provenance', () => {
    expect(comparableClipPair(rec, [before, clip('a', '2026-09-15T12:00:00Z', 65)])?.measuredAt).toBe('2026-09-15T12:00:00Z');
    expect(comparableClipPair({ ...rec, followed_at: null }, [before])).toBeNull();
  });
});