/** Identity contributes sourced guidance only; it cannot author movement doses or bypass day locks. */
export interface MasteryGuidance {observedFocus:string|null;sourceIds:readonly string[];reason:string;leftPowerStealEmphasis:boolean}
export function masteryPlanGuidance(value:unknown):MasteryGuidance|undefined {
 if(!value||typeof value!=='object')return undefined;
 const row=value as Record<string,unknown>;const g=row.guidance;
 if(!g||typeof g!=='object')return undefined;
 const item=g as Record<string,unknown>;
 const focus=['contact','power','speed','arm','defense'].includes(String(item.observedFocus))?String(item.observedFocus):null;
 const ids=Array.isArray(item.sourceIds)?item.sourceIds.filter((id):id is string=>typeof id==='string'&&id.length>0):[];
 if(!focus||!ids.length||typeof item.reason!=='string'||!item.reason.trim())return undefined;
 return {observedFocus:focus,sourceIds:[...new Set(ids)],reason:item.reason,leftPowerStealEmphasis:item.leftPowerStealEmphasis===true};
}
export function masterySavedGuidance(rows:readonly {why_payload?:unknown}[],guidance:MasteryGuidance|undefined,existingDay:boolean){
 if(!guidance||existingDay)return;
 for(const row of rows){const payload=row.why_payload&&typeof row.why_payload==='object'?row.why_payload as Record<string,unknown>:{};
  row.why_payload={...payload,mastery_focus:{version:'mastery_owner_standards_v1',...guidance,source:'Coaching Console standards and canonical evidence',scope:'Guidance inside existing legal work; no new dose or day'}};
 }
}