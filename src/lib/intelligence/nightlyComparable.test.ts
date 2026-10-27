import { describe, expect, it, vi } from 'vitest';
import { comparableClipPair, recheckComparablePlayer, type ClipMeasure } from '../../../supabase/functions/intel-recheck-job/comparableRecheck';
const rec = { id: 'r', user_id: 'test', area: 'hitting', created_at: '2026-09-01T12:00:00Z', followed_at: '2026-09-01T12:00:00Z', baseline_value: 60 };
const clip = (id: string, date: string, score: number): ClipMeasure => ({ id, user_id: 'test', sport: 'baseball', module: 'hitting', created_at: date, efficiency_score: score });
const before = clip('b', '2026-09-01T11:00:00Z', 60);
describe('nightly comparable provenance and owner outcome rules', () => {
  it('accepts the existing writer title-case category without widening canonical module identity', () => {
    const clips = [before, clip('a', '2026-09-22T12:00:00Z', 62)];
    expect(comparableClipPair({ ...rec, area: 'Hitting' }, clips)).toEqual(comparableClipPair(rec, clips));
    expect(comparableClipPair({ ...rec, area: 'Throwing' }, clips)).toBeNull();
  });
  it('queries lowercase canonical modules and leaves unresolved title-case advice pending', async () => {
    const videoEq = vi.fn();
    const update = vi.fn();
    const query = (data: unknown, eq = vi.fn()) => {
      const chain: Record<string, any> = { data, error: null };
      for (const method of ['select', 'eq', 'is', 'not', 'order', 'limit']) chain[method] = (...args: unknown[]) => {
        if (method === 'eq') eq(...args);
        return chain;
      };
      return chain;
    };
    const sb = { from: (table: string) => table === 'videos' ? query([before], videoEq)
      : { ...query([{ ...rec, area: 'Hitting' }]), update } };
    expect(await recheckComparablePlayer(sb, 'test')).toEqual([{ id: 'r', outcome: null }]);
    expect(videoEq).toHaveBeenCalledWith('module', 'hitting');
    expect(update).not.toHaveBeenCalled();
  });
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