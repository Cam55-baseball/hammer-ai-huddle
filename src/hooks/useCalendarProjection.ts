import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCalendarEvents,
  indexByDate,
  type DerivedCalendarEvent,
} from '@/lib/calendar/buildCalendarEvents';

interface UseCalendarProjectionParams {
  /** YYYY-MM-DD, inclusive */
  startDate: string;
  /** YYYY-MM-DD, inclusive */
  endDate: string;
  /** Filter custom_activity_templates by sport (or 'baseball'/'softball'). */
  sport?: 'baseball' | 'softball';
}

/**
 * Pure derived projection of the calendar from source-of-truth tables.
 *
 * No writes. No mutation surface. The calendar is read-only downstream.
 *
 * Realtime invalidation is handled centrally by `useSchedulingRealtime`,
 * which invalidates the `['calendar-projection']` query keys on any change
 * to game_plan_days, custom_activity_logs, custom_activity_templates,
 * training_blocks, or block_workouts.
 */
export function useCalendarProjection({
  startDate,
  endDate,
  sport,
}: UseCalendarProjectionParams) {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = !!userId;

  // Source 1: game_plan_days (completion / partial markers)
  const gamePlanDaysQ = useQuery({
    queryKey: ['calendar-projection', 'game-plan-days', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_plan_days')
        .select('date, is_completed')
        .eq('user_id', userId!)
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  // Source 2: custom_activity_logs (concrete scheduled instances)
  const logsQ = useQuery({
    queryKey: ['calendar-projection', 'logs', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_activity_logs')
        .select('id, entry_date, template_id, completed, start_time, notes, performance_data')
        .eq('user_id', userId!)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  // Source 3: custom_activity_templates (recurring + parent for logs)
  const templatesQ = useQuery({
    queryKey: ['calendar-projection', 'templates', userId, sport ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('custom_activity_templates')
        .select(
          'id, title, display_nickname, color, sport, deleted_at, display_on_game_plan, recurring_days, display_days, display_time',
        )
        .eq('user_id', userId!)
        .is('deleted_at', null);
      if (sport) q = q.or(`sport.eq.${sport},sport.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      // Normalize Json `recurring_days`/`display_days` → number[] at the boundary
      // so the pure builder stays strictly typed.
      return (data ?? []).map((t: any) => ({
        ...t,
        recurring_days: Array.isArray(t.recurring_days)
          ? (t.recurring_days as number[])
          : null,
        display_days: Array.isArray(t.display_days)
          ? (t.display_days as number[])
          : null,
      }));
    },
    enabled,
  });

  // Source 4: training_blocks (active set)
  const blocksQ = useQuery({
    queryKey: ['calendar-projection', 'blocks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('id, status, goal')
        .eq('user_id', userId!)
        .neq('status', 'archived');
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  // Source 5: block_workouts (one event per workout)
  const blockWorkoutsQ = useQuery({
    queryKey: [
      'calendar-projection',
      'block-workouts',
      userId,
      startDate,
      endDate,
      blocksQ.data?.map((b) => b.id).join(',') ?? '',
    ],
    queryFn: async () => {
      const blockIds = (blocksQ.data ?? []).map((b) => b.id);
      if (blockIds.length === 0) return [];
      const { data, error } = await supabase
        .from('block_workouts')
        .select('id, block_id, scheduled_date, status, workout_type, day_label, week_number')
        .in('block_id', blockIds)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && !blocksQ.isLoading,
  });

  const isLoading =
    gamePlanDaysQ.isLoading ||
    logsQ.isLoading ||
    templatesQ.isLoading ||
    blocksQ.isLoading ||
    blockWorkoutsQ.isLoading;

  const events: DerivedCalendarEvent[] = useMemo(() => {
    if (isLoading) return [];
    const built = buildCalendarEvents({
      gamePlanDays: gamePlanDaysQ.data ?? [],
      logs: logsQ.data ?? [],
      templates: templatesQ.data ?? [],
      blocks: blocksQ.data ?? [],
      blockWorkouts: blockWorkoutsQ.data ?? [],
      rangeStart: startDate,
      rangeEnd: endDate,
    });
    // Dev-only instrumentation — verify projection completeness vs legacy.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        `[calendar-projection] logs=${(logsQ.data ?? []).length} templates=${(templatesQ.data ?? []).length} blockWorkouts=${(blockWorkoutsQ.data ?? []).length} gamePlanDays=${(gamePlanDaysQ.data ?? []).length} → events=${built.length} range=${startDate}..${endDate}`,
      );
    }
    return built;
  }, [
    isLoading,
    gamePlanDaysQ.data,
    logsQ.data,
    templatesQ.data,
    blocksQ.data,
    blockWorkoutsQ.data,
    startDate,
    endDate,
  ]);

  const eventsByDate = useMemo(() => indexByDate(events), [events]);

  return {
    events,
    eventsByDate,
    byDate: (date: string) => eventsByDate[date] ?? [],
    isLoading,
  };
}
