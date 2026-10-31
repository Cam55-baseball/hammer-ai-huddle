import {armBudget,throwUnits,type ThrowEvent,type ThrowRole} from '../../../../supabase/functions/_shared/wic/phases/armLedger';
import {equivalentsByDay} from '../../../../supabase/functions/_shared/wic/phases/nextThrowDate';
import type {PlanningArmHistory} from './pitchingDay';

type GuardDrill={armEvent?:ThrowEvent;name?:string;stage?:string;armCard?:string};
type ThrowKind='warmup'|'pitching'|'position';

const WARMUP_TOSS=/warm-up toss|warm-up throws/i;
/** Owner Oct 31 priority: warm-up throws always first; then position throws are cut before
 *  pitching — unless the player asked to limit their pitching, then pitching is cut first. */
export function throwKind(d:GuardDrill,blockModality?:string):ThrowKind{
 if(d.stage!=='full_go'&&WARMUP_TOSS.test(d.name??''))return 'warmup';
 if(d.armCard==='pitching'||(d.armCard!=='throwing'&&blockModality==='pitching'))return 'pitching';
 return 'position';
}

export const NO_THROWING_REASON="No throwing today: your arm budget can't fit warm-up throws plus a throwing activity. Your arm gets the day to recover.";

/** Removal-only final envelope over explicit arm metadata across every card. */
export function finalArmGuard<T extends {status:string;modality?:string;drills:readonly D[];because?:readonly string[]},D extends GuardDrill>(blocks:readonly T[],input:{sport:'baseball'|'softball';role:ThrowRole;age:number|null;date:string;history?:PlanningArmHistory;limitPitching?:boolean}):T[]{
 const budget=armBudget(input);
 const by=equivalentsByDay((input.history?.rows??[]).filter(r=>r.entry_date<=input.date));
 const since=new Date(Date.parse(input.date)-6*86400000).toISOString().slice(0,10);
 let room=input.history && !input.history.unavailable && input.age!==null ? Math.max(0,Math.min(budget.daily-(by.get(input.date)??0),budget.weekly-[...by].filter(([d])=>d>=since).reduce((n,[,v])=>n+v,0))) : 0;
 const order:ThrowKind[]=input.limitPitching?['warmup','position','pitching']:['warmup','pitching','position'];
 const rows:{bi:number;di:number;kind:ThrowKind;cost:number}[]=[];
 blocks.forEach((b,bi)=>{if(b.status!=='ready')return;b.drills.forEach((d,di)=>{if(d.armEvent)rows.push({bi,di,kind:throwKind(d,b.modality),cost:throwUnits([d.armEvent])});});});
 const kept=new Set<string>();const cut=new Set<ThrowKind>();
 for(const kind of order)for(const r of rows.filter(x=>x.kind===kind)){
  if(r.cost>room){cut.add(kind);continue;}
  room-=r.cost;kept.add(`${r.bi}:${r.di}`);
 }
 const hadActivity=rows.some(r=>r.kind!=='warmup');
 const keptActivity=rows.some(r=>r.kind!=='warmup'&&kept.has(`${r.bi}:${r.di}`));
 const warmupsFit=!rows.some(r=>r.kind==='warmup'&&!kept.has(`${r.bi}:${r.di}`));
 const noThrowing=hadActivity&&(!keptActivity||!warmupsFit);
 const firstCut=input.limitPitching?'pitching':'position';
 return blocks.map((block,bi)=>{
  if(block.status!=='ready')return block;
  const drills=block.drills.filter((d,di)=>!d.armEvent||(!noThrowing&&kept.has(`${bi}:${di}`)));
  if(drills.length===block.drills.length)return block;
  if(noThrowing){
   const armCard=block.modality==='pitching'||block.modality==='throwing'||block.modality===undefined;
   return {...block,drills,status:armCard?'suppressed':block.status,because:[...(block.because??[]),NO_THROWING_REASON]};
  }
  const why=cut.has(firstCut)&&!cut.has(firstCut==='position'?'pitching':'position')
   ? (input.limitPitching?'You asked to limit your pitching, so pitching throws were cut first to stay inside your arm budget. Warm-up throws are kept.':'Position throws were cut first to stay inside your arm budget. Warm-up throws and pitching are kept.')
   : 'Pitching and position throws use one arm budget. Extra throwing was left out to keep you within it. Warm-up throws are kept first.';
  return {...block,drills,because:[...(block.because??[]),why]};
 });
}
