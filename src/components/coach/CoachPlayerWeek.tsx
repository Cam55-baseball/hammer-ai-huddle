import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTodayDate } from '@/utils/dateUtils';
import { playerWeekCards, weekDates, WORK_STATUS, type WeekResult } from '@/lib/coach/playerWeek';
import { useSessionControls } from '@/hooks/useSessionControls';
import { SessionControlActions } from './SessionControlActions';
import { controlNote } from '@/lib/coachRx/sessionControls';
import { CoachDayEditor } from './CoachDayEditor';
import { AddCoachNoteDialog } from './CoachTestsAndNotes';

/** Owner Nov 6 r3: long names clamp with an ellipsis; tap to expand. */
export function ClampText({text,className=''}:{text:string;className?:string}) {
  const [open,setOpen]=useState(false);
  return <button type="button" title={text} aria-expanded={open} onClick={(e)=>{e.preventDefault();e.stopPropagation();setOpen(!open);}}
    className={`block w-full min-w-0 text-left break-words ${open?'':'line-clamp-2'} ${className}`}>{text}</button>;
}
export function StatusChip({label,done}:{label:string;done?:boolean}) {
  return <span className={`inline-block max-w-full whitespace-normal break-words rounded-full border px-2 py-0.5 text-[11px] leading-4 ${done?'border-primary text-primary':'border-border text-muted-foreground'}`}>{label}</span>;
}
const dateLabel = (date:string, options:Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US',options);
export function CoachPlayerWeek({athleteId}:{athleteId:string}) {
  const {user} = useAuth();
  const [offset,setOffset] = useState(0);
  const [selected,setSelected] = useState(getTodayDate());
  const dates = weekDates(getTodayDate(),offset);
  const controlQuery=useSessionControls(athleteId,dates[0],dates[6]);
  const query = useQuery({queryKey:['coach-player-week',user?.id,athleteId,dates[0]],enabled:!!user?.id,staleTime:60_000,
    queryFn:async ():Promise<WeekResult> => {
      const {data,error}=await supabase.rpc('coach_athlete_week' as never,{_athlete:athleteId,_from:dates[0]} as never);
      if(error) throw error;
      const result = data as unknown as WeekResult;
      if (result.state === 'denied') return result;
      const lineage = await supabase.rpc('coach_week_rx_lineage' as never, {_athlete:athleteId,_from:dates[0]} as never);
      if (lineage.error) throw lineage.error;
      const ids = lineage.data as unknown as Record<string,string>;
      return {...result,days:result.days.map(day=>({...day,prescriptions:day.prescriptions.map(p=>({...p,coach_rx:ids[p.id] ?? null}))}))};
    }});
  const selectWeek = (n:number) => {setOffset(n);setSelected(weekDates(getTodayDate(),n)[0]);};
  const active = query.data?.days?.find(d=>d.date===selected);
  const controlsFor=(date:string)=>controlQuery.controls.filter(c=>c.plan_date===date && c.sport===query.data?.sport);
  const cards = active ? playerWeekCards(active,controlsFor(selected)):[];
  return <section aria-label="Player week calendar" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Player week</h2>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Previous week" title="Previous week" onClick={()=>selectWeek(offset-1)}><ChevronLeft className="h-4 w-4"/></Button>
        <Button variant="ghost" size="sm" onClick={()=>selectWeek(0)}>This week</Button>
        <Button variant="outline" size="icon" aria-label="Next week" title="Next week" onClick={()=>selectWeek(offset+1)}><ChevronRight className="h-4 w-4"/></Button>
        <Button variant="ghost" size="icon" aria-label="Refresh player week" title="Refresh player week" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw className="h-4 w-4"/></Button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">{dateLabel(dates[0],{month:'short',day:'numeric'})} – {dateLabel(dates[6],{month:'short',day:'numeric',year:'numeric'})}</p>
    {query.isLoading ? <p role="status">Loading saved week…</p> : query.error ? <p role="alert" className="text-destructive">Couldn't load this week. Try refresh.</p> : query.data?.state==='denied' ? <p role="alert">Training sharing isn't available for this player.</p> : <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {dates.map(date=>{const day=query.data?.days?.find(d=>d.date===date);const daily=day?playerWeekCards(day,controlsFor(date)):[];
          return <div key={date} className={`min-w-0 min-h-24 overflow-hidden rounded-md border p-2 ${date===selected?'border-primary':'border-border'}`}>
            <Button className="mb-2 w-full" variant={date===selected?'default':'ghost'} aria-pressed={date===selected} onClick={()=>setSelected(date)} aria-label={`Open ${date}`}>
              {dateLabel(date,{weekday:'short',day:'numeric'})}
            </Button>
            {day?.restDay && <p className="mb-2 text-xs font-semibold">Rest day</p>}
            {!day || day.plan.state==='unavailable' ? <p className="text-xs text-muted-foreground">No saved plan</p>:null}
            <ul className="max-h-72 space-y-3 overflow-y-auto">{daily.map(card=><li key={card.id} className="min-w-0 space-y-1 rounded border border-border p-2 text-xs"><ClampText text={card.title} className="font-semibold"/><StatusChip label={WORK_STATUS[card.status]} done={card.status==='done'}/><details className="mt-1"><summary className="cursor-pointer text-muted-foreground">Activities ({card.activities.length})</summary><ul className="mt-1 space-y-2">{card.activities.map(a=><li key={a.id} className="min-w-0 space-y-0.5"><ClampText text={a.name}/><StatusChip label={WORK_STATUS[a.status]} done={a.status==='done'}/></li>)}</ul></details></li>)}</ul>
          </div>;})}
      </div>
      <div className="space-y-3 border-t border-border pt-4" data-week-day-details>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 font-semibold">{dateLabel(selected,{weekday:'long',month:'short',day:'numeric'})}{active?.restDay?' · Rest day':''}</h3><AddCoachNoteDialog key={selected} athleteId={athleteId} contextLine={dateLabel(selected,{weekday:'short',month:'short',day:'numeric'})}/></div>
        {!cards.length && <p className="text-sm text-muted-foreground">{active?.plan.state==='unavailable'?'No plan saved for this day.':'No saved activities for this day.'}</p>}
        {controlQuery.error && <p role="alert">Coach decisions could not be loaded. Refresh before changing work.</p>}
        {cards.map(card=><details key={card.id} open={card.activities.some(a=>a.results.length>0 || a.control)} className="min-w-0 space-y-2 border-b border-border pb-3"><summary className="flex cursor-pointer items-start gap-2 font-semibold"><span className="min-w-0 flex-1"><ClampText text={card.title}/></span><span className="shrink-0 max-w-[45%]"><StatusChip label={WORK_STATUS[card.status]} done={card.status==='done'}/></span></summary>
          {active && <CoachDayEditor athleteId={athleteId} day={active} card={card} sport={query.data?.sport ?? ''}/>}
          {!controlQuery.error && !controlQuery.isLoading && <SessionControlActions athleteId={athleteId} date={selected} sport={query.data?.sport ?? ''} name={card.title} targets={card.activities.filter(a=>a.target && !a.control && a.status!=='removed').flatMap(a=>a.target?[{...a.target,cardTitle:card.title}]:[])}/>}
          <ul className="space-y-3 pt-2">{card.activities.map(a=><li key={a.id} className="min-w-0 space-y-1 text-sm"><div className="flex items-start gap-2"><span className="min-w-0 flex-1 font-medium"><ClampText text={a.name}/></span><span className="shrink-0 max-w-[45%]"><StatusChip label={WORK_STATUS[a.status]} done={a.status==='done'}/></span></div>{a.control && <div className="border-l-2 border-primary pl-2"><p>{controlNote(a.control)}</p><p className="text-xs text-muted-foreground">{new Date(a.control.created_at).toLocaleString()}{a.control.skipped_at?` · Player skipped ${new Date(a.control.skipped_at).toLocaleString()}`:''}</p></div>}{a.dosage && <p className="text-xs text-muted-foreground">Planned: {a.dosage}</p>}{a.results.length?a.results.map((r,i)=><p key={i} className="text-xs">Logged: {r}</p>):<p className="text-xs text-muted-foreground">No entered results</p>}
          {a.target && !a.control && a.status!=='removed' && !controlQuery.error && !controlQuery.isLoading && <SessionControlActions athleteId={athleteId} date={selected} sport={query.data?.sport ?? ''} name={a.name} targets={[{...a.target,cardTitle:card.title}]}/>}
          </li>)}</ul></details>)}
      </div>
    </>}
  </section>;
}