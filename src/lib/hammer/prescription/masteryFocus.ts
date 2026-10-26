import type {PrescribedBlock} from './dailyPlan';
export interface MasteryPlanFocus {observedFocus:string|null;sourceIds:readonly string[];reason:string;leftPowerStealEmphasis:boolean}
export const masteryModality=(pillar:string|null)=>pillar==='contact'||pillar==='power'?'hitting':pillar==='arm'?'throwing':pillar==='defense'?'defense':pillar==='speed'?'speed':null;
/** Weight existing ready slots only: no doses, new days, new drills, lifting or saved work. */
export function applyMasteryFocus(blocks:readonly PrescribedBlock[],focus:MasteryPlanFocus|undefined){
 if(!focus||!focus.sourceIds.length||!focus.observedFocus)return blocks;
 const target=masteryModality(focus.observedFocus);if(!target)return blocks;
 const slots=blocks.map((b,i)=>['hitting','defense','throwing','speed','baserunning'].includes(b.modality)&&b.status==='ready'?i:-1).filter(i=>i>=0);
 const skill=slots.map(i=>blocks[i]);if(!skill.some(b=>b.modality===target))return blocks;
 skill.sort((a,b)=>Number(b.modality===target)-Number(a.modality===target));
 const out=[...blocks];slots.forEach((i,n)=>{const b=skill[n];out[i]=b.modality===target?{...b,because:[...(b.because??[]),`${focus.reason} Source: Coaching Console standards and ${focus.sourceIds.length} canonical evidence records.`]}:b;});
 return out;
}