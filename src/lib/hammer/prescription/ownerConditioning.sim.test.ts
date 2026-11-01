import { it, expect, afterEach } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { contextFromEnvelope } from '../context/contextProjection';
import { NORMAL_SIGNAL } from './scheduleContext';
import { setOwnerPlanDrills } from '@/lib/prescription/ownerPlanDrills';
import { placeOwnerConditioning } from '../../../../supabase/functions/_shared/wic/conditioning/placeOwnerConditioning';
import { mapPhysio } from '../../../../supabase/functions/_shared/health/physioMapping';
import { activeInjuryAreas, addInjuryCheck, injuryCheckPainByDate, markAreaHealed } from '../../../../supabase/functions/_shared/health/fullGo';
const owners:any[]=['jump','carry','sled'].map(kind=>({id:kind,name:`Owner ${kind}`,active:true,placements:['hammers_today:conditioning'],sports:['baseball','softball'],equipment:[],conditioning_kind:kind,rounds:4,contacts:4,carry_yards:50,load_lbs:20,work_seconds:20,rest_seconds:180,conditioning_programs:['pitcher'],pitch_role_fit:['starter'],dosage:'4 rounds',cue:'Controlled',steps:['Work'],fault_keys:[],pinned:false,created_at:''}));
afterEach(()=>setOwnerPlanDrills([]));
it('eight weeks through the real daily builder and physical placement preserve jumps, yards and rest',()=>{
 setOwnerPlanDrills(owners);const served=new Set<string>();
 for(let n=0;n<56;n++){
  const date=new Date(Date.UTC(2026,5,1+n,12));const iso=date.toISOString().slice(0,10);
  const values={sport_primary:'baseball',position_primary:'P',season_phase:'off',weekly_availability_days:6,injury_history:[],equipment_effective:['sled','bands','glove','ball'],lifecycle_band:'adult',age_years:20,lifting_age_years:4,development_priorities:['speed']};
  const envelope=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:v,source:'fixture',confidence:'high',missing:false,last_updated:null,owner:'athlete'}]));
  const plan=buildHammerDailyPlan(contextFromEnvelope(envelope),NORMAL_SIGNAL,null,null,undefined,date,{subscriptionModules:['baseball_pitcher'],resolvedSeasonPhase:'off',armHistory:{rows:[]}});
  for(const b of plan.blocks)for(const d of b.drills){const dose=(d as any).conditioningDose;if(dose){served.add(dose.kind);expect(dose.contacts===null||dose.contacts*dose.rounds<=dose.contactAllowance).toBe(true);expect(date.getUTCDay()).not.toBe(0);}}
  // The physical writer uses the same actual day's legal rest/game answer;
  // its existing catalog slots remain independent of sport skill blocks.
  const rest=plan.sanity?.ok===true&&date.getUTCDay()===0;
  const physical=placeOwnerConditioning([{movement_slug:'j',slot:'plyo',sets:3,reps:8},{movement_slug:'c',slot:'lift',sets:3,reps:1},{movement_slug:'s',slot:'speed',sets:3,reps:1}],
   [{slug:'j',exposure_channel:'elastic',contacts_per_rep:1,plyo_tier:3},{slug:'c',category:'carry'},{slug:'s',speed_category:'resisted'}],owners,{sport:'baseball',isPitcher:true,modules:['baseball_pitcher'],role:'starter',date:iso,low:n%2===0,rest,game:false,restricted:false,equipment:[]}).rows;
  if(!rest)for(const row of physical){const d=(row as any).why_payload.owner_conditioning;served.add(d.kind);expect(d.rounds*d.distance_feet/3).toBeLessThanOrEqual(1000);if(d.contacts!==null)expect(d.rounds*d.contacts).toBeLessThanOrEqual(24);}
  else expect(physical.every(r=>!(r as any).why_payload?.owner_conditioning)).toBe(true);
 }
 expect([...served].sort()).toEqual(['carry','jump','sled']);
});
it('rep pain remains an active area caution through check-in and clears only through healed flow',()=>{
 let history:any[]=[{region:'calf',severity:'light',participation:'modified',reported_at:'2026-11-02',source_event_id:'rep-pain'}];
 expect(activeInjuryAreas(history)).toEqual(['calf']);expect(mapPhysio({injuries:history,today:'2026-11-03'}).activeAreas).toContain('calf');
 history=addInjuryCheck(history,'calf',{date:'2026-11-03',pain:4,function:6});
 expect(injuryCheckPainByDate(history).get('2026-11-03')).toBe(4);
 const healed=markAreaHealed(history,'calf','self','2026-11-04').next;
 expect(activeInjuryAreas(healed)).toEqual([]);expect(mapPhysio({injuries:healed,today:'2026-11-04'}).healedAreas).toContain('calf');
});