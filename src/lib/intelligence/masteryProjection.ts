import {battingIdentity,areaWindowPolicy,fieldingIdentity,speedIdentity,masteryBuntingTraits,type BattingEvent,type SpeedEvidence,type AreaWindowSettings} from '../../../supabase/functions/_shared/wic/masteryIdentity';
import {rawToGrade} from '@/lib/gradeEngine';
import {PERFORMANCE_METRICS} from '@/data/performanceTestRegistry';
import {masteryGuidance} from '../../../supabase/functions/_shared/wic/masteryGuidance';
type RecordValue=Record<string,unknown>;
const record=(v:unknown):RecordValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
const list=(v:unknown):RecordValue[]=>Array.isArray(v)?v.map(record):[];
export function projectMasterySources(raw:unknown,sport:'baseball'|'softball',settings:(AreaWindowSettings&{elite_home_runs:number|null;lacking_power_home_runs:number|null;speed_minimum_samples:number|null;elite_balls_in_play_rate?:number|null})|null){
 const source=record(raw);const policy=areaWindowPolicy(settings,'batting');
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
 // Royal writes elapsed milliseconds in named timer objects; generic scalar fields are not speed measurements.
 for(const row of list(source.royal))for(const key of ['timer1','timer2','master']){const timer=record(record(row.timers)[key]);const elapsed=timer.elapsed;if(typeof elapsed==='number')add(row,`royal:${row.id}:${key}`,`Royal timing · ${timer.wasSynced===true?'video synced':'manual timer'}`,key,'seconds',elapsed/1000,null);}
 const counts=new Map<string,Set<string>>();for(const e of speedEvidence){const key=`${e.source}:${e.measure}:${e.unit}`;const set=counts.get(key)??new Set<string>();set.add(e.id);counts.set(key,set);}
 const speed=speedIdentity(speedEvidence.map(e=>({...e,sample:counts.get(`${e.source}:${e.measure}:${e.unit}`)?.size??0})));
 const traits=masteryBuntingTraits(batting.latest,speed,{eliteHomeRuns:settings?.elite_home_runs??null,lackingPowerHomeRuns:settings?.lacking_power_home_runs??null,eliteGrade:65});
 const defense=fieldingIdentity(list(source.defense).map((e,i)=>({id:String(e.id??''),date:String(e.date??''),order:i,source:typeof e.source==='string'?e.source:null,position:typeof e.position==='string'?e.position:null,error:typeof e.error==='boolean'?e.error:null,assist:typeof e.assist==='boolean'?e.assist:null,putout:typeof e.putout==='boolean'?e.putout:null})),areaWindowPolicy(settings,'defense'));
 const contactRate=batting.latest?.ballsInPlay!==undefined?batting.latest.ballsInPlay/batting.latest.atBats:null;
 const cutoff=settings?.elite_balls_in_play_rate;
 const contact={rate:contactRate,status:contactRate===null||cutoff==null?'Need more data':contactRate>=cutoff?'Elite':'Building'};
 const guidance=masteryGuidance({contactStatus:contact.status,contactSourceIds:batting.latest?.sourceIds??[],speedStatus:speed.status,powerStatus:traits.powerStatus,leftPower:traits.leftPower,leftPowerGoal:false});
 return {batting,speed,traits,policy,settings,sport,recordedSpeedEvidence:speedEvidence,defense,contact,guidance,pitching:{status:'Need more data',policy:areaWindowPolicy(settings,'pitching'),reason:'Completed batters faced are not recorded. Pitch counts are not batters faced.'}};
}