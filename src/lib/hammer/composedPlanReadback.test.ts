import{describe,expect,it}from 'vitest';
import{buildHammerDailyPlan}from './prescription/dailyPlan';
import{contextFromEnvelope}from './context/contextProjection';
import{composedPlanReadback}from './composedPlanReadback';
const ctx=contextFromEnvelope(Object.fromEntries(Object.entries({sport_primary:'baseball',position_primary:'SS',lifecycle_band:'adult',season_phase:'off',weekly_availability_days:6,injury_history:[],equipment_effective:['bat'],lifting_age_years:2}).map(([k,value])=>[k,{value,owner:'athlete' as const,source:'test',confidence:'high' as const,missing:false,last_updated:null}])));
describe('certified composed day readback',()=>{
 it('returns exact saved block content for its date and sport rather than fresh reconstruction',()=>{
   const p=buildHammerDailyPlan(ctx,undefined,null,null,undefined,new Date('2026-10-29T12:00:00Z'));
   const block=p.blocks.find(b=>b.modality==='hitting');if(!block)throw new Error('No hitting block');
   const blocks=[{...block,because:['Saved exact reason'],drills:[{name:'Saved chosen work',dosage:'12 swings',stage:'drills' as const}]}];
   const payload={composition_version:'sport_physical_v1',sport:'baseball',plan_date:'2026-10-29',blocks};
   expect(composedPlanReadback(p,payload,'baseball','2026-10-29').blocks).toBe(blocks);
   expect(composedPlanReadback(p,payload,'softball','2026-10-29')).toBe(p);
   expect(composedPlanReadback(p,payload,'baseball','2026-10-30')).toBe(p);
 });
 it('does not promote a legacy or malformed snapshot into a certified full day',()=>{
   const p=buildHammerDailyPlan(ctx);expect(composedPlanReadback(p,{sport:'baseball',plan_date:'2026-10-29',blocks:[]},'baseball','2026-10-29')).toBe(p);
   expect(composedPlanReadback(p,{composition_version:'sport_physical_v1',sport:'baseball',plan_date:'2026-10-29',blocks:[{modality:'hitting',drills:[]}]},'baseball','2026-10-29')).toBe(p);
 });
});