import { useAuth } from '@/hooks/useAuth';
import { useSessionControls } from '@/hooks/useSessionControls';
import { controlNote } from '@/lib/coachRx/sessionControls';
import { getTodayDate } from '@/utils/dateUtils';
export function UpcomingSessionDecisions() {
  const {user}=useAuth();
  const today=getTodayDate();
  const query=useSessionControls(user?.id,today);
  const upcoming=query.controls.filter(c=>c.plan_date>today);
  if(query.error)return <p role="alert">Upcoming coach notes could not be loaded.</p>;
  if(!upcoming.length)return null;
  return <section className="space-y-2 border-t border-border pt-3" aria-label="Upcoming session decisions"><h3 className="text-sm font-semibold">Upcoming coach notes</h3>{upcoming.map(c=><div key={c.id} className="border-l-2 border-primary pl-3 text-sm" data-upcoming-session-control={c.mode}><p className="font-medium">{c.plan_date} · {c.card_title} · {c.target_name}</p><p>{controlNote(c).replace('for today',`for ${c.plan_date}`).replace('this today',`this on ${c.plan_date}`)}</p><p className="text-xs text-muted-foreground">{c.mode==='remove'?'Removed for this session — no Discipline penalty':'Your choice on that day — no Discipline penalty if skipped'}</p></div>)}</section>;
}