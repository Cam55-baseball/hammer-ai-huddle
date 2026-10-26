import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {reactionEquivalentMph,weightedPracticeWhiff,whiffWeight,type PracticeSession,type PracticeType} from '../../../supabase/functions/_shared/wic/practiceDifficulty';

const TYPES:{v:PracticeType;l:string}[]=[{v:'tee',l:'Tee'},{v:'soft_toss',l:'Soft toss'},{v:'front_toss',l:'Front toss'},{v:'coach_bp',l:'Coach BP'},{v:'machine',l:'Machine'},{v:'live_bp',l:'Live BP'},{v:'live_ab',l:'Live at-bats / scrimmage'}];
export interface PracticeRow{id:string;practice_date:string;practice_type:PracticeType;pitch_mph:number|null;release_ft:number|null;pitch_mix:'fastballs'|'mixed'|null;swings:number;whiffs:number}
export const toSession=(r:PracticeRow,sport:'baseball'|'softball'):PracticeSession=>({type:r.practice_type,sport,mph:r.pitch_mph,releaseFt:r.release_ft,mix:r.pitch_mix,swings:r.swings,whiffs:r.whiffs});
const num=(s:string)=>s.trim()===''?null:Number(s);

/** Self-only practice swing-and-miss log. Weighted practice whiffs never change game identity windows. */
export function PracticeSwingLog({sport}:{sport:'baseball'|'softball'}){
 const qc=useQueryClient();const key=['practice-swing-logs',sport];
 const [type,setType]=useState<PracticeType>('tee');const [mph,setMph]=useState('');const [ft,setFt]=useState('');
 const [mix,setMix]=useState<''|'fastballs'|'mixed'>('');const [swings,setSwings]=useState('');const [whiffs,setWhiffs]=useState('');const [err,setErr]=useState<string|null>(null);
 const rows=useQuery({queryKey:key,queryFn:async()=>{const {data,error}=await (supabase as any).from('practice_swing_logs').select('id,practice_date,practice_type,pitch_mph,release_ft,pitch_mix,swings,whiffs').eq('sport',sport).order('practice_date',{ascending:false}).limit(30);if(error)throw error;return (data??[]) as PracticeRow[];}});
 const save=useMutation({mutationFn:async()=>{
  const sw=Number(swings),wh=Number(whiffs);
  if(!Number.isInteger(sw)||sw<1||!Number.isInteger(wh)||wh<0||wh>sw)throw new Error('Enter whole numbers: at least 1 swing, and misses no more than swings.');
  const m=num(mph),f=num(ft);if((m!=null&&!(m>0))||(f!=null&&!(f>0)))throw new Error('Pitch speed and distance must be above zero.');
  const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to save.');
  const {error}=await (supabase as any).from('practice_swing_logs').insert({user_id:user.id,sport,practice_type:type,pitch_mph:m,release_ft:f,pitch_mix:mix||null,swings:sw,whiffs:wh});
  if(error)throw error;},
  onSuccess:()=>{setErr(null);setSwings('');setWhiffs('');qc.invalidateQueries({queryKey:key});},onError:(e:any)=>setErr(e?.message??'Could not save. Nothing was recorded.')});
 const list=rows.data??[];const summary=weightedPracticeWhiff(list.map(r=>toSession(r,sport)));
 const needsSpeed=type==='machine'||type==='live_bp'||type==='live_ab';
 const eq=reactionEquivalentMph({mph:num(mph),releaseFt:num(ft),sport});
 return <section aria-label="Practice swing and miss" className="space-y-3 border-b border-border pb-4">
  <h3 className="font-medium">Practice swing-and-miss</h3>
  <p className="text-sm text-muted-foreground">Practice counts toward your practice report and plan focus. Your game at-bats still decide your identity.</p>
  <div className="grid grid-cols-2 gap-2 text-sm">
   <div className="col-span-2"><Label htmlFor="ps-type">Type</Label><select id="ps-type" className="w-full rounded-md border border-input bg-background p-2" value={type} onChange={e=>setType(e.target.value as PracticeType)}>{TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
   {needsSpeed&&<><div><Label htmlFor="ps-mph">Pitch speed (mph)</Label><Input id="ps-mph" inputMode="decimal" value={mph} onChange={e=>setMph(e.target.value)}/></div>
   <div><Label htmlFor="ps-ft">Release distance (ft)</Label><Input id="ps-ft" inputMode="decimal" placeholder={sport==='softball'?'43 or 46':'60.5'} value={ft} onChange={e=>setFt(e.target.value)}/></div>
   <div className="col-span-2"><Label htmlFor="ps-mix">Pitches</Label><select id="ps-mix" className="w-full rounded-md border border-input bg-background p-2" value={mix} onChange={e=>setMix(e.target.value as any)}><option value="">Not sure</option><option value="fastballs">Fastballs only</option><option value="mixed">Mixed pitches</option></select></div>
   {eq&&<p className="col-span-2 text-muted-foreground">Feels like about {eq.mph.toFixed(1)} mph from a standard distance. {eq.label}.</p>}</>}
   <div><Label htmlFor="ps-sw">Swings</Label><Input id="ps-sw" inputMode="numeric" value={swings} onChange={e=>setSwings(e.target.value)}/></div>
   <div><Label htmlFor="ps-wh">Misses</Label><Input id="ps-wh" inputMode="numeric" value={whiffs} onChange={e=>setWhiffs(e.target.value)}/></div>
  </div>
  {err&&<p role="alert" className="text-sm text-destructive">{err}</p>}
  <Button size="sm" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving…':'Save practice'}</Button>
  {rows.isError?<p role="alert" className="text-sm text-destructive">Couldn't read your practice log.</p>:
  <p className="text-sm text-muted-foreground">Weighted practice miss rate: {summary.rate==null?'Need more data':`${(summary.rate*100).toFixed(1)}% across ${summary.swings} swings`}{summary.skipped?` · ${summary.skipped} session(s) need speed/distance or pitch mix to count`:''}. Source: your practice logs; harder pitching counts misses less (tee 1.0 → live 0.3).</p>}
  {list.slice(0,5).map(r=>{const w=whiffWeight(toSession(r,sport));return <p key={r.id} className="text-xs text-muted-foreground">{r.practice_date} · {TYPES.find(t=>t.v===r.practice_type)?.l}: {r.whiffs} misses / {r.swings} swings · weight {w==null?'Need more data':w.toFixed(1)}</p>;})}
 </section>;
}
