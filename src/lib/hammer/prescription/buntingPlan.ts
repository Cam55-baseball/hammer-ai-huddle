import { buntingProgram, BUNT_TYPES, type BuntingFacts, type BuntSide, type BuntType } from '../../../../supabase/functions/_shared/wic/buntingProgram';
import { ownsAllGear } from '../../../../supabase/functions/_shared/planSwap/simpleSwap';
import { missingGearAnswer, COMMON_SWAP_GEAR } from '../../../../supabase/functions/_shared/planSwap/commonGear';
import type { PrescribedBlock, DrillStep } from './dailyPlan';
export interface BuntCatalogItem { slug:string; name:string; cue:string; is_active:boolean; dosage_unit:string|null; equipment_requirements:string[]|null; equipment:string[]|null; equipment_alternatives:unknown; sport_scope:string; min_age_years:number|null; season_eligibility:string[]|null; visible_to:string[]|null; }
export function buntIdentity(slug:string):{side:BuntSide;type:BuntType}|null {
 const match=/^bunt_([rl])_(squeeze|sac_3b|sac_1b|drag|push|hit)$/.exec(slug);
 return match?{side:match[1]==='r'?'R':'L',type:match[2] as BuntType}:null;
}
/** One declared skill slot, one side/type; the bunt attempts replace that slot's swings, never add volume. */
export function applyBuntingPlan(blocks:readonly PrescribedBlock[], facts:BuntingFacts, options:{weekday:number;weekIndex:number;owned:readonly string[];age:number|null;phase:string;catalog:readonly BuntCatalogItem[];userId?:string}):readonly PrescribedBlock[]{
 const program=buntingProgram(facts);
 // Expand only the existing common-gear vocabulary's declared identical labels.
 const owned=new Set(options.owned);
 for(const token of COMMON_SWAP_GEAR)if(missingGearAnswer([token],undefined,options.owned).some(g=>options.owned.includes(g)))owned.add(token);
 const sportBall=facts.sport==='softball'?'softballs':'baseballs';
 if(!owned.has(sportBall))return blocks;
 if(!program.canTrainToday||!program.scheduled.includes(options.weekday))return blocks;
 return blocks.map(block=>{
  if(block.modality!=='hitting'||block.status!=='ready'||block.phase==='recover'||block.phase==='deload')return block;
  const side=block.side??(facts.bats==='R'||facts.bats==='L'?facts.bats:null);
  if(!side||!program.sides.includes(side))return block;
 const eligible=options.catalog.filter(row=>{
   const identity=buntIdentity(row.slug);
   return identity?.side===side&&program.typesFor(side).includes(identity.type)&&row.is_active&&row.dosage_unit==='attempts'&&
    (row.sport_scope===facts.sport||row.sport_scope==='both')&&(!row.visible_to?.length||Boolean(options.userId&&row.visible_to.includes(options.userId)))&&
    options.age!==null&&row.min_age_years!==null&&options.age>=row.min_age_years&&
    (row.season_eligibility?.includes(options.phase)||options.phase==='off_season'&&['os_q1','os_q2','os_q3','os_q4'].every(p=>row.season_eligibility?.includes(p)))&&ownsAllGear(row,owned);
  }).sort((a,b)=>BUNT_TYPES.indexOf(buntIdentity(a.slug)?.type??'hit')-BUNT_TYPES.indexOf(buntIdentity(b.slug)?.type??'hit'));
  if(!eligible.length)return block;
  const index=((options.weekIndex*program.scheduled.length+program.scheduled.indexOf(options.weekday))%eligible.length+eligible.length)%eligible.length;
  const pick=eligible[index];const identity=pick?buntIdentity(pick.slug):null;if(!pick||!identity)return block;
  const dose=program.dose(side,identity.type);
  const slot=block.drills.findIndex(d=>d.stage==='drills'&&d.prescriptionOrigin!=='owner'&&/^\d+ swings(?:\s|$)/i.test(d.dosage));
  const original=block.drills[slot];const budget=original?Number(/^(\d+) swings/i.exec(original.dosage)?.[1]):0;
  if(!original||budget<dose.floor)return block;
  const attempts=Math.min(dose.reps,budget,20);
  const drill:DrillStep={name:pick.name,slug:pick.slug,stage:'drills',dosage:`${attempts} attempts`,cue:pick.cue,
   setup:'Use your saved bat, ball and safe space. Record attempts and successful bunts for this side and type only.',
   stopIf:'Pain, dizziness, fatigue or unsafe space — stop.',bunt:{side,type:identity.type,attempts,sourceAttempts:dose.attempts,sourceSuccesses:dose.successes}};
  const drills=[...block.drills.slice(0,slot),drill,...(budget>attempts?[{...original,dosage:`${budget-attempts} swings`}]:[]),...block.drills.slice(slot+1)];
  const sample=program.battingSample;
  const because=`${attempts} ${side==='R'?'right':'left'}-handed bunt attempts replace ${attempts} swings from today's skill work.${sample.under300?` Entered batting sample: ${sample.hits} hits in ${sample.atBats} at-bats across ${sample.games} games; each entered game was below .300.`:''}${dose.attempts?` This bunt: ${dose.successes} successful out of ${dose.attempts} entered attempts.`:''}`;
  return {...block,drills,steps:drills.map(d=>`${d.name} — ${d.dosage}`),because:[...(block.because??[]),because],gamePlanTemplate:block.gamePlanTemplate?{...block.gamePlanTemplate,checklist:drills.map(d=>`${d.name} — ${d.dosage}`)}:null};
 });
}