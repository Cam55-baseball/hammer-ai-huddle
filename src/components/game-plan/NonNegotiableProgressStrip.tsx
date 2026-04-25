import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDayState } from '@/hooks/useDayState';
import { Flame, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * Top-of-Game-Plan strip showing today's NN completion progress.
 * Hidden on rest days (NN waived). Glowing when 0/N completed on a non-rest day.
 */
export function NonNegotiableProgressStrip() {
  const { user } = useAuth();
  const { dayType } = useDayState();
  const [counts, setCounts] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const fetchCounts = async () => {
      const { data: nn } = await (supabase as any)
        .from('custom_activity_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_non_negotiable', true)
        .is('deleted_at', null);
      const ids: string[] = (nn ?? []).map((t: any) => t.id);
      if (ids.length === 0) {
        if (!cancelled) setCounts({ done: 0, total: 0 });
        return;
      }
      const { data: logs } = await (supabase as any)
        .from('custom_activity_logs')
        .select('template_id, completion_state')
        .eq('user_id', user.id)
        .eq('entry_date', todayStr)
        .in('template_id', ids);
      const done = new Set<string>(
        (logs ?? [])
          .filter((l: any) => l.completion_state === 'completed')
          .map((l: any) => l.template_id)
      );
      if (!cancelled) setCounts({ done: done.size, total: ids.length });
    };

    fetchCounts();
    const ch = supabase
      .channel(`nn-progress-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_activity_logs', filter: `user_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_activity_templates', filter: `user_id=eq.${user.id}` },
        () => fetchCounts()
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!counts || counts.total === 0) return null;
  if (dayType === 'rest') return null;

  const allDone = counts.done >= counts.total;
  const noneDone = counts.done === 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-xs font-black uppercase tracking-wider transition-shadow',
        allDone
          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/40 bg-rose-500/5 text-rose-200',
        noneDone && 'shadow-[0_0_18px_-2px_rgba(244,63,94,0.55)]'
      )}
    >
      <div className="flex items-center gap-2">
        {allDone ? <ShieldCheck className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
        <span>
          {counts.done} / {counts.total} Non-Negotiables completed
        </span>
      </div>
      {!allDone && (
        <span className="text-[10px] text-rose-300/90">Standard required</span>
      )}
    </div>
  );
}
