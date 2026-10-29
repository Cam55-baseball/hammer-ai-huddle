export interface ComposedDayEvidence { date:string; sport:string; phase:string; restDay:boolean; blocks:readonly {modality:string;status:string;drills:readonly {bunt?:unknown}[]}[]; physical:readonly {slot:string;phase:string;slug?:string|null}[]; }
const skillCategories=new Set(['hitting','throwing','defense','baserunning']);
export function composedDayCategories(day:ComposedDayEvidence):string[]{
  if(day.restDay)return ['Recovery'];
  const out=new Set<string>();
  for(const b of day.blocks)if(b.status==='ready'&&b.drills.length&&skillCategories.has(b.modality)){
    out.add(b.modality==='defense'?'Defense':b.modality==='baserunning'?'Baserunning':b.modality==='throwing'?'Throwing':'Hitting');
    if(b.modality==='hitting'&&b.drills.some(d=>!!d.bunt))out.add('Bunting');
  }
  for(const r of day.physical){if(r.slot==='lift')out.add('Lifts');if(r.slot==='speed')out.add('Speed');if(r.slot==='conditioning')out.add('Conditioning');}
  return [...out];
}
/** Counts actual saved dates, not roadmap intentions. Explicit restrictions are reported, never counted as work. */
export function certifyComposedWeek(days:readonly ComposedDayEvidence[],sport:string, boughtBunting:boolean){
  const counts:Record<string,number>={};const issues:string[]=[];
  if(days.length!==7||new Set(days.map(d=>d.date)).size!==7)issues.push('seven_distinct_saved_dates_required');
  for(const day of days){
    if(day.sport!==sport)issues.push(`${day.date}:sport_mismatch`);
    if(day.physical.some(r=>r.phase!==day.phase))issues.push(`${day.date}:season_mismatch`);
    const categories=composedDayCategories(day);
    if(!day.restDay&&!categories.length)issues.push(`${day.date}:thin_day`);
    if(!day.restDay)for(const category of categories)counts[category]=(counts[category]??0)+1;
  }
  const floors={Hitting:3,Defense:4,Baserunning:1,Conditioning:2,...(boughtBunting?{Bunting:2}:{})};
  for(const [key,floor]of Object.entries(floors))if((counts[key]??0)<floor)issues.push(`${key}:${counts[key]??0}/${floor}`);
  return {ok:issues.length===0,counts,issues};
}