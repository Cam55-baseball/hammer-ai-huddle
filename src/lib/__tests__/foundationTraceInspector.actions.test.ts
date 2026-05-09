/**
 * Phase I — replay/recompute action state machine + double-submit guard.
 */
import { describe, it, expect } from 'vitest';

type State = 'idle' | 'pending' | 'ok' | 'error';

function makeRunner() {
  const states = new Map<string, State>();
  let inflight = 0;

  async function run(key: string, work: () => Promise<{ ok: boolean }>) {
    if (states.get(key) === 'pending') return { skipped: true as const };
    states.set(key, 'pending');
    inflight += 1;
    try {
      const r = await work();
      states.set(key, r.ok ? 'ok' : 'error');
      return { skipped: false as const, ok: r.ok };
    } finally {
      inflight -= 1;
    }
  }

  return { states, run, getInflight: () => inflight };
}

describe('replay/recompute action state machine', () => {
  it('transitions idle → pending → ok', async () => {
    const r = makeRunner();
    const p = r.run('k', async () => ({ ok: true }));
    expect(r.states.get('k')).toBe('pending');
    await p;
    expect(r.states.get('k')).toBe('ok');
  });

  it('transitions to error on failure', async () => {
    const r = makeRunner();
    await r.run('k', async () => ({ ok: false }));
    expect(r.states.get('k')).toBe('error');
  });

  it('rejects double-submit while pending', async () => {
    const r = makeRunner();
    let release!: () => void;
    const p = r.run('k', () => new Promise<{ ok: boolean }>(resolve => { release = () => resolve({ ok: true }); }));
    const second = await r.run('k', async () => ({ ok: true }));
    expect(second).toEqual({ skipped: true });
    expect(r.getInflight()).toBe(1);
    release();
    await p;
  });

  it('uses distinct keys for replay vs recompute on the same trace', async () => {
    const r = makeRunner();
    await r.run('t1', async () => ({ ok: true }));
    await r.run('recompute:t1', async () => ({ ok: true }));
    expect(r.states.get('t1')).toBe('ok');
    expect(r.states.get('recompute:t1')).toBe('ok');
  });
});
