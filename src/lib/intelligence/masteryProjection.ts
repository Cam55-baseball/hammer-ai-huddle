import {battingIdentity,areaWindowPolicy,fieldingIdentity,speedIdentity,masteryBuntingTraits,type BattingEvent,type SpeedEvidence,type AreaWindowSettings} from '../../../supabase/functions/_shared/wic/masteryIdentity';
import {rawToGrade} from '@/lib/gradeEngine';
import {PERFORMANCE_METRICS} from '@/data/performanceTestRegistry';
import {masteryGuidance} from '../../../supabase/functions/_shared/wic/masteryGuidance';
import {contactIdentity,powerIdentity,steerIdentity,validHumanGrade,IDENTITY_SOURCE,type IdentitySettings,type MasteryLevel,type MasteryStatus} from '../../../supabase/functions/_shared/wic/masteryStandards';
import {pitchingIdentity} from '../../../supabase/functions/_shared/wic/masteryPitching';
import {computeHomeToFirstGrade,type ScaleReferenceRow} from '@/lib/baserunning/homeToFirstGrade';
import {computeThrowVeloGrade} from '@/lib/throwing/throwVeloGrade';
import {computePopTimeGrade} from '@/lib/catching/popTimeGrade';
import {nextThrowDate} from '../../../supabase/functions/_shared/wic/phases/nextThrowDate';
type RecordValue=Record<string,unknown>;
const record=(v:unknown):RecordValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
const list=(v:unknown):RecordValue[]=>Array.isArray(v)?v.map(record):[];
export function projectMasterySources(raw:unknown,sport:'baseball'|'softball',settings:(AreaWindowSettings&{elite_home_runs:number|null;lacking_power_home_runs:number|null;speed_minimum_samples:number|null;elite_balls_in_play_rate?:number|null}&IdentitySettings)|null){
 const source=record(raw);const policy=areaWindowPolicy(settings,'batting');
 const events:BattingEvent[]=list(source.atBats).map((e,i)=>({id:String(e.id??''),date:String(e.date??''),order:i,result:typeof e.result==='string'?e.result:null,source:typeof e.source==='string'?e.source:'',pitchCount:typeof e.pitchCount==='number'?e.pitchCount:null}));
 const batting=battingIdentity(events,policy);const speedEvidence:SpeedEvidence[]=[];
 const add=(row:RecordValue,id:string,label:string,measure:string,unit:string,value:unknown,grade:number|null)=>{if(typeof value==='number'&&Number.isFinite(value)&&value>0)speedEvidence.push({id,source:label,date:String(row.date??''),measure,unit,value,grade,kind:'measured',sample:1,minimum:settings?settings.speed_minimum_samples??1:null});};
 const metrics=PERFORMANCE_METRICS.filter(m=>m.category==='speed'&&m.sports.includes(sport));
 for(const test of list(source.tests)){const results=record(test.results);
  for(const metric of metrics){const keys=metric.bilateral?[`${metric.key}_left`,`${metric.key}_right`]:[metric.key];for(const key of keys){const value=results[key];add(test,`test:${test.id}:${key}`,`Entered performance test · ${test.type}`,key,metric.unit,value,typeof value==='number'?rawToGrade(metric.key,value,sport):null);}}
 }
 for(const row of list(source.sprints)){const m=record(row.metrics);const value=m.time??m.seconds;add(row,`sprint:${row.id}`,'Logged sprint',`sprint ${row.distance??'unknown distance'} feet`,'seconds',value,null);}
 const context=record(source.context);const scales=list(source.scales) as unknown as ScaleReferenceRow[];
 const rawLevel=String(context.level||context.leagueTier||'').toLowerCase();
 const level:MasteryLevel|null=['pro','professional','mlb','milb','ausl'].includes(rawLevel)?'pro':['college','ncaa','d1','d2','d3','juco','naia'].includes(rawLevel)?'college':['high_school','high school','hs'].includes(rawLevel)?'high_school':['youth','youth_rec','youth_travel'].includes(rawLevel)?'youth':null;
 for(const row of list(source.homeFirst)){const hand=row.side;const g=hand==='L'||hand==='R'?computeHomeToFirstGrade(typeof row.seconds==='number'?row.seconds:null,hand,scales):null;add(row,`home-first:${row.id}`,`Game home-to-first · ${row.source}`,'home_to_first','seconds',row.seconds,g&&!g.missing?g.grade:null);}
 const speedKeys=sport==='baseball'?{'10y':'ten_yard_dash','30y':'thirty_yard_dash','60y':'sixty_yard_dash'}:{'7y':'seven_yard_dash','20y':null,'40y':'forty_yard_dash'};
 for(const row of list(source.speedLab))for(const [key,metric] of Object.entries(speedKeys)){const raw=record(row.distances)[key];const values=Array.isArray(raw)?raw:[raw];values.forEach((value,i)=>add(row,`speed-lab:${row.id}:${key}:${i}`,'Speed Lab test',key,'seconds',value,metric&&typeof value==='number'?rawToGrade(metric,value,sport):null));}
 for(const row of list(source.runs)){add(row,`run:${row.id}`,`Game baserunning · ${row.source}`,String(row.type??'unknown run'),'seconds',row.seconds,null);add(row,`lead:${row.id}`,`Game baserunning · ${row.source}`,'steal lead','steps',row.lead_steps,null);}
 // Royal writes elapsed milliseconds in named timer objects; generic scalar fields are not speed measurements.
 for(const row of list(source.royal))for(const key of ['timer1','timer2','master']){const timer=record(record(row.timers)[key]);const elapsed=timer.elapsed;if(typeof elapsed==='number')add(row,`royal:${row.id}:${key}`,`Royal timing · ${timer.wasSynced===true?'video synced':'manual timer'}`,key,'seconds',elapsed/1000,null);}
 const counts=new Map<string,Set<string>>();for(const e of speedEvidence){const key=`${e.source}:${e.measure}:${e.unit}`;const set=counts.get(key)??new Set<string>();set.add(e.id);counts.set(key,set);}
 const speed=speedIdentity(speedEvidence.map(e=>({...e,sample:counts.get(`${e.source}:${e.measure}:${e.unit}`)?.size??0})),settings?.elite_grade??65);
 const standards:IdentitySettings=settings??{};const eliteGrade=settings?.elite_grade??65;
 const power=powerIdentity(batting.latest,standards);
 const hrRate=power.rate;
 const goals=record(context.goals);const sportGoals=record(goals[sport]);
 const hittingRows=list(record(sportGoals.position).hitting);
 const powerGoal=hittingRows.some(g=>g.id==='oppo_power'||g.intent==='power_hitting')||list(goals.goals).some(g=>g.category==='hitting'&&g.intent==='power_hitting');
 const traits={speedy:speed.elite===true,lacksPower:hrRate!==null&&standards.lacking_power_hr_rate!=null&&hrRate<standards.lacking_power_hr_rate,leftPower:context.bats==='L'&&hrRate!==null&&standards.left_power_hr_rate!=null&&hrRate>=standards.left_power_hr_rate,powerGoal:['L','S'].includes(String(context.bats))&&powerGoal,powerStatus:power.status,power:power.status==='Need more data'?null:power.status==='Elite',battingWindow:batting.latest,lowAverage:standards.bunt_low_average??.300};
 const defense=fieldingIdentity(list(source.defense).map((e,i)=>({id:String(e.id??''),date:String(e.date??''),order:i,source:typeof e.source==='string'?e.source:null,position:typeof e.position==='string'?e.position:null,error:typeof e.error==='boolean'?e.error:null,assist:typeof e.assist==='boolean'?e.assist:null,putout:typeof e.putout==='boolean'?e.putout:null})),areaWindowPolicy(settings,'defense'));
 const contact=contactIdentity(batting.latest,list(source.contactPitches).map(p=>({id:String(p.id??''),atBatId:typeof p.atBatId==='string'?p.atBatId:null,result:typeof p.result==='string'?p.result:null,strikes:typeof p.strikes==='number'?p.strikes:null,zone:typeof p.zone==='number'?p.zone:null,outZone:typeof p.outZone==='string'?p.outZone:null})),level,standards);
 const position=String(context.position??'').toUpperCase();
 const normalizedPosition=['P','PITCHER'].includes(position)?'pitcher':['C','CATCHER'].includes(position)?'catcher':['LF','CF','RF','OF','OUTFIELD'].includes(position)?'outfield':['1B','2B','3B','SS','IF','INFIELD'].includes(position)?'infield':null;
 const human=list(source.humanGrades).filter(g=>g.evaluator&&['coach_evaluated','scout_evaluated'].includes(String(g.source))&&(String(g.position??'').toUpperCase()===position));
 const judgeGrade=(grade:number|null):MasteryStatus=>grade===null?'Need more data':grade>=eliteGrade?'Elite':'Building';
 const fieldGrade=human.find(g=>validHumanGrade(g.defense));
 const defenseGrade=fieldGrade?Number(fieldGrade.defense):null;
 const defensePillar={status:judgeGrade(defenseGrade),grade:defenseGrade,source:fieldGrade?`${fieldGrade.source} · ${fieldGrade.date} · ${position}`:null,sourceIds:fieldGrade?[String(fieldGrade.id)]:[],threshold:eliteGrade};
 const velocity=list(source.throwing).filter(r=>r.position===normalizedPosition&&r.metric==='throw_velo_mph'&&r.unit==='mph').map(r=>({id:r.id,source:r.source,date:r.date,grade:computeThrowVeloGrade(String(r.metric),String(r.position),typeof r.value==='number'?r.value:null,scales)})).find(r=>r.grade&&!r.grade.missing);
 const pop=normalizedPosition==='catcher'?list(source.catching).filter(r=>['pop_time','catcher_pop_time','pop_time_sec'].includes(String(r.metric))&&['s','seconds','sec'].includes(String(r.unit))).map(r=>({id:r.id,source:r.source,date:r.date,grade:computePopTimeGrade(typeof r.value==='number'?r.value:null,scales,{sport})})).find(r=>!r.grade.missing):null;
 const measurement=velocity??pop;const measurementGrade=measurement?.grade&&!measurement.grade.missing?measurement.grade.grade:null;
 const accuracy=human.find(g=>validHumanGrade(g.arm));const accuracyGrade=accuracy?Number(accuracy.arm):null;
 const health=record(source.health);const pain=list(health.pain);const injury=list(health.injury);
 const armWords=/arm|shoulder|elbow|forearm|wrist|hand/i;
 const activePain=pain.some(p=>Number(p.scale)>0&&armWords.test(String(p.location)))||pain.some(p=>Object.entries(record(p.scales)).some(([k,v])=>armWords.test(k)&&typeof v==='number'&&v>0))||injury.some(p=>p.active===true&&armWords.test(String(p.region)));
 const today=String(source.date??new Date().toLocaleDateString('en-CA'));
 const dob=typeof context.dateOfBirth==='string'?new Date(context.dateOfBirth):null;const now=new Date(today);const age=dob&&Number.isFinite(dob.getTime())?now.getUTCFullYear()-dob.getUTCFullYear()-(now.getUTCMonth()<dob.getUTCMonth()||now.getUTCMonth()===dob.getUTCMonth()&&now.getUTCDate()<dob.getUTCDate()?1:0):null;
 const next=nextThrowDate(age,typeof context.level==='string'?context.level:null,list(health.ledger).map(r=>({entry_date:String(r.entry_date),source:String(r.source),throw_type:String(r.throw_type),count:typeof r.count==='number'?r.count:null,status:typeof r.status==='string'?r.status:null})),new Date(Date.parse(today)-86400000).toISOString().slice(0,10));
 const ledgerFlag=next!==null&&next>today;
 const healthKnown=health.shared===true&&(pain.length>0||injury.length>0)&&age!==null;
 const armGrade=measurementGrade!==null&&accuracyGrade!==null?Math.min(measurementGrade,accuracyGrade):null;
 const arm={status:activePain||ledgerFlag?'Building' as MasteryStatus:!healthKnown?'Need more data' as MasteryStatus:judgeGrade(armGrade),grade:armGrade,accuracyGrade,measurementGrade,activePain,ledgerFlag,healthKnown,sourceIds:[...(measurement?[String(measurement.id)]:[]),...(accuracy?[String(accuracy.id)]:[])],source:measurement?`${measurement.source} · ${measurement.date} · ${normalizedPosition}`:null,threshold:eliteGrade};
 const contactProgress=Object.values(contact.parts).filter(p=>p.value!==null&&p.cutoff!==null).map(p=>p===contact.parts.zone?Number(p.value)/Number(p.cutoff):Number(p.value)===0?1:Number(p.cutoff)/Number(p.value));
 const speedGrade=speed.evidence.length?Math.max(...speed.evidence.map(e=>Number(e.grade))):null;
 const steering=steerIdentity([{pillar:'contact',status:contact.status,sourceIds:contact.sourceIds,progress:contactProgress.length?Math.min(...contactProgress):null},{pillar:'defense',status:defensePillar.status,sourceIds:defensePillar.sourceIds,progress:defenseGrade!==null?defenseGrade/eliteGrade:null},{pillar:'arm',status:arm.status,sourceIds:arm.sourceIds,progress:armGrade!==null?armGrade/eliteGrade:null},{pillar:'speed',status:speed.status as MasteryStatus,sourceIds:speed.evidence.map(e=>e.id),progress:speedGrade!==null?speedGrade/eliteGrade:null},{pillar:'power',status:power.status,sourceIds:power.sourceIds,progress:hrRate!==null&&standards.elite_hr_rate?hrRate/standards.elite_hr_rate:null}]);
 const guidance={...masteryGuidance({contactStatus:contact.status,contactSourceIds:contact.sourceIds,speedStatus:speed.status,powerStatus:power.status,leftPower:traits.leftPower,leftPowerGoal:traits.powerGoal}),observedFocus:steering.focus,sourceIds:steering.sourceIds,reason:steering.reason,alternativeReason:steering.speedOrPower==='Need more data'?'Need more data for speed-or-power focus.':`Speed-or-power requirement: ${steering.speedOrPower}. ${steering.comparison}.`};
 const pitching=pitchingIdentity(list(source.pitcherGames).map(g=>({id:String(g.id),date:String(g.date),battersFaced:typeof g.battersFaced==='number'?g.battersFaced:null,complete:g.complete===true,pitches:list(g.pitches).map(p=>({id:String(p.id),opportunity:typeof p.opportunity==='number'?p.opportunity:null,outcome:typeof p.outcome==='string'?p.outcome:null}))})),standards,areaWindowPolicy(settings,'pitching'));
 return {batting,speed,traits,policy,settings,sport,recordedSpeedEvidence:speedEvidence,defense,defensePillar,contact,power,arm,guidance,steering,pitching,level,standardsSource:IDENTITY_SOURCE};
}
