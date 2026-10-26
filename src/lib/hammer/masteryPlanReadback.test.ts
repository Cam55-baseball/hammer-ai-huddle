import {describe,expect,it,vi} from 'vitest';
import {masteryPlanReadback,masterySnapshotReady} from './masteryPlanReadback';
import {planSnapshotPayload,savePlanSnapshot} from './planSnapshot';
import {buildHammerDailyPlan} from './prescription/dailyPlan';
import {NORMAL_SIGNAL} from './prescription/scheduleContext';
import type {ContextVariable,HammerAthleteContext} from './context/athleteContext';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc}}));
const saved={isPending:false,isError:false,hasSportDay:false};
const ready={isPending:false,isError:false,isFetching:false};
const focus={observedFocus:'defense',sourceIds:['human-fielding-65'],reason:'Defense is the weakest judged pillar.',leftPowerStealEmphasis:false};
function build(sport:string,focused=false){
 const values={sport_primary:sport,position_primary:'SS',lifecycle_band:'adult',season_phase:'off',lifting_age_years:.5,weekly_availability_days:6,injury_history:[],equipment_effective:['field','glove','ball','gamer_bat','tee'],category_goals:{version:1,updatedAt:'2026-10-26',goals:['hitting','fielding','throwing','speed','power'].map((category,i)=>({category,rank:i+1,intent:null}))}};
 const variables=Object.entries(values).map(([key,value])=>({key,value})) as ContextVariable[];
 const ctx={variables,get:(key:string)=>variables.find(v=>v.key===key),missing:[],missingCount:0,isLoading:false,envelope:null} as HammerAthleteContext;
 return buildHammerDailyPlan(ctx,NORMAL_SIGNAL,null,null,undefined,new Date(2026,9,26),{masteryFocus:focused?focus:undefined});
}
describe('first plan identity readiness and canonical snapshot replay',()=>{
 it('pending or failed first-read identity cannot commit a baseline as the final plan',()=>{
  expect(masterySnapshotReady(saved,{...ready,isPending:true})).toBe(false);
  expect(masterySnapshotReady(saved,{...ready,isError:true})).toBe(false);
  expect(masterySnapshotReady(saved,{...ready,isFetching:true})).toBe(false);
  expect(masterySnapshotReady(saved,ready)).toBe(true);
 });
 it('saved sport day needs no new identity; failed or pending saved-day lookup still blocks writes',()=>{
  expect(masterySnapshotReady({...saved,hasSportDay:true},{...ready,isPending:true,isError:true})).toBe(true);
  expect(masterySnapshotReady({...saved,isPending:true},ready)).toBe(false);
  expect(masterySnapshotReady({...saved,isError:true},ready)).toBe(false);
 });
 for(const sport of ['baseball','softball'])it(`${sport}: first focus save and reload retain exact skill dose, reasons, order and sources`,async()=>{
  mock.rpc.mockResolvedValue({error:null});mock.rpc.mockClear();
  const plan=build(sport,true);const payload=planSnapshotPayload(plan,sport,'2026-10-26',focus);
  if(masterySnapshotReady(saved,{...ready,isPending:true}))await savePlanSnapshot('athlete',plan,sport,'2026-10-26',focus);
  expect(mock.rpc).not.toHaveBeenCalled();
  if(masterySnapshotReady(saved,ready))await savePlanSnapshot('athlete',plan,sport,'2026-10-26',focus);
  expect(mock.rpc).toHaveBeenCalledWith('wk_save_block_day',expect.objectContaining({p_sport:sport,p_payload:payload}));
  const reloaded=masteryPlanReadback(build(sport),JSON.parse(JSON.stringify(payload)),sport,'2026-10-26');
  const skills=(p:typeof plan)=>p.blocks.filter(b=>['hitting','defense','throwing','speed','baserunning'].includes(b.modality));
  expect(skills(reloaded).map(b=>b.modality)).toEqual(skills(plan).map(b=>b.modality));
  for(const b of skills(reloaded).filter(b=>b.status==='ready')){
   const original=payload.blocks.find(o=>o.modality===b.modality&&(o.side??null)===(b.side??null));
   expect(b.drills).toEqual(original?.drills);expect(b.because).toEqual(original?.because);expect(b.durationMin).toBe(original?.durationMin);
  }
  expect(reloaded.blocks.find(b=>b.modality==='strength')).toEqual(build(sport).blocks.find(b=>b.modality==='strength'));
  expect(payload.masteryFocus?.sourceIds).toEqual(['human-fielding-65']);
 });
 it('readback never reopens a currently suppressed skill or invents opposite-sport/date guidance',()=>{
  const plan=build('baseball');const payload=planSnapshotPayload(build('baseball',true),'baseball','2026-10-26',focus);
  const held={...plan,blocks:plan.blocks.map(b=>b.modality==='defense'?{...b,status:'suppressed' as const,drills:[],because:['Arm rest wins']}:b)};
  expect(masteryPlanReadback(held,payload,'baseball','2026-10-26').blocks.find(b=>b.modality==='defense')).toEqual(held.blocks.find(b=>b.modality==='defense'));
  expect(masteryPlanReadback(plan,payload,'softball','2026-10-26')).toBe(plan);
  expect(masteryPlanReadback(plan,payload,'baseball','2026-10-27')).toBe(plan);
  expect(masteryPlanReadback(plan,{...payload,masteryFocus:{...focus,sourceIds:[]}},'baseball','2026-10-26')).toBe(plan);
 });
 it('failed snapshot save returns false rather than claiming canonical persistence',async()=>{
  mock.rpc.mockResolvedValue({error:{message:'write failed'}});
  expect(await savePlanSnapshot('athlete',build('baseball'),'baseball','2026-10-26',focus)).toBe(false);
 });
 it('a current reduced ready-block dose is never overwritten by the older saved dose',()=>{
  const plan=build('baseball',true);const payload=planSnapshotPayload(plan,'baseball','2026-10-26',focus);
  const reduced={...plan,blocks:plan.blocks.map(b=>b.modality==='hitting'?{...b,drills:b.drills.map(d=>({...d,dosage:'1 actual safe rep'})),because:['Current safety reduction']}:b)};
  const replay=masteryPlanReadback(reduced,payload,'baseball','2026-10-26');
  expect(replay.blocks.find(b=>b.modality==='hitting')).toEqual(reduced.blocks.find(b=>b.modality==='hitting'));
 });
 it('eight weekly saved windows keep their own focus lineage across later identity changes',()=>{
  for(let week=0;week<8;week++){
   const date=new Date(Date.UTC(2026,9,26+week*7)).toISOString().slice(0,10);const plan=build('baseball',true);
   const datedFocus={...focus,sourceIds:[`window-${week}`]};const payload=planSnapshotPayload(plan,'baseball',date,datedFocus);
   const replay=masteryPlanReadback(plan,JSON.parse(JSON.stringify(payload)),'baseball',date);
   expect(replay.blocks.map(b=>[b.modality,b.drills.map(d=>d.dosage)])).toEqual(plan.blocks.map(b=>[b.modality,b.drills.map(d=>d.dosage)]));
   expect(payload.masteryFocus?.sourceIds).toEqual([`window-${week}`]);
   expect(masteryPlanReadback(plan,payload,'baseball','2026-11-01')).toBe(plan);
  }
 });
});