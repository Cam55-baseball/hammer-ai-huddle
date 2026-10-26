import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {pitchingCounts,type PitcherGameRow} from '../../../supabase/functions/_shared/wic/pitchingCounts';
import {judgePitching} from '../../../supabase/functions/_shared/wic/masteryPitchingStandards';
import type {MasteryLevel} from '../../../supabase/functions/_shared/wic/masteryStandards';
const LABEL:Record<string,string>={k_pct:'K%',bb_pct:'BB%',k_bb:'K:BB',k_per_7:'K per 7',bb_per_7:'BB per 7',first_pitch_strike_pct:'First-pitch strike %',two_ball_pct:'Batters reaching two balls',whip:'WHIP',opp_avg:'Opponent AVG',era:'ERA',soft_contact_pct:'Soft contact %',scoring_pos_inning_pct:'Innings with a runner on 2B/3B',sb_per_game:'Stolen bases allowed per game',opp_sb_success_pct:'Opponent steal success',time_to_plate_s:'Time to plate (s)',pfp_clean_pct:'Clean fielding plays'};
const pct=new Set(['k_pct','bb_pct','first_pitch_strike_pct','two_ball_pct','soft_contact_pct','scoring_pos_inning_pct','opp_sb_success_pct','pfp_clean_pct']);
const fmt=(k:string,v:number)=>pct.has(k)?`${(v*100).toFixed(1)}%`:k==='opp_avg'?v.toFixed(3):v.toFixed(2);
/** Most recent whole games covering at least `size` batters faced. Whole games only; labeled so. */
export function latestWindowGames(games:readonly PitcherGameRow[],size:number){
 const out:PitcherGameRow[]=[];let bf=0;
 for(const g of [...games].reverse()){out.unshift(g);bf+=typeof g.batters_faced==='number'?g.batters_faced:0;if(bf>=size)return {games:out,bf,complete:true};}
 return {games:out,bf,complete:false};
}
export function PitchingJudgement({sport,athleteId,level,size,overrides}:{sport:'baseball'|'softball';athleteId?:string;level:MasteryLevel|null;size:number;overrides:Record<string,number>}){
 const date=new Date().toLocaleDateString('en-CA');
 const q=useQuery({queryKey:['pitching-lines',sport,athleteId,date],queryFn:async()=>{const r=await supabase.rpc('mastery_pitching_lines' as never,{p_sport:sport,p_date:date,p_athlete:athleteId??null} as never);if(r.error)throw r.error;return (r.data??[]) as unknown as PitcherGameRow[];}});
 if(q.isError)return <p role="alert" className="text-destructive">Couldn't read pitching game logs. No pitching judgment was made.</p>;
 if(q.isPending)return null;
 const w=latestWindowGames(q.data,size);
 if(!w.complete)return <p className="text-muted-foreground">Pitching ({sport}) · Need more data: {w.bf} / {size} batters faced logged. Source: pitching game logs.</p>;
 const j=judgePitching(pitchingCounts(w.games),sport,level,overrides);
 return <div aria-label="Pitching judgment" className="space-y-1">
  <p className="font-medium">Pitching ({sport}) · {j.status}</p>
  <p className="text-muted-foreground">Window: last {w.games.length} games, {w.bf} batters faced (whole games). Source: pitching game logs · starting standard (owner-editable).</p>
  {j.parts.map(p=><p key={p.key} className="text-muted-foreground">{LABEL[p.key]??p.key} · {p.status}: {p.value==null?'Need more data':fmt(p.key,p.value)} (elite {p.dir==='min'?'at least':'at most'} {fmt(p.key,p.standard)})</p>)}
  {!level&&<p className="text-muted-foreground">{j.reason}</p>}
 </div>;
}
