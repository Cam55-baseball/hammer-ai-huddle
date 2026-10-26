import {opportunityWindows,OWNER_WINDOW_POLICY,type WindowPolicy} from './masteryIdentity.ts';
import type {IdentitySettings,MasteryLevel,MasteryStatus} from './masteryStandards.ts';
import {startingStandards,type PitchSport} from './masteryPitchingStandards.ts';
export interface PitcherGame {id:string;date:string;battersFaced:number|null;complete:boolean;pitches:readonly {id:string;opportunity:number|null;outcome:string|null}[]}
/** A complete explicitly numbered outing can derive BF; totals with no outcomes advance progress only. */
export function pitchingIdentity(games:readonly PitcherGame[],settings:IdentitySettings,policy:WindowPolicy=OWNER_WINDOW_POLICY,sport:PitchSport='baseball',level:MasteryLevel|null=null){
 const std=level?startingStandards(sport,level,settings as Record<string,number|null|undefined>):[];const kMin=std.find(s=>s.key==='k_pct')?.value??null;const bbMax=std.find(s=>s.key==='bb_pct')?.value??null;
 const opportunities:{id:string;date:string;outcome:string|null}[]=[];let invalid=false;
 for(const g of [...games].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){
  const groups=new Map<number,string[]>();
  for(const p of g.pitches)if(p.opportunity!==null&&p.outcome){const old=groups.get(p.opportunity)??[];old.push(p.outcome);groups.set(p.opportunity,old);}
  const numbered=[...groups.keys()].sort((a,b)=>a-b);
  const derived=g.complete&&numbered.length>0&&numbered.every((n,i)=>n===i+1)&&[...groups.values()].every(v=>v.length===1)&&g.pitches.every(p=>p.opportunity!==null);
  const count=derived?numbered.length:g.battersFaced;
  if(count===null){invalid=true;continue;}if(!Number.isSafeInteger(count)||count<0){invalid=true;continue;}
  if(derived&&g.battersFaced!==null&&g.battersFaced!==count){invalid=true;continue;}
  for(let i=1;i<=count;i++)opportunities.push({id:`${g.id}:bf:${i}`,date:g.date,outcome:derived?groups.get(i)?.[0]??null:null});
 }
 const windows=opportunityWindows(opportunities.length,policy);const completed=invalid?[]:windows.filter(w=>w.complete).map(w=>{
  const rows=opportunities.slice(w.start-1,w.end);const outcomesKnown=rows.every(r=>r.outcome!==null);
  const k=outcomesKnown?rows.filter(r=>r.outcome==='K').length/rows.length:null;const bb=outcomesKnown?rows.filter(r=>r.outcome==='BB').length/rows.length:null;const hr=outcomesKnown?rows.filter(r=>r.outcome==='HR').length/rows.length:null;
  const set=kMin!=null&&bbMax!=null;
  const status:MasteryStatus=!outcomesKnown||!set?'Need more data':Number(k)>=Number(kMin)&&Number(bb)<=Number(bbMax)?'Elite':'Building';
  return {...w,status,k,bb,hr,outcomesKnown,sourceIds:rows.map(r=>r.id),from:rows[0]?.date,through:rows[rows.length-1]?.date};
 });const latest=completed[completed.length-1]??null;const size=opportunities.length<policy.transitionAt?policy.initialSize:policy.laterSize;
 return {status:latest?.status??'Need more data',latest,completed,policy,totalBattersFaced:opportunities.length,completeHistory:!invalid,current:windows.find(w=>!w.complete)??{start:opportunities.length+1,end:opportunities.length+size,size,sample:0,complete:false},reason:!level?'Competition level is unknown.':sport==='softball'?'Softball is judged stat by stat (per 7 innings) in the pitching section.':!latest?.outcomesKnown?'Complete BF outcomes are needed.':'Source: completed pitching game opportunities.'};
}