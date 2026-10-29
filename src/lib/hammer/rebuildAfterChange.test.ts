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