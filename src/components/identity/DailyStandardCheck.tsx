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
      'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold',
      'border-primary bg-card text-black'
    )} role="status">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
      <span className="flex-1 min-w-0 text-black">
        Operating at <span className="font-black text-black">{label}</span> standard?
      </span>
      <Button size="sm" onClick={handleConfirm} className="h-8 font-bold">
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-black/60 hover:text-black"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
