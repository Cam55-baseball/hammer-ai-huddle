import {validHumanGrade} from '../../../supabase/functions/_shared/wic/masteryStandards';

export interface ArmHistoryPoint {
  id:string; date:string; sport:'baseball'|'softball'; position:string;
  measure:'throwing_velocity'|'catcher_pop_time'|'human_arm_grade'; unit:'mph'|'seconds'|'grade';
  value:number; source:string;
}
type Row=Record<string,unknown>;
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter((r):r is Row=>!!r&&typeof r==='object'&&!Array.isArray(r)):[];
/** Accept only an actual recorded calendar date; never use the visit date as evidence. */
function recordedDate(v:unknown):string|null {
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(v))return null;
  const day=v.slice(0,10);const time=Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===day&&Number.isFinite(Date.parse(v))?day:null;
}
const velocityPosition=(v:unknown)=>{
  const p=String(v??'').toLowerCase();return ['pitcher','catcher','infield','outfield'].includes(p)?p:null;
};
const humanPosition=(v:unknown)=>{
  const p=String(v??'').toUpperCase();return ['P','C','1B','2B','3B','SS','LF','CF','RF','OF','IF'].includes(p)?p:null;
};
/** Independent compatible measurements, not a fabricated combined arm score or date pairing. */
export function projectArmHistory(raw:unknown,sport:'baseball'|'softball'):ArmHistoryPoint[]{
  const source=raw&&typeof raw==='object'?raw as Row:{};
  const points:ArmHistoryPoint[]=[];
  const add=(r:Row,measure:ArmHistoryPoint['measure'],position:string|null,unit:ArmHistoryPoint['unit'],value:unknown)=>{
    const date=recordedDate(r.date);
    if(r.sport!==sport||typeof r.id!=='string'||!r.id||!date||!position||typeof value!=='number'||!Number.isFinite(value)||value<=0||r.missing)return;
    if(typeof r.source!=='string'||!r.source.trim())return;
    points.push({id:r.id,date,sport,position,measure,unit,value,source:r.source});
  };
  for(const r of rows(source.throwing))if(r.metric==='throw_velo_mph'&&r.unit==='mph')add(r,'throwing_velocity',velocityPosition(r.position),'mph',r.value);
  for(const r of rows(source.catching))if(['pop_time','catcher_pop_time','pop_time_sec'].includes(String(r.metric))&&['s','seconds','sec'].includes(String(r.unit)))add(r,'catcher_pop_time','catcher','seconds',r.value);
  for(const r of rows(source.humanGrades))if(r.evaluator&&['coach_evaluated','scout_evaluated'].includes(String(r.source))&&validHumanGrade(r.arm))add(r,'human_arm_grade',humanPosition(r.position),'grade',r.arm);
  // Same record/position can be returned twice by a join. Conflicting duplicates are ambiguous, not two observations.
  const unique=new Map<string,ArmHistoryPoint|null>();
  for(const p of points){const key=`${p.measure}:${p.position}:${p.id}`;if(!unique.has(key))unique.set(key,p);else if(JSON.stringify(unique.get(key))!==JSON.stringify(p))unique.set(key,null);}
  return [...unique.values()].filter((p):p is ArmHistoryPoint=>p!==null).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}