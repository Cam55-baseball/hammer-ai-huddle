import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { controlNote, type SessionControl } from '@/lib/coachRx/sessionControls';
export function SentSessionControls() {
  const {user}=useAuth();
  const query=useQuery({queryKey:['sent-session-controls',user?.id],enabled:!!user,staleTime:30_000,queryFn:async()=>{
    if(!user)return [];
    const r=await supabase.from('coach_session_controls').select('*').eq('actor_id',user.id).order('created_at',{ascending:false}).limit(100);
    if(r.error)throw r.error;
    const ids=[...new Set((r.data ?? []).map(c=>c.athlete_id))];
    const names=ids.length?await supabase.from('profiles').select('id,full_name').in('id',ids):{data:[],error:null};
    if(names.error)throw names.error;
    return ((r.data ?? []) as SessionControl[]).map(c=>({...c,athlete_name:names.data?.find(p=>p.id===c.athlete_id)?.full_name ?? 'Player'}));
  }});
  return <section className="space-y-3" aria-label="Sent session decisions"><h3 className="font-semibold">Session skip decisions</h3>{query.isLoading?<p role="status">Loading decisions…</p>:query.error?<p role="alert">Could not load session decisions.</p>:!query.data?.length?<p className="text-sm text-muted-foreground">No session skip decisions yet.</p>:query.data.map(c=><div key={c.id} className="border-b border-border pb-2 text-sm"><p className="font-medium">{c.athlete_name} · {c.card_title} · {c.target_name} · {c.plan_date}</p><p>{controlNote(c)}</p><p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()} · {c.mode==='remove'?'Removed for this session':c.skipped_at?'Skipped (allowed)':'Player’s choice — not skipped'}{c.skipped_at?` · ${new Date(c.skipped_at).toLocaleString()}`:''}</p></div>)}</section>;
}