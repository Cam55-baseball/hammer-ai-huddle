import { describe, expect, it } from 'vitest';
import { PRACTICE_HISTORY_LIMIT, readPracticeLoadSources } from './practiceLoadRead';

const result = <T>(data: T[] | null, error: unknown = null) => Promise.resolve({ data, error });
describe('complete canonical practice-load reads', () => {
  it('returns both complete sources, including real empty histories', async () => {
    expect(await readPracticeLoadSources({ sessions: result([{ id: 'actual' }]), logs: result([]) }))
      .toEqual({ sessions: [{ id: 'actual' }], logs: [] });
  });
  for (const source of ['sessions', 'logs'] as const) {
    it(`${source} failure is not an empty load`, async () => {
      const error = new Error('source unavailable');
      await expect(readPracticeLoadSources({ sessions: result([], source === 'sessions' ? error : null), logs: result([], source === 'logs' ? error : null) })).rejects.toBe(error);
    });
    it(`${source} missing or capped history cannot author partial totals`, async () => {
      for (const data of [null, Array.from({ length: PRACTICE_HISTORY_LIMIT }, (_, id) => ({ id }))]) {
        await expect(readPracticeLoadSources({ sessions: result(source === 'sessions' ? data : []), logs: result(source === 'logs' ? data : []) })).rejects.toThrow();
      }
    });
  }
});