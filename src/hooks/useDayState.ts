import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRestDay } from '@/hooks/useRestDay';
import { format } from 'date-fns';

export type DayType = 'rest' | 'skip' | 'push' | 'standard';

export interface DayStateOverride {
  id: string;
  user_id: string;
  date: string;
  type: 'rest' | 'skip' | 'push';
  created_at: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Unified day state — single source of truth for the user's intent today.
 * Resolves: explicit override (rest/skip/push) > recurring rest rule > standard.
 *
 * Mutual exclusion is enforced by UNIQUE(user_id, date) in the DB.
 * Setting a new type replaces the prior one. Passing null clears it.
 */
export function useDayState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const rest = useRestDay(); // recurring rules + weekly cap

  const overrides = useQuery({
    queryKey: ['day-state-overrides', user?.id],
    queryFn: async (): Promise<DayStateOverride[]> => {
      if (!user) return [];
      // Pull last 14 days for week-cap visibility
      const since = format(new Date(Date.now() - 14 * 86400000), 'yyyy-MM-dd');
      const { data, error } = await (supabase as any)
        .from('user_day_state_overrides')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', since)
        .order('date', { ascending: false });
      if (error) {
        console.warn('[useDayState] fetch failed', error);
        return [];
      }
      return (data ?? []) as DayStateOverride[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`day-state-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_day_state_overrides', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['day-state-overrides', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const todayStr = today();
  const todayOverride = overrides.data?.find((o) => o.date === todayStr) ?? null;

  // Resolve effective type. Explicit override wins; otherwise check recurring rest.
  const dayType: DayType = useMemo(() => {
    if (todayOverride) return todayOverride.type;
    if (rest.isRecurringToday) return 'rest';
    return 'standard';
  }, [todayOverride, rest.isRecurringToday]);

  const recompute = () => {
    if (!user) return;
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
    supabase.functions.invoke('compute-hammer-state', { body: { user_id: user.id } }).catch(() => {});
  };

  /**
   * Set today's day type. Pass null to clear (back to standard).
   * Uses upsert on UNIQUE(user_id, date) so switching types is one call.
   */
  const setDayType = async (next: 'rest' | 'skip' | 'push' | null) => {
    if (!user) return;
    if (next === null) {
      await (supabase as any)
        .from('user_day_state_overrides')
        .delete()
        .eq('user_id', user.id)
        .eq('date', todayStr);
    } else {
      await (supabase as any)
        .from('user_day_state_overrides')
        .upsert(
          { user_id: user.id, date: todayStr, type: next },
          { onConflict: 'user_id,date' }
        );
    }
    qc.invalidateQueries({ queryKey: ['day-state-overrides', user.id] });
    // Mirror legacy rest-overrides table for backward compat
    if (next === 'rest') {
      await (supabase as any)
        .from('user_rest_day_overrides')
        .upsert(
          { user_id: user.id, date: todayStr, type: 'manual_rest' },
          { onConflict: 'user_id,date' }
        ).catch?.(() => {});
    } else {
      await (supabase as any)
        .from('user_rest_day_overrides')
        .delete()
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .catch?.(() => {});
    }
    qc.invalidateQueries({ queryKey: ['rest-day-overrides', user.id] });
    recompute();
  };

  // Counts in the trailing 7 days (overrides only — recurring rest counted via useRestDay)
  const since7 = format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd');
  const recent = (overrides.data ?? []).filter((o) => o.date >= since7);
  const skipDays7d = recent.filter((o) => o.type === 'skip').length;
  const pushDays7d = recent.filter((o) => o.type === 'push').length;

  return {
    dayType,
    isRest: dayType === 'rest',
    isSkip: dayType === 'skip',
    isPush: dayType === 'push',
    isStandard: dayType === 'standard',
    todayOverride,
    overrides: overrides.data ?? [],
    loading: overrides.isLoading || rest.loading,
    setDayType,
    skipDays7d,
    pushDays7d,
    // pass-through for recurring rest config
    recurringDays: rest.recurringDays,
    maxPerWeek: rest.maxPerWeek,
    usedThisWeek: rest.usedThisWeek,
    restBudgetLeft: rest.restBudgetLeft,
    overBudget: rest.overBudget,
    updateRecurringDays: rest.updateRecurringDays,
  };
}
