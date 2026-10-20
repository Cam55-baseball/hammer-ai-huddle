import { describe, expect, it } from 'vitest';
import { DRILL_HISTORY_LIMIT, projectDrillHistory, readDrillCirculation } from './drillCirculationRead';

describe('drill rotation is history, not a learning verdict', () => {
  it('latest completion wins regardless of read order; served/opened never become completion', () => {
    const events = [
      { drill_id: 'one', event: 'completed', created_at: '2026-10-19T22:00:00Z' },
      { drill_id: 'one', event: 'completed', created_at: '2026-10-01T22:00:00Z' },
      { drill_id: 'two', event: 'served', created_at: '2026-10-20T12:00:00Z' },
      { drill_id: 'two', event: 'opened', created_at: '2026-10-20T12:00:00Z' },
      { drill_id: 'three', event: 'completed', created_at: 'invalid' },
    ];
    const expected = { served: { two: 1 }, completedOn: { one: '2026-10-19' } };
    expect(projectDrillHistory(events)).toEqual(expected);
    expect(projectDrillHistory([...events].reverse())).toEqual(expected);
  });
  for (const source of ['owner', 'usage', 'events'] as const) {
    it(`${source}: a failed, missing or capped read cannot substitute an empty rotation`, async () => {
      for (const invalid of [{ data: [], error: new Error('unavailable') }, { data: null, error: null },
        { data: Array(DRILL_HISTORY_LIMIT).fill({}), error: null }]) {
        const sources = { owner: Promise.resolve({ data: [], error: null }), usage: Promise.resolve({ data: [], error: null }), events: Promise.resolve({ data: [], error: null }), [source]: Promise.resolve(invalid) };
        await expect(readDrillCirculation(sources)).rejects.toThrow();
      }
    });
  }
  it('real empty sources succeed and usage preserves exact counts without authoring effectiveness', async () => {
    expect(await readDrillCirculation({ owner: Promise.resolve({ data: [], error: null }),
      usage: Promise.resolve({ data: [{ drill_id: 'one', completed: 3, returned: 2 }], error: null }),
      events: Promise.resolve({ data: [], error: null }) }))
      .toEqual({ rows: [], usage: { one: { completed: 3, returned: 2 } }, served: {}, completedOn: {} });
  });
});