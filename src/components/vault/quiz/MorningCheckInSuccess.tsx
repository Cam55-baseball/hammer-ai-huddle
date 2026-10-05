import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Target, CalendarCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIdentityState } from '@/hooks/useIdentityState';
import { useDayState } from '@/hooks/useDayState';
import { useAthleteCommandRows } from '@/hooks/command/useAthleteCommandRows';
import { deriveTodaysStandard } from '@/lib/standard/todaysStandard';
import { getTodayDate } from '@/utils/dateUtils';
import { ScheduledPriorityStrip } from '@/components/hammer/ScheduledPriorityStrip';
import { TexVisionS2Priority } from '@/components/hammer/TexVisionS2Priority';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MorningCheckInSuccess({ onClose }: { onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { tier, label, focusSentence } = useIdentityState();
  const { dayType } = useDayState();
  const { data: commandRows } = useAthleteCommandRows({ days: 30, limit: 500 });
  const standard = useMemo(() => deriveTodaysStandard(commandRows, dayType), [commandRows, dayType]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let active = true;
    void (supabase as any).from('daily_standard_checks').select('id').eq('user_id', user.id).eq('check_date', getTodayDate()).maybeSingle()
      .then(({ data, error }: { data: { id: string } | null; error: unknown }) => {
        if (active) { if (!error) setConfirmed(!!data); setChecking(false); }
      });
    return () => { active = false; };
  }, [user?.id]);
  const confirm = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('daily_standard_checks').insert({ user_id: user.id, check_date: getTodayDate(), tier_at_confirm: tier });
      if (error) {
        // Another open check-in may have confirmed this same date already.
        const { data } = await (supabase as any).from('daily_standard_checks').select('id').eq('user_id', user.id).eq('check_date', getTodayDate()).maybeSingle();
        if (data) setConfirmed(true);
        else toast.error('Standard could not be confirmed. Please try again.');
      } else { setConfirmed(true); toast.success(`Standard confirmed. ${label}.`); }
    } catch { toast.error('Standard could not be confirmed. Please try again.'); }
    finally { setSaving(false); }
  };
  const rise = { initial: reducedMotion ? false as const : { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: reducedMotion ? 0 : 0.36, ease: 'easeOut' as const } };
  return (
     <div className="daily-success min-w-0 w-full space-y-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1" role="status">
       <motion.header {...rise} className="daily-success-header rounded-md border border-primary/35 px-5 py-7 sm:px-6">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary"><CheckCircle2 className="h-6 w-6" aria-hidden /></span>
        <p className="mt-5 text-xs font-bold uppercase text-primary">Check-in saved</p>
         <h2 className="mt-2 text-3xl font-black leading-tight text-foreground">Your day starts here.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">You showed up. Now take the next step.</p>
      </motion.header>
       <motion.section {...rise} transition={{ ...rise.transition, delay: reducedMotion ? 0 : 0.06 }} className="daily-success-section border-l-2 border-l-primary" aria-label="Develop this week">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" aria-hidden /><h3 className="text-xs font-bold uppercase">Develop this week</h3></div>
        <p className="mt-3 text-lg font-semibold leading-snug text-foreground">{focusSentence || 'Keep showing up. Your next step is in today’s plan.'}</p>
      </motion.section>
       <motion.section {...rise} transition={{ ...rise.transition, delay: reducedMotion ? 0 : 0.12 }} className="daily-success-section border-l-2 border-l-foreground" aria-label="Today's Standard">
        <div className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" aria-hidden /><h3 className="text-xs font-bold uppercase">Today's Standard</h3></div>
        <p className="mt-3 text-lg font-bold leading-snug text-foreground">{standard.standard}</p>
         <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">Why this is today's standard</p>
         <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{standard.rationale}</p>
        {confirmed ? <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" aria-hidden />Standard confirmed for today.</p> :
          <Button onClick={() => void confirm()} disabled={saving || checking} className="mt-4 min-h-12 w-full whitespace-normal">Confirm I'm at this standard</Button>}
        <p className="mt-3 text-sm text-muted-foreground">{standard.motivational}</p>
      </motion.section>
       <motion.section {...rise} transition={{ ...rise.transition, delay: reducedMotion ? 0 : 0.18 }} className="daily-success-section border-l-2 border-l-primary" aria-label="Due today">
        <div className="mb-3 flex items-center gap-2 text-primary"><CalendarCheck className="h-4 w-4" aria-hidden /><h3 className="text-xs font-bold uppercase">Due today</h3></div>
        <div className="space-y-2"><ScheduledPriorityStrip /><TexVisionS2Priority /></div>
      </motion.section>
      <Button className="min-h-12 w-full gap-2 text-base font-bold" onClick={onClose}>Continue to today <ArrowRight className="h-4 w-4" aria-hidden /></Button>
    </div>
  );
}