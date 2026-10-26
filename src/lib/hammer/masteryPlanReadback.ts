import type {HammerDailyPlanResult} from './prescription/dailyPlan';
import {masteryPlanGuidance,type MasteryGuidance} from '../../../supabase/functions/_shared/wic/masteryPlanContext';

/** A failed source read is not a successful unknown identity. Saved days need no fresh identity. */
export function masterySnapshotReady(saved:{isPending:boolean;isError:boolean;hasSportDay:boolean},identity:{isPending:boolean;isError:boolean;isFetching:boolean}){
 return !saved.isPending&&!saved.isError&&(saved.hasSportDay||(!identity.isPending&&!identity.isError&&!identity.isFetching));
}
const skills=new Set(['hitting','throwing','defense','speed','baserunning']);
type SavedBlock={modality:string;side?:'L'|'R'|null;status?:string;drills?:unknown;steps?:unknown;because?:unknown;roadmapReason?:unknown;durationMin?:unknown};
/** Retain the saved skill order/content, but never reopen a current safety-suppressed block. */
export function masteryPlanReadback(plan:HammerDailyPlanResult,payload:unknown,sport:string,date:string):HammerDailyPlanResult{
 if(!payload||typeof payload!=='object')return plan;
 const saved=payload as Record<string,unknown>;
 if(saved.sport!==sport||saved.plan_date!==date||!masteryPlanGuidance({guidance:saved.masteryFocus})||!Array.isArray(saved.blocks))return plan;
 const rows=saved.blocks.filter((b):b is SavedBlock=>!!b&&typeof b==='object'&&typeof b.modality==='string');
 const key=(b:{modality:string;side?:'L'|'R'|null})=>`${b.modality}:${b.side??''}`;
 const order=new Map(rows.map((b,i)=>[key(b),i]));
 const blocks=plan.blocks.map(b=>{
  const prior=rows.find(r=>key(r)===key(b));
  if(!skills.has(b.modality)||b.status!=='ready'||!prior||prior.status!=='ready'||!Array.isArray(prior.drills))return b;
  if(!prior.drills.every(d=>d&&typeof d==='object'&&typeof d.name==='string'&&typeof d.dosage==='string'))return b;
  // A current reduced/changed dose is a safety decision, not permission to restore older work.
  const signature=(drills:readonly {name:string;slug?:string|null;dosage:string}[])=>JSON.stringify(drills.map(d=>[d.slug??d.name,d.dosage]));
  if(signature(b.drills)!==signature(prior.drills))return b;
  return {...b,drills:prior.drills as typeof b.drills,steps:Array.isArray(prior.steps)&&prior.steps.every(v=>typeof v==='string')?prior.steps:b.steps,
   because:Array.isArray(prior.because)&&prior.because.every(v=>typeof v==='string')?prior.because:b.because,
   roadmapReason:typeof prior.roadmapReason==='string'?prior.roadmapReason:b.roadmapReason,
   durationMin:typeof prior.durationMin==='number'?prior.durationMin:prior.durationMin===null?null:b.durationMin};
 });
 const slots=blocks.map((b,i)=>skills.has(b.modality)?i:-1).filter(i=>i>=0);
 const ordered=slots.map(i=>blocks[i]).sort((a,b)=>(order.get(key(a))??Number.MAX_SAFE_INTEGER)-(order.get(key(b))??Number.MAX_SAFE_INTEGER));
 const out=[...blocks];slots.forEach((slot,i)=>{out[slot]=ordered[i];});
 return {...plan,blocks:out};
}
export type {MasteryGuidance};