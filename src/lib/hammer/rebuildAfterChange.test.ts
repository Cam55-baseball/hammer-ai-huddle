import { beforeEach, expect, it, vi } from 'vitest';
const { invoke,readWeek } = vi.hoisted(() => ({ invoke: vi.fn(),readWeek:vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('./readComposedWeek',()=>({readComposedWeek:readWeek}));
import { rebuildAfterChange } from './rebuildAfterChange';
beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue({ data: { ok: true, composed: true,sport:'baseball',user_id:'test-self',bunting_entitled:true }, error: null });readWeek.mockReset();readWeek.mockResolvedValue({issues:[]}); });
it('rebuilds today and next six days through the existing adjustment path', async () => {
  const result = await rebuildAfterChange('Season changed', '2026-10-29');
  expect(result.ok).toBe(true);
  expect(invoke.mock.calls.map(c => c[1].body.plan_date)).toEqual(['2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04']);
  expect(invoke.mock.calls.every(c => c[0] === 'wk-generate-daily' && c[1].body.change_reason === 'player_request')).toBe(true);
  expect(invoke.mock.calls.every(c => c[1].body.compose_sport_day === true)).toBe(true);
  expect(readWeek).toHaveBeenCalledWith('test-self','2026-10-29','2026-11-04','baseball',true);
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
it('physical-only save is not confirmed as sport-plus-physical success',async()=>{
  invoke.mockResolvedValueOnce({data:{ok:true},error:null});
  expect((await rebuildAfterChange('Schedule changed','2026-10-29')).failed).toEqual(['2026-10-29']);
});
it('saved restricted week below four defense days never reports floors certified',async()=>{
  readWeek.mockResolvedValue({issues:['Defense:0/4']});const r=await rebuildAfterChange('Schedule changed','2026-10-29');expect(r.ok).toBe(false);expect(r.weekIssues).toEqual(['Defense:0/4']);
});const httpError=(body:unknown)=>Object.assign(new Error('http'),{context:new Response(JSON.stringify(body),{status:409})});
it('today with marked work is kept, not reported as a failure to retry',async()=>{
  invoke.mockResolvedValueOnce({data:null,error:httpError({error:'adjust_failed',message:'Saved chosen or marked work is protected; no whole-day replacement'})});
  const r=await rebuildAfterChange('Season changed','2026-10-29');
  expect(r.failed).toEqual([]);expect(r.kept).toEqual(['2026-10-29']);
  expect(r.message).toContain('rebuilt for the other 6 days');expect(r.message).toContain('Today kept the work you already marked done');
});
it('missing starting details stop the rebuild with a plain reason',async()=>{
  invoke.mockResolvedValue({data:null,error:httpError({error:'initial_inputs_missing'})});
  const r=await rebuildAfterChange('Season changed','2026-10-29');
  expect(r.ok).toBe(false);expect(r.missingInputs).toBe(true);expect(invoke).toHaveBeenCalledTimes(1);
  expect(r.message).toContain('finish your missing starting details');
});
