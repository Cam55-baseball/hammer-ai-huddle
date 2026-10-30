import {armBudget,throwUnits,type ThrowEvent,type ThrowRole} from '../../../../supabase/functions/_shared/wic/phases/armLedger';
import {equivalentsByDay} from '../../../../supabase/functions/_shared/wic/phases/nextThrowDate';
import type {PlanningArmHistory} from './pitchingDay';

/** Removal-only final envelope over explicit arm metadata across every card. */
export function finalArmGuard<T extends {status:string;drills:readonly D[];because?:readonly string[]},D extends {armEvent?:ThrowEvent}>(blocks:readonly T[],input:{sport:'baseball'|'softball';role:ThrowRole;age:number|null;date:string;history?:PlanningArmHistory}):T[]{
 const budget=armBudget(input);
 const by=equivalentsByDay((input.history?.rows??[]).filter(r=>r.entry_date<=input.date));
 const since=new Date(Date.parse(input.date)-6*86400000).toISOString().slice(0,10);
 let room=input.history && !input.history.unavailable && input.age!==null ? Math.max(0,Math.min(budget.daily-(by.get(input.date)??0),budget.weekly-[...by].filter(([d])=>d>=since).reduce((n,[,v])=>n+v,0))) : 0;
 return blocks.map(block=>{
  if(block.status!=='ready')return block;
  const drills=block.drills.filter(d=>{
   if(!d.armEvent)return true;
   const cost=throwUnits([d.armEvent]);
   if(cost>room)return false;
   room-=cost;return true;
  });
  return drills.length===block.drills.length?block:{...block,drills,because:[...(block.because??[]),'Pitching and position throws use one arm budget. Extra throwing was left out to keep you within it.']};
 });
}