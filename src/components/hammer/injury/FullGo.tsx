import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getTodayDate } from '@/utils/dateUtils';
import { finishParentClear, requestFullGo } from '@/lib/hammer/injury/fullGo';
import { activeInjuryAreas, injuryProgressLine, pendingFullGoRequest } from '../../../../supabase/functions/_shared/health/fullGo';

/** The player's own injury entries and birthday (wording only; the server decides who can clear). */
export function useInjuryHistory() {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['injury-history', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from('athlete_context').select('injury_history').eq('user_id', user!.id).maybeSingle(),
        supabase.from('profiles').select('date_of_birth').eq('id', user!.id).maybeSingle(),
      ]);
      if (c.error) throw c.error;
      const dob = p.data?.date_of_birth ?? null;
      const age = dob ? Math.floor((Date.now() - Date.parse(`${dob}T00:00:00Z`)) / (365.2425 * 86400000)) : null;
      return { history: Array.isArray(c.data?.injury_history) ? c.data!.injury_history as unknown[] : [], minor: age === null || age < 18 };
    },
  });
  // A parent's confirmation finishes here: this player's own session rebuilds the week once.
  const ran = useRef(false);
  useEffect(() => {
    const h = q.data?.history;
    if (!user?.id || !h || ran.current || !h.some((e: any) => e?.rebuild_pending === true)) return;
    ran.current = true;
    void finishParentClear(user.id, h, qc).then(m => { if (m) toast.success(m); });
  }, [q.data, user?.id, qc]);
  return { ...q, areas: activeInjuryAreas(q.data?.history) };
}

const label = (a: string) => a.charAt(0).toUpperCase() + a.slice(1);

/** Lives only between an entered injury and full go. Two Confirms; either Cancel changes nothing. */
export function FullGoPrompt({ area, history, minor }: { area: string; history: unknown[]; minor: boolean }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  if (pendingFullGoRequest(history, area)) return <p className="text-xs text-muted-foreground">Waiting for your parent to confirm your {area} is healed.</p>;
  const run = async () => {
    // Owner Nov 2 #9: close right away; the save and rebuild finish in the background with a toast.
    setStep(0); setBusy(true);
    toast.message('Saving. Your plan updates in the background.');
    try { const r = await requestFullGo(area, qc); setResult(r.message); if (r.kind === 'failed') toast.error(r.message); else toast.success(r.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-1">
    <Button size="sm" variant="outline" disabled={busy} onClick={() => setStep(1)}>{busy ? 'Saving…' : `My ${area} is healed and full go`}</Button>
    {result && <p role="status" className="text-xs">{result}</p>}
    <AlertDialog open={step === 1} onOpenChange={o => { if (!o && step === 1) setStep(0); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark your {area} as healed and full go?</AlertDialogTitle>
          <AlertDialogDescription>{minor ? 'Because you are under 18, your parent confirms this before anything changes.' : 'Only do this if you are fully recovered.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setStep(0)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={e => { e.preventDefault(); setStep(2); }}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={step === 2} onOpenChange={o => { if (!o && step === 2) setStep(0); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{minor ? `This asks your parent to confirm. When they do, your ${area} limits are removed and your plan is rebuilt.` : `This removes your ${area} limits and rebuilds your plan.`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setStep(0)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={e => { e.preventDefault(); void run(); }} disabled={busy}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

/** Healed step for every active injury, or just the one the words named. */
export function FullGoPrompts({ only }: { only?: string | null }) {
  const inj = useInjuryHistory();
  const areas = only && inj.areas.includes(only) ? [only] : inj.areas;
  if (!inj.data || !areas.length) return null;
  return <div className="space-y-2">{areas.map(a => <FullGoPrompt key={a} area={a} history={inj.data!.history} minor={inj.data!.minor} />)}</div>;
}

/** Today: one entry per active injury with its progress line. Disappears once healed. */
export function ActiveInjuryCards() {
  const inj = useInjuryHistory();
  if (!inj.data || !inj.areas.length) return null;
  const today = getTodayDate();
  return <section aria-label="Your injuries" className="space-y-2">
    {inj.areas.map(a => <div key={a} className="rounded-md border border-border/60 bg-card p-3 space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><HeartPulse className="h-4 w-4 text-primary" />Your {a} injury</h3>
      <p className="text-xs text-muted-foreground">{injuryProgressLine(inj.data!.history, a, today) ?? `${label(a)}: no check-in answers yet. Your morning check-in asks how it feels.`}</p>
      <FullGoPrompt area={a} history={inj.data!.history} minor={inj.data!.minor} />
    </div>)}
  </section>;
}

/** Daily check-in: how each active injury feels today (pain and use, 0–10). */
export function InjuryCheckSection({ value, onChange }: { value: Record<string, { pain: number; function: number }>; onChange: (v: Record<string, { pain: number; function: number }>) => void }) {
  const inj = useInjuryHistory();
  if (!inj.data || !inj.areas.length) return null;
  const today = getTodayDate();
  const scale = (area: string, key: 'pain' | 'function', title: string, low: string, high: string) => <div className="space-y-1">
    <p className="text-xs font-medium">{title}</p>
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`${label(area)} ${title}`}>
      {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" role="radio" aria-checked={value[area]?.[key] === n}
        onClick={() => onChange({ ...value, [area]: { pain: value[area]?.pain ?? -1, function: value[area]?.function ?? -1, [key]: n } })}
        className={`h-8 w-8 rounded-md border text-xs ${value[area]?.[key] === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{n}</button>)}
    </div>
    <p className="text-[11px] text-muted-foreground">0 = {low} · 10 = {high}</p>
  </div>;
  return <div className="space-y-3 rounded-md border border-border/60 bg-card p-3" aria-label="Injury check">
    <h4 className="flex items-center gap-2 text-sm font-bold"><HeartPulse className="h-4 w-4 text-primary" />Injury check</h4>
    {inj.areas.map(a => <div key={a} className="space-y-2 border-t border-border pt-2 first:border-0 first:pt-0">
      <p className="text-sm font-semibold">How does your {a} feel today?</p>
      <p className="text-xs text-muted-foreground">{injuryProgressLine(inj.data!.history, a, today) ?? 'Answer for a few days to see your trend.'}</p>
      {scale(a, 'pain', 'Pain', 'no pain', 'worst pain')}
      {scale(a, 'function', 'How well can you use it?', "can't use it", 'normal')}
      <FullGoPrompt area={a} history={inj.data!.history} minor={inj.data!.minor} />
    </div>)}
  </div>;
}
