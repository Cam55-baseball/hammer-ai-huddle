import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
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
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 w-full space-y-5 py-3" role="status">
      <div className="text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-2 text-xl font-bold">Morning check-in complete</h2></div>
      {focusSentence && <section><h3 className="text-xs font-semibold uppercase text-muted-foreground">Develop this week</h3><p className="mt-1 text-sm">{focusSentence}</p></section>}
      <section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-muted-foreground">Today's Standard</h3>
        <p className="text-sm font-semibold">{standard.standard}</p><p className="text-xs text-muted-foreground">{standard.rationale}</p>
        {confirmed ? <p className="text-sm text-primary">Standard confirmed for today.</p> :
          <Button onClick={() => void confirm()} disabled={saving || checking} className="w-full">Confirm I'm at this standard</Button>}
        <p className="text-xs italic text-muted-foreground">{standard.motivational}</p>
      </section>
      <section className="space-y-2" aria-label="Due today"><ScheduledPriorityStrip /><TexVisionS2Priority /></section>
      <Button variant="outline" className="w-full" onClick={onClose}>Continue to today</Button>
    </motion.div>
  );
}