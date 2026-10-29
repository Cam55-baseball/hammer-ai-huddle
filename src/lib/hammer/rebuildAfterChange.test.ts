import { beforeEach, expect, it, vi } from 'vitest';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
import { rebuildAfterChange } from './rebuildAfterChange';
beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue({ data: { ok: true }, error: null }); });
it('rebuilds today and next six days through the existing adjustment path', async () => {
  const result = await rebuildAfterChange('Season changed', '2026-10-29');
  expect(result.ok).toBe(true);
  expect(invoke.mock.calls.map(c => c[1].body.plan_date)).toEqual(['2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04']);
  expect(invoke.mock.calls.every(c => c[0] === 'wk-generate-daily' && c[1].body.change_reason === 'player_request')).toBe(true);
});
it('a rejected day never confirms successful rebuilding', async () => {
  invoke.mockResolvedValueOnce({ error: new Error('Safety refused') });
  const result = await rebuildAfterChange('Schedule changed', '2026-10-29');
  expect(result.ok).toBe(false); expect(result.failed).toEqual(['2026-10-29']);
});
it('empty or unconfirmed responses are not successful rebuilds', async () => {
  invoke.mockResolvedValueOnce({ data: null, error: null });
  expect((await rebuildAfterChange('Season changed', '2026-10-29')).failed).toEqual(['2026-10-29']);
});
it('future-effective changes rebuild their next seven dates rather than the current week', async () => {
  await rebuildAfterChange('Season changed', '2026-10-29', '2026-11-05');
  expect(invoke.mock.calls.map(c => c[1].body.plan_date)).toEqual(['2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09','2026-11-10','2026-11-11']);
});
it('a saved safe-session fallback is not a full-program rebuild', async () => {
  invoke.mockResolvedValueOnce({data:{ok:true,degraded:true,safe_plan_tier:'safe_session'},error:null});
  const result=await rebuildAfterChange('Availability changed','2026-10-29');
  expect(result.ok).toBe(false);
  expect(result.failed).toEqual(['2026-10-29']);
});