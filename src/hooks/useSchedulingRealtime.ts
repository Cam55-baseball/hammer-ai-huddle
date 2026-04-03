import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Unified real-time subscription hub for ALL scheduling tables.
 * Replaces fragmented per-hook channel subscriptions.
 * Mount once at the app level (e.g., in CalendarView or DashboardLayout).
 */
export function useSchedulingRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['gameplan'] });
      queryClient.invalidateQueries({ queryKey: ['game-plan-skipped'] });
      queryClient.invalidateQueries({ queryKey: ['athlete-events'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['task-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-skips'] });
    };

    const channel = supabase
      .channel(`scheduling-unified-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'athlete_events',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_skipped_tasks',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_skipped_items',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_task_schedule',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_day_orders',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_locked_days',
        filter: `user_id=eq.${user.id}`,
      }, invalidateAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
