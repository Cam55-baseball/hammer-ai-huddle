import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIdentityState } from '@/hooks/useIdentityState';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Once per day, the athlete must confirm they're operating at their tier standard.
 * Skipping logs a light pressure event (handled by evaluator on next run).
 */
export function DailyStandardCheck() {
  const { user } = useAuth();
  const { tier, label, tone } = useIdentityState();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('daily_standard_checks')
        .select('id')
        .eq('user_id', user.id)
        .eq('check_date', today)
        .maybeSingle();
      setConfirmed(!!data);
    })();
  }, [user?.id, today]);

  if (confirmed !== false || dismissed) return null;

  const handleConfirm = async () => {
    if (!user) return;
    await (supabase as any)
      .from('daily_standard_checks')
      .insert({ user_id: user.id, check_date: today, tier_at_confirm: tier });
    setConfirmed(true);
    toast.success(`Standard confirmed. ${label}.`);
  };

  return (
    <div className={cn(
      'relative flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2.5 text-sm font-semibold overflow-hidden'
    )} role="status">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden />
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary ml-1" />
      <span className="flex-1 min-w-0 text-slate-100">
        Operating at <span className="font-black text-white">{label}</span> standard?
      </span>
      <Button size="sm" onClick={handleConfirm} className="h-8 font-bold bg-white text-slate-950 hover:bg-slate-100">
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-slate-400 hover:text-white hover:bg-white/10"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
