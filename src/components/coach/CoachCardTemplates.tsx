import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSentActivities } from '@/hooks/useSentActivities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SendToPlayerDialog } from '@/components/custom-activities/SendToPlayerDialog';
import { runCoachWarningAction } from '@/lib/coachRx/warningAction';
import type { CustomActivityTemplate } from '@/types/customActivity';
import { getTodayDate } from '@/utils/dateUtils';
import { toast } from 'sonner';

type CardTemplate=CustomActivityTemplate & {coach_card_category:string};
export function CoachCardTemplates(){
  const {user}=useAuth();const qc=useQueryClient();
  const query=useQuery({queryKey:['coach-card-templates',user?.id],enabled:!!user,queryFn:async()=>{if(!user)return [];const r=await supabase.from('custom_activity_templates').select('*').eq('user_id',user.id).not('coach_card_category','is',null).is('deleted_at',null).order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;return r.data as unknown as CardTemplate[];}});
  const {followedPlayers,fetchFollowedPlayers,loadingPlayers}=useSentActivities();
  const [apply,setApply]=useState<CardTemplate|null>(null);const [send,setSend]=useState<CardTemplate|null>(null);
  const [player,setPlayer]=useState('');const [date,setDate]=useState(getTodayDate());const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const commit=async()=>{if(!apply || !player)return;setBusy(true);setError('');try{const result=await runCoachWarningAction(async(ack,reason)=>{const r=await supabase.functions.invoke('coach-rx-safety',{body:{mode:'edit_day',athlete_id:player,plan_date:date,category:apply.coach_card_category,title:apply.title,exercises:apply.exercises,intensity:apply.intensity==='moderate'?'standard':apply.intensity,template_id:apply.id,warning_acknowledgement:ack,override_reason:reason}});if(r.error)throw r.error;return r.data;});if(result.cancelled)return;if(!result.applied){setError(result.reasons?.[0] ?? result.error ?? 'Nothing changed.');return;}toast.success('Template applied to the saved day. The player was notified.');await qc.invalidateQueries({queryKey:['coach-player-week']});setApply(null);}catch(e){setError(e instanceof Error?e.message:'Could not apply.');}finally{setBusy(false);}};
  return <section aria-label="Saved card templates" className="space-y-3"><h3 className="font-semibold">Saved templates</h3>{query.isLoading?<p>Loading templates…</p>:query.error?<p role="alert">Couldn’t load templates.</p>:!query.data?.length?<p className="text-sm text-muted-foreground">No saved card templates.</p>:query.data.map(t=><div key={t.id} className="rounded-md border border-border p-3"><p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.coach_card_category} · {t.exercises.length} activities</p><ul className="my-2 text-sm">{t.exercises.map((e,i)=><li key={e.id ?? i}>{e.name} · {e.sets ?? '—'} sets · {e.reps ?? e.duration ?? e.distance_feet ?? '—'} {e.dosage_unit ?? 'reps'}</li>)}</ul><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>{setApply(t);setPlayer('');setError('');void fetchFollowedPlayers();}}>Apply to…</Button><Button size="sm" onClick={()=>setSend(t)}>Send workouts</Button></div></div>)}
    <Dialog open={!!apply} onOpenChange={v=>{if(!v && !busy)setApply(null);}}><DialogContent><DialogHeader><DialogTitle>Apply template · {apply?.title}</DialogTitle></DialogHeader><Label>Player<select aria-label="Apply to player" className="w-full rounded-md border border-input bg-background p-2" value={player} onChange={e=>setPlayer(e.target.value)}><option value="">{loadingPlayers?'Loading players…':'Choose player'}</option>{followedPlayers.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Label><Label>Day<Input aria-label="Apply on day" type="date" min={getTodayDate()} value={date} onChange={e=>setDate(e.target.value)}/></Label>{error && <p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy || !player || !date} onClick={()=>void commit()}>{busy?'Checking…':'Apply to this day'}</Button></DialogContent></Dialog>
    <SendToPlayerDialog open={!!send} onOpenChange={v=>{if(!v)setSend(null);}} template={send}/>
  </section>;
}