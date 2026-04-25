import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, addDays } from 'date-fns';

export interface RestDayRule {
  user_id: string;
  recurring_days: number[];
  max_rest_days_per_week: number;
}

export interface RestDayOverride {
  id: string;
  user_id: string;
  date: string;
  type: 'manual_rest' | 'auto_recurring';
  created_at: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Rest day system — recurring rules + ad-hoc overrides for the current user.
 * Rest days are intentional, not failures: they protect streaks and don't
 * count against consistency (within max_rest_days_per_week).
 */
export function useRestDay() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const rule = useQuery({
    queryKey: ['rest-day-rule', user?.id],
    queryFn: async (): Promise<RestDayRule | null> => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('user_rest_day_rules')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.warn('[useRestDay] rule fetch failed', error);
        return null;
      }
      return (data as RestDayRule) ?? null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const overrides = useQuery({
    queryKey: ['rest-day-overrides', user?.id],
    queryFn: async (): Promise<RestDayOverride[]> => {
      if (!user) return [];
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const { data, error } = await (supabase as any)
        .from('user_rest_day_overrides')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .order('date', { ascending: true });
      if (error) {
        console.warn('[useRestDay] overrides fetch failed', error);
        return [];
      }
      return (data ?? []) as RestDayOverride[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`rest-day-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_rest_day_rules', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['rest-day-rule', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_rest_day_overrides', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['rest-day-overrides', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel(ch)); };
    function channel(c: any) { return c; }
  }, [user?.id, qc]);

  const recurringDays = rule.data?.recurring_days ?? [];
  const maxPerWeek = rule.data?.max_rest_days_per_week ?? 2;
  const todayStr = today();
  const dow = new Date().getDay();
  const overrideToday = overrides.data?.find((o) => o.date === todayStr) ?? null;
  const isRecurringToday = recurringDays.includes(dow);
  const isRestToday = !!overrideToday || isRecurringToday;

  // Count rest days used this week (overrides + recurring days that have passed/are today)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  let usedThisWeek = 0;
  for (let i = 0; i <= 6; i++) {
    const d = addDays(weekStart, i);
    const ds = format(d, 'yyyy-MM-dd');
    const has = (overrides.data ?? []).some((o) => o.date === ds);
    const recurring = recurringDays.includes(d.getDay());
    if (has || recurring) usedThisWeek++;
  }
  const restBudgetLeft = Math.max(0, maxPerWeek - usedThisWeek);
  const overBudget = usedThisWeek > maxPerWeek;

  const setTodayAsRest = async () => {
    if (!user) return;
    if (overrideToday) {
      // Toggle off
      await (supabase as any)
        .from('user_rest_day_overrides')
        .delete()
        .eq('id', overrideToday.id);
    } else {
      await (supabase as any)
        .from('user_rest_day_overrides')
        .insert({ user_id: user.id, date: todayStr, type: 'manual_rest' });
    }
    qc.invalidateQueries({ queryKey: ['rest-day-overrides', user.id] });
    // Trigger engine recompute so consistency / hammer reflect rest
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
    supabase.functions.invoke('compute-hammer-state', { body: { user_id: user.id } }).catch(() => {});
  };

  const updateRecurringDays = async (days: number[], maxPerWeekArg?: number) => {
    if (!user) return;
    await (supabase as any)
      .from('user_rest_day_rules')
      .upsert({
        user_id: user.id,
        recurring_days: days,
        max_rest_days_per_week: maxPerWeekArg ?? maxPerWeek,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    qc.invalidateQueries({ queryKey: ['rest-day-rule', user.id] });
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
  };

  return {
    rule: rule.data ?? null,
    overrides: overrides.data ?? [],
    loading: rule.isLoading || overrides.isLoading,
    recurringDays,
    maxPerWeek,
    isRestToday,
    overrideToday,
    isRecurringToday,
    usedThisWeek,
    restBudgetLeft,
    overBudget,
    setTodayAsRest,
    updateRecurringDays,
  };
}
