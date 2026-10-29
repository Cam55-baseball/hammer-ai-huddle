import { buildPitchingMicrocycle, type PitcherDayType } from '../pitching/pitchingMicrocycle';
import { DEFAULT_PITCHER_PROFILE } from '../pitching/pitcherProfile';
import type { QuarterDescriptor } from '../roadmap/seasonQuarters';
import type { OutingFacts } from '../../../../supabase/functions/_shared/wic/pitching/outingFacts';
import type { EassDrill } from './eassLibrary';
import { armBudget, throwUnits, windmillCheck, type ThrowRole, type ThrowEvent } from '../../../../supabase/functions/_shared/wic/phases/armLedger';
import { equivalentsByDay, type ArmRow } from '../../../../supabase/functions/_shared/wic/phases/nextThrowDate';
import { PITCH_SMART_BANDS, bandIndex, restDaysFor, pitchSmartApplies, thirdConsecutiveGameDay } from '../../../../supabase/functions/_shared/wic/phases/youthThrowing';
import { u13ThrowBlockFrom } from '../../../../supabase/functions/_shared/wic/phases/u13ThrowGate';
import { planWindmillSession } from '../../../../supabase/functions/_shared/wic/pitching/windmillProgram';

export interface PlanningArmHistory { rows: readonly ArmRow[]; unavailable?: boolean }

/** Adapt only the canonical windmill program, never baseball weighted-ball work. */
export function windmillPlanningDrills(input:{date:string;phase:string;age:number|null;readiness:number|null;armPain:boolean;equipment:string[];history?:PlanningArmHistory;outings?:OutingFacts|null}):EassDrill[]{
 if(!input.history||input.history.unavailable||input.age==null||input.armPain)return [];
 const pitchRows=input.history.rows.filter(r=>r.source==='pitching'&&!/skip|cancel|miss/i.test(r.status??''));
 const days=[...new Set(pitchRows.map(r=>r.entry_date))].map(date=>({date,pitches:pitchRows.filter(r=>r.entry_date===date).reduce((n,r)=>n+(r.count??0),0),innings:0}));
 const session=planWindmillSession({planDate:input.date,phase:input.phase,age:input.age,readiness:input.readiness,armPain:input.armPain,growthMode:false,history:days,todayPitchesSoFar:days.find(d=>d.date===input.date)?.pitches??0,gameToday:!!input.outings?.startsToday,gameTomorrow:!!input.outings?.startsTomorrow,priorFullSessionsThisWeek:days.filter(d=>d.date>=new Date(Date.parse(input.date)-6*86400000).toISOString().slice(0,10)&&d.pitches>0).length,fullSessionYesterday:days.some(d=>d.date===new Date(Date.parse(input.date)-86400000).toISOString().slice(0,10)&&d.pitches>0),equipment:input.equipment});
 return session.rows.map(r=>({slug:r.slug,name:r.name,category:r.kind==='pitch'?'position_skill' as const:r.countWeight>0?'regulation' as const:'band_prep' as const,overloadClass:r.countWeight>0?'regulation' as const:undefined,intensity:r.kind==='pitch'?'moderate' as const:'prep' as const,stage:r.kind==='pitch'?'full_go' as const:'prep' as const,dosage:r.kind==='pitch'?`${r.sets*r.reps} pitches`:`${r.sets}x${r.reps} reps`,cue:r.cue,stopIf:'Shoulder or elbow pain, fatigue or unsafe space — stop.'}));
}

/** Count only explicitly declared throw quantities; no timed catch estimate. */
export function eassArmEvent(drill: EassDrill): ThrowEvent | null {
  if (['band_prep','cooldown','recovery'].includes(drill.category)) return null;
  if (drill.category === 'position_skill' && drill.overloadClass == null) return null;
  const dose = drill.dosage;
  const sets = /^(\d+)\s*[x×]\s*(\d+)\b/i.exec(dose);
  const distance = /(?:ft\s*x\s*|ft\s*[x×]\s*)(\d+)/i.exec(dose);
  const explicit = /(?:~)?(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:throws|pitches|reps|windmill circles)\b/i.exec(dose);
  const count = sets ? Number(sets[1])*Number(sets[2]) : distance ? Number(distance[1]) : explicit ? Number(explicit[2]??explicit[1]) : null;
  if (count == null || !Number.isFinite(count)) return null;
  return {kind:/pitches\b/i.test(dose)?'pitch':drill.category==='regulation'?'warmup':'practice',count,
    intent:['high','max'].includes(drill.intensity)?'high':drill.intensity==='moderate'?'moderate':'low',estimated:false};
}

/** Keep the existing arm law, counting pitching and position work in one budget. */
export function guardArmDrills(drills: readonly EassDrill[], input:{date:string;sport:'baseball'|'softball';role:ThrowRole;age:number|null;level:string|null;history?:PlanningArmHistory}): EassDrill[] {
  const history=input.history;
  const care=drills.filter(d=>['band_prep','cooldown','recovery'].includes(d.category));
  if(!history || history.unavailable || input.age==null) return care;
  const rows=(history?.rows??[]).filter(r=>r.entry_date<=input.date && !/skip|missed|cancel/i.test(r.status??''));
  const by=equivalentsByDay(rows);
  const pitchRows=rows.filter(r=>r.source==='pitching'&&!/warm|catch|flat|off_mound/i.test(r.throw_type??''));
  const dates=pitchRows.filter(r=>(r.count??0)>0).map(r=>r.entry_date);
  const priorDays=[...by].map(([date,throws])=>({date,throws,pitches:pitchRows.filter(r=>r.entry_date===date).reduce((n,r)=>n+(r.count??0),0)}));
  if(input.sport==='baseball') {
    if(u13ThrowBlockFrom(input.age,priorDays,input.date))return care;
    if(pitchSmartApplies(input.age,input.level)) {
      const band=PITCH_SMART_BANDS[bandIndex(input.age)];
      if(thirdConsecutiveGameDay(dates,input.date))return care;
      if([...by].some(([date,n])=>date<input.date && Math.round((Date.parse(input.date)-Date.parse(date))/86400000)-1<restDaysFor(band,Math.ceil(n))))return care;
    }
  } else if(windmillCheck(input.age,priorDays.map(d=>({date:d.date,pitches:d.pitches,innings:0})),input.date,{pitches:pitchRows.filter(r=>r.entry_date===input.date).reduce((n,r)=>n+(r.count??0),0)+1,innings:0}).length)return care;
  const budget=armBudget({sport:input.sport,role:input.role,age:input.age});
  let room=Math.max(0,Math.min(budget.daily-(by.get(input.date)??0),budget.weekly-[...by].filter(([date])=>date>=new Date(Date.parse(input.date)-6*86400000).toISOString().slice(0,10)).reduce((n,[,v])=>n+v,0)));
  let pitchRoom=Math.max(0,(input.sport==='baseball'&&pitchSmartApplies(input.age,input.level)?PITCH_SMART_BANDS[bandIndex(input.age)].dailyMax:budget.daily)-pitchRows.filter(r=>r.entry_date===input.date).reduce((n,r)=>n+(r.count??0),0));
  const kept=new Set<EassDrill>(care);
  // Reserve the already-declared pitching dose before off-mound supplements.
  for(const d of [...drills.filter(d=>d.stage==='full_go'),...drills.filter(d=>d.stage!=='full_go')]) {
    if(kept.has(d))continue;
    const event=eassArmEvent(d);
    if(!event) { if(d.overloadClass==null && d.category==='position_skill')kept.add(d); continue; }
    const units=throwUnits([event]);
    if(units<=room && (event.kind!=='pitch'||event.count<=pitchRoom)){kept.add(d);room-=units;if(event.kind==='pitch')pitchRoom-=event.count;}
  }
  return drills.filter(d=>kept.has(d));
}

/** Existing microcycle chooses the day; scheduled outings alone authorize an outing label. */
export function pitchingDay(date:Date,sport:'baseball'|'softball',quarter:QuarterDescriptor,facts?:OutingFacts|null):PitcherDayType {
  if(date.getDay()===0)return 'rest';
  if(facts?.pitchedYesterday)return 'flush';
  if(facts?.startsToday)return 'start';
  if(facts?.startsTomorrow)return 'touch';
  if(facts?.relieverAvailableSoon)return 'available';
  if(date.getDay()===6 && quarter.phase!=='post')return 'bullpen';
  const cycle=buildPitchingMicrocycle({sport,rung:'sustain',quarter,profile:DEFAULT_PITCHER_PROFILE,today:date,gameDows:[],preferredBullpenDow:null});
  const type=cycle.today.dayType;
  return type==='start'||type==='game'||type==='available'?'bullpen':type;
}