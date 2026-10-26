/** Hook-free, evidence-only identity. Cutoffs are owner settings, never invented here. */
export interface WindowPolicy { initialSize:number; transitionAt:number; laterSize:number }
export interface AreaWindowSettings {initial_window:number;transition_at:number;later_window:number;pitching_initial_window?:number|null;pitching_transition_at?:number|null;pitching_later_window?:number|null;defense_initial_window?:number|null;defense_transition_at?:number|null;defense_later_window?:number|null}
export function areaWindowPolicy(settings:AreaWindowSettings|null,area:'batting'|'pitching'|'defense'):WindowPolicy {
 const inherited=settings?{initialSize:settings.initial_window,transitionAt:settings.transition_at,laterSize:settings.later_window}:OWNER_WINDOW_POLICY;
 if(!settings||area==='batting')return inherited;
 const values=[settings[`${area}_initial_window`],settings[`${area}_transition_at`],settings[`${area}_later_window`]];
 if(values.every(v=>v==null))return inherited;
 const [initialSize,transitionAt,laterSize]=values;
 if(initialSize==null||transitionAt==null||laterSize==null)throw new Error('Incomplete area window policy');
 const policy={initialSize,transitionAt,laterSize};if(!validWindowPolicy(policy))throw new Error('Invalid area window policy');return policy;
}
export const OWNER_WINDOW_POLICY:WindowPolicy = {initialSize:100,transitionAt:500,laterSize:500};
export function validWindowPolicy(p:WindowPolicy):boolean {
 return [p.initialSize,p.transitionAt,p.laterSize].every(n=>Number.isSafeInteger(n)&&n>0) && p.transitionAt%p.initialSize===0;
}
export function opportunityWindows(count:number,p:WindowPolicy=OWNER_WINDOW_POLICY) {
 if(!Number.isSafeInteger(count)||count<0||!validWindowPolicy(p))throw new Error('Invalid opportunity window');
 const windows:{start:number;end:number;size:number;sample:number;complete:boolean}[]=[];
 let start=1;
 while(start<=count){const size=start<=p.transitionAt?p.initialSize:p.laterSize;const end=start+size-1;
  windows.push({start,end,size,sample:Math.min(size,count-start+1),complete:end<=count});start=end+1;}
 return windows;
}
export interface BattingEvent {id:string;result:string|null;date:string;order:number;source:string;pitchCount?:number|null}
const HITS=new Set(['1B','2B','3B','HR','single','double','triple','home_run']);
const OUTS=new Set(['K','SO','K_swinging','K_looking','strikeout','GO','FO','LO','PO','FC','ROE','E','groundout','flyout','lineout','popout','out','fielders_choice','error']);
const NON_AB=new Set(['BB','IBB','walk','HBP','hbp','SF','sac_fly','SAC','sac_bunt','CI','catchers_interference']);
export interface BattingWindow {start:number;end:number;hits:number;atBats:number;homeRuns:number;ballsInPlay?:number;strikeouts?:number;plateAppearances?:number;paIds?:string[];pitchCounts?:Record<string,number|null>;sourceIds:string[];from:string;through:string}
export function battingIdentity(events:readonly BattingEvent[],p:WindowPolicy=OWNER_WINDOW_POLICY){
 const unique=new Map<string,BattingEvent>();let invalid=false;
 for(const e of events){const old=unique.get(e.id);
  if(!e.id||!e.source||!Number.isFinite(Date.parse(e.date))||!Number.isFinite(e.order)||old&&JSON.stringify(old)!==JSON.stringify(e)){invalid=true;continue;}
  unique.set(e.id,e);
 }
 const ordered=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order||a.id.localeCompare(b.id));
 if(ordered.some(e=>!HITS.has(e.result??'')&&!OUTS.has(e.result??'')&&!NON_AB.has(e.result??'')))invalid=true;
 const abs=ordered.filter(e=>HITS.has(e.result??'')||OUTS.has(e.result??''));
 const windows=opportunityWindows(abs.length,p);
 const completed:BattingWindow[]=invalid?[]:windows.filter(w=>w.complete).map(w=>{const rows=abs.slice(w.start-1,w.end);
  const previous=w.start>1?abs[w.start-2]:null;const firstIndex=previous?ordered.indexOf(previous)+1:0;
  const lastRow=rows[rows.length-1];
  const pas=ordered.slice(firstIndex,lastRow?ordered.indexOf(lastRow)+1:firstIndex);
  return {start:w.start,end:w.end,hits:rows.filter(e=>HITS.has(e.result??'')).length,atBats:rows.length,
   plateAppearances:pas.length,paIds:pas.map(e=>e.id),pitchCounts:Object.fromEntries(pas.map(e=>[e.id,e.pitchCount??null])),
   homeRuns:rows.filter(e=>e.result==='HR'||e.result==='home_run').length,
   strikeouts:rows.filter(e=>['K','SO','K_swinging','K_looking','strikeout'].includes(e.result??'')).length,
   ballsInPlay:rows.filter(e=>!['HR','home_run','K','SO','K_swinging','K_looking','strikeout'].includes(e.result??'')).length,
   sourceIds:pas.map(e=>e.id),from:rows[0]?.date??'',through:lastRow?.date??''};});
 const latest=completed[completed.length-1]??null;
 const last=windows[windows.length-1];
 const current=last&&!last.complete?last:{start:abs.length+1,end:abs.length+(abs.length<p.transitionAt?p.initialSize:p.laterSize),size:abs.length<p.transitionAt?p.initialSize:p.laterSize,sample:0,complete:false};
 return {status:latest?'Measured':'Need more data',completeHistory:!invalid,latest,completed,current,totalAtBats:abs.length,average:latest?latest.hits/latest.atBats:null};
}
export interface FieldingEvent {id:string;date:string;order:number;source:string|null;error:boolean|null;assist:boolean|null;putout:boolean|null;position:string|null}
/** Only explicitly scored errors, assists or putouts advance fielding chances; unknown rows break certification. */
export function fieldingIdentity(events:readonly FieldingEvent[],p:WindowPolicy=OWNER_WINDOW_POLICY){
 const unique=new Map<string,FieldingEvent>();let invalid=false;let unclassified=0;
 for(const e of events){const old=unique.get(e.id);
  if(!e.id||!e.source||!Number.isFinite(Date.parse(e.date))||!Number.isFinite(e.order)||old&&JSON.stringify(old)!==JSON.stringify(e)){invalid=true;unclassified++;continue;}
  unique.set(e.id,e);
 }
 const ordered=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order||a.id.localeCompare(b.id));
 const chances=ordered.filter(e=>{const scored=e.error===true||e.assist===true||e.putout===true;
  if(!scored||e.error===null){invalid=true;unclassified++;return false;}return true;});
 const windows=opportunityWindows(chances.length,p);
 const completed=invalid?[]:windows.filter(w=>w.complete).map(w=>{const rows=chances.slice(w.start-1,w.end);const errors=rows.filter(e=>e.error===true).length;
  return {...w,chances:rows.length,errors,successful:rows.length-errors,rate:(rows.length-errors)/rows.length,sourceIds:rows.map(e=>e.id),from:rows[0]?.date??'',through:rows[rows.length-1]?.date??''};});
 const latest=completed[completed.length-1]??null;const last=windows[windows.length-1];const size=chances.length<p.transitionAt?p.initialSize:p.laterSize;
 const current=last&&!last.complete?last:{start:chances.length+1,end:chances.length+size,size,sample:0,complete:false};
 return {status:latest?'Measured':'Need more data',completeHistory:!invalid,latest,completed,current,totalChances:chances.length,unclassified};
}
export interface MasteryCutoffs {eliteHomeRuns:number|null;lackingPowerHomeRuns:number|null;eliteGrade:number}
export const DEFAULT_MASTERY_CUTOFFS:MasteryCutoffs={eliteHomeRuns:null,lackingPowerHomeRuns:null,eliteGrade:65};
export interface SpeedEvidence {id:string;source:string;date:string;measure:string;unit:string;value:number;grade:number|null;kind:'measured'|'self_report';sample:number;minimum:number|null}
export function speedIdentity(evidence:readonly SpeedEvidence[],eliteGrade=65){
 const valid=evidence.filter(e=>e.kind==='measured'&&e.id&&e.source&&Number.isFinite(Date.parse(e.date))&&Number.isFinite(e.value)&&e.value>0&&e.minimum!==null&&e.minimum>0&&e.sample>=e.minimum);
 const usable=valid.filter(e=>typeof e.grade==='number'&&Number.isFinite(e.grade)&&e.grade>=0&&e.grade<=80&&(e.grade<20||e.grade%5===0));
 const ambiguous=new Set<string>();const unique=new Map<string,SpeedEvidence>();
 for(const e of usable){const old=unique.get(e.id);if(old&&JSON.stringify(old)!==JSON.stringify(e))ambiguous.add(e.id);else unique.set(e.id,e);}
 const rows=[...unique.values()].filter(e=>!ambiguous.has(e.id));
 // Preserve each method; no composite or average of incompatible measurements.
 const latest=new Map<string,SpeedEvidence>();for(const row of rows){const key=`${row.source}:${row.measure}:${row.unit}`;const old=latest.get(key);if(!old||row.date>old.date)latest.set(key,row);}
 const current=[...latest.values()];const elite=current.length?current.some(e=>(e.grade??0)>=eliteGrade):null;
 return {status:elite===null?'Need more data':elite?'Elite':'Building',elite,evidence:current};
}
export function masteryBuntingTraits(window:BattingWindow|null,speed:ReturnType<typeof speedIdentity>,cutoffs:MasteryCutoffs=DEFAULT_MASTERY_CUTOFFS){
 const power=window&&cutoffs.eliteHomeRuns!==null?window.homeRuns>=cutoffs.eliteHomeRuns:null;
 const lacks=window&&cutoffs.lackingPowerHomeRuns!==null?window.homeRuns<=cutoffs.lackingPowerHomeRuns:null;
 return {speedy:speed.elite===true,lacksPower:lacks===true,leftPower:power===true,powerStatus:power===null?'Need more data':power?'Elite':'Building',power,battingWindow:window};
}
export interface PillarEvidence {pillar:'contact'|'defense'|'arm'|'speed'|'power';grade:number|null;sourceIds:readonly string[];attainability:number|null}
/** Only comparable source-backed grades choose a weak pillar; missingness isn't a bad grade. */
export function weakestRequiredPillar(rows:readonly PillarEvidence[],eliteGrade=65){
 const eligible=rows.filter(r=>r.sourceIds.length&&r.grade!==null&&Number.isFinite(r.grade));
 const alternatives=eligible.filter(r=>r.pillar==='speed'||r.pillar==='power');
 const satisfied=alternatives.some(r=>(r.grade??0)>=eliteGrade);
 const attainable=alternatives.filter(r=>r.attainability!==null&&Number.isFinite(r.attainability));
 const chosen=!satisfied&&attainable.length===2?attainable.sort((a,b)=>(b.attainability??0)-(a.attainability??0))[0]:null;
 const required=eligible.filter(r=>['contact','defense','arm'].includes(r.pillar)||(chosen&&r.pillar===chosen.pillar));
 const weakest=required.filter(r=>(r.grade??0)<eliteGrade).sort((a,b)=>(a.grade??0)-(b.grade??0))[0]??null;
 return {weakest:weakest?.pillar??null,speedOrPower:satisfied?'Satisfied':chosen?.pillar??'Need more data',missing:['contact','defense','arm'].filter(p=>!eligible.some(r=>r.pillar===p))};
}