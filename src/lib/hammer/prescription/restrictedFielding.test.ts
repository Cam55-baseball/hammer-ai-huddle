import {describe,it,expect} from 'vitest';
import {restrictedFielding} from './restrictedFielding';
import {selectDefenseDrills} from './defenseLibrary';
import {buildHammerDailyPlan} from './dailyPlan';
import {contextFromEnvelope} from '../context/contextProjection';
describe('restricted owner fielding floor',()=>{
 it('shoulder and ankle keep four saved-day opportunities without throws or loaded footwork',()=>{
  const ctx=contextFromEnvelope(Object.fromEntries(Object.entries({sport_primary:'baseball',position_primary:'SS',season_phase:'off',weekly_availability_days:6,lifting_age_years:10,injury_history:[{region:'ankle',severity:'managing'},{region:'shoulder',severity:'moderate'}]}).map(([k,value])=>[k,{value,source:'test',owner:'athlete',confidence:'high',missing:false,last_updated:null}])));
  let count=0;for(let i=0;i<7;i++){
   const p=buildHammerDailyPlan(ctx,undefined,null,null,undefined,new Date(2026,10,2+i),{subscriptionModules:['hitting','pitching','throwing']});
   const b=p.blocks.find(b=>b.modality==='defense');
   if(b?.status==='ready'&&b.drills.length){count++;expect(b.drills.every(d=>!d.armEvent&&d.stage!=='full_go'&&d.setup?.includes('stay seated'))).toBe(true);}
  }expect(count).toBeGreaterThanOrEqual(4);
 });
 it('never promotes unknown catalog drills or unaffected athletes',()=>{
  expect(restrictedFielding([{name:'Owner sprint',dosage:'20 reps'}],['ankle'])).toBeNull();
  expect(restrictedFielding(selectDefenseDrills({position:'SS',sport:'baseball',seasonPhase:'off'})?.drills??[],[])).toBeNull();
 });
});