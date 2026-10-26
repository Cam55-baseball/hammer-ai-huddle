import type {PrescribedBlock} from './dailyPlan';
import type {CategoryGoalsPayload,CategoryKey} from '../goals/categoryGoals';
export interface MasteryPlanFocus {observedFocus:string|null;sourceIds:readonly string[];reason:string;leftPowerStealEmphasis:boolean}
export const masteryModality=(pillar:string|null)=>pillar==='contact'||pillar==='power'?'hitting':pillar==='arm'?'throwing':pillar==='defense'?'defense':pillar==='speed'?'speed':null;
/** Transient priority overlay, never writes over athlete goals or changes legal weekly targets. */
export function masteryGoalWeights(goals:CategoryGoalsPayload|null,focus:MasteryPlanFocus|undefined):CategoryGoalsPayload|null{
 if(!goals||!focus?.observedFocus||!focus.sourceIds.length)return goals;
 const category:CategoryKey|null=focus.observedFocus==='contact'||focus.observedFocus==='power'?'hitting':focus.observedFocus==='arm'?'throwing':focus.observedFocus==='defense'?'fielding':focus.observedFocus==='speed'?'speed':null;
 if(!category)return goals;
 const ordered=[...goals.goals].sort((a,b)=>a.rank-b.rank);ordered.sort((a,b)=>Number(b.category===category)-Number(a.category===category));
 return {...goals,goals:ordered.map((g,i)=>({...g,rank:i+1}))};
}
/** Weight existing ready slots only: no doses, new days, new drills, lifting or saved work. */
export function applyMasteryFocus(blocks:readonly PrescribedBlock[],focus:MasteryPlanFocus|undefined){
 if(!focus)return blocks;
 const withSteal=focus.leftPowerStealEmphasis?blocks.map(b=>b.modality==='baserunning'&&b.status==='ready'?{...b,because:[...(b.because??[]),'Left-handed power guidance: focus on steal jumps, reads, Royal timing and baserunning inside this existing work. Source: owner Bunting Mastery. No added reps or days.']}:b):blocks;
 if(!focus.sourceIds.length||!focus.observedFocus)return withSteal;
 const target=masteryModality(focus.observedFocus);if(!target)return blocks;
 const slots=withSteal.map((b,i)=>['hitting','defense','throwing','speed','baserunning'].includes(b.modality)&&b.status==='ready'?i:-1).filter(i=>i>=0);
 const skill=slots.map(i=>withSteal[i]);if(!skill.some(b=>b.modality===target))return withSteal;
 skill.sort((a,b)=>Number(b.modality===target)-Number(a.modality===target));
 const out=[...withSteal];slots.forEach((i,n)=>{const b=skill[n];out[i]=b.modality===target?{...b,because:[...(b.because??[]),`${focus.reason} Source: Coaching Console standards and ${focus.sourceIds.length} canonical evidence records.`]}:b;});
 return out;
}