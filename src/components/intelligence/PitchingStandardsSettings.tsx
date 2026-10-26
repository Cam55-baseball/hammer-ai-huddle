import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {startingStandards,type PitchSport} from '../../../supabase/functions/_shared/wic/masteryPitchingStandards';
import type {MasteryLevel} from '../../../supabase/functions/_shared/wic/masteryStandards';
const LEVELS:MasteryLevel[]=['pro','college','high_school','youth'];
const NAMES:Record<string,string>={k_pct:'Strikeouts per batter (at least)',bb_pct:'Walks per batter (at most)',k_bb:'Strikeouts per walk (at least)',first_pitch_strike_pct:'First-pitch strikes (at least)',two_ball_pct:'Batters reaching 2 balls (at most)',whip:'WHIP (at most)',opp_avg:'Opponent average (at most)',soft_contact_pct:'Soft contact on balls in play (at least)',scoring_pos_inning_pct:'Innings with a runner on 2nd or 3rd (at most)',sb_per_game:'Stolen bases allowed per game (at most)',opp_sb_success_pct:'Opponent steal success (at most)',time_to_plate_s:'Time to plate, seconds (at most)',pfp_clean_pct:'Clean fielding plays (at least)',k_per_7:'Strikeouts per 7 (at least)',bb_per_7:'Walks per 7 (at most)',era:'ERA (at most)'};
export function PitchingStandardsSettings(){
 const [sport,setSport]=useState<PitchSport>('baseball');const [vals,setVals]=useState<Record<string,string>>({});const [msg,setMsg]=useState('');
 const q=useQuery({queryKey:['pitching-standards',sport],queryFn:async()=>{const r=await supabase.from('mastery_identity_settings').select('pitching_standards').eq('sport',sport).maybeSingle();if(r.error)throw r.error;return (r.data?.pitching_standards??{}) as Record<string,number>;}});
 useEffect(()=>{if(!q.isSuccess)return;const o:Record<string,string>={};for(const l of LEVELS)for(const s of startingStandards(sport,l,q.data))o[`${sport}_${l}_${s.key}`]=String(s.value);setVals(o);},[q.data,q.isSuccess,sport]);
 async function save(){const out:Record<string,number>={};for(const [k,v] of Object.entries(vals)){const n=Number(v);if(v.trim()===''||!Number.isFinite(n)||n<0){setMsg('Every starting standard needs a number of 0 or more.');return;}out[k]=n;}
  const r=await supabase.from('mastery_identity_settings').upsert({sport,pitching_standards:out} as never);if(r.error){setMsg("Couldn't save. Your changes are still here.");return;}const back=await q.refetch();setMsg(back.data?'Starting standards saved and read back.':"Saved, but couldn't read back.");}
 return <section aria-label="Pitching starting standards" className="space-y-3 border-b border-border py-4">
  <h2 className="text-lg font-semibold">Pitching starting standards</h2>
  <p className="text-sm text-muted-foreground">Starting standard — you can edit these; they'll be calibrated later from Hammers data. Judged in batters-faced windows. Baseball and softball are separate.</p>
  <div className="flex gap-2">{(['baseball','softball'] as const).map(s=><Button key={s} variant={sport===s?'default':'outline'} onClick={()=>setSport(s)}>{s==='baseball'?'Baseball':'Softball'}</Button>)}</div>
  {q.isError?<p role="alert" className="text-sm text-destructive">Couldn't read saved standards.</p>:LEVELS.map(l=><div key={l} className="space-y-2"><h3 className="font-medium capitalize">{l.replace('_',' ')}</h3><div className="grid gap-2 sm:grid-cols-2">
   {startingStandards(sport,l).map(s=>{const k=`${sport}_${l}_${s.key}`;return <div key={k} className="space-y-1"><Label htmlFor={k}>{NAMES[s.key]??s.key} · starting standard</Label><Input id={k} type="number" step="0.001" value={vals[k]??''} onChange={e=>setVals(p=>({...p,[k]:e.target.value}))}/></div>;})}</div></div>)}
  <Button onClick={save} disabled={q.isPending||q.isError}>Save pitching standards</Button>{msg&&<p role="status" className="text-sm">{msg}</p>}
 </section>;
}
