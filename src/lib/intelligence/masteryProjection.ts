import {battingIdentity,OWNER_WINDOW_POLICY,speedIdentity,masteryBuntingTraits,type BattingEvent,type SpeedEvidence,type WindowPolicy} from '../../../supabase/functions/_shared/wic/masteryIdentity';
import {rawToGrade} from '@/lib/gradeEngine';
import {PERFORMANCE_METRICS} from '@/data/performanceTestRegistry';
type RecordValue=Record<string,unknown>;
const record=(v:unknown):RecordValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
const list=(v:unknown):RecordValue[]=>Array.isArray(v)?v.map(record):[];
export function projectMasterySources(raw:unknown,sport:'baseball'|'softball',settings:{initial_window:number;transition_at:number;later_window:number;elite_home_runs:number|null;lacking_power_home_runs:number|null;speed_minimum_samples:number|null}|null){
 const source=record(raw);const policy:WindowPolicy=settings?{initialSize:settings.initial_window,transitionAt:settings.transition_at,laterSize:settings.later_window}:OWNER_WINDOW_POLICY;
 const events:BattingEvent[]=list(source.atBats).map((e,i)=>({id:String(e.id??''),date:String(e.date??''),order:i,result:typeof e.result==='string'?e.result:null,source:String(e.source??'Source not recorded')}));
 const batting=battingIdentity(events,policy);const speedEvidence:SpeedEvidence[]=[];
 const add=(row:RecordValue,id:string,label:string,measure:string,unit:string,value:unknown,grade:number|null)=>{if(typeof value==='number'&&Number.isFinite(value)&&value>0)speedEvidence.push({id,source:label,date:String(row.date??''),measure,unit,value,grade,kind:'measured',sample:1,minimum:settings?.speed_minimum_samples??null});};
 const metrics=PERFORMANCE_METRICS.filter(m=>['speed','quickness','power_lower'].includes(m.category)&&m.sports.includes(sport));
 for(const test of list(source.tests)){const results=record(test.results);
  for(const metric of metrics){const keys=metric.bilateral?[`${metric.key}_left`,`${metric.key}_right`]:[metric.key];for(const key of keys){const value=results[key];add(test,`test:${test.id}:${key}`,`Entered performance test · ${test.type}`,key,metric.unit,value,typeof value==='number'?rawToGrade(metric.key,value,sport):null);}}
 }
 for(const row of list(source.sprints)){const m=record(row.metrics);const value=m.time??m.seconds;add(row,`sprint:${row.id}`,'Logged sprint',`sprint ${row.distance??'unknown distance'} feet`,'seconds',value,null);}
 for(const row of list(source.homeFirst))add(row,`home-first:${row.id}`,`Game home-to-first · ${row.source}`,'home_to_first','seconds',row.seconds,null);
 for(const row of list(source.runs)){add(row,`run:${row.id}`,`Game baserunning · ${row.source}`,String(row.type??'unknown run'),'seconds',row.seconds,null);add(row,`lead:${row.id}`,`Game baserunning · ${row.source}`,'steal lead','steps',row.lead_steps,null);}
 // Timer field names vary; retain explicit numeric timings as record-only, never parse findings/AI.
 for(const row of list(source.royal))for(const [key,value] of Object.entries(record(row.timers)))add(row,`royal:${row.id}:${key}`,'Royal timing',key,'seconds',value,null);
 const counts=new Map<string,Set<string>>();for(const e of speedEvidence){const key=`${e.source}:${e.measure}:${e.unit}`;const set=counts.get(key)??new Set<string>();set.add(e.id);counts.set(key,set);}
 const speed=speedIdentity(speedEvidence.map(e=>({...e,sample:counts.get(`${e.source}:${e.measure}:${e.unit}`)?.size??0})));
 const traits=masteryBuntingTraits(batting.latest,speed,{eliteHomeRuns:settings?.elite_home_runs??null,lackingPowerHomeRuns:settings?.lacking_power_home_runs??null,eliteGrade:65});
 return {batting,speed,traits,policy,settings,sport,recordedSpeedEvidence:speedEvidence};
}