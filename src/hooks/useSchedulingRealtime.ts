import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Unified real-time subscription hub for ALL scheduling tables.
 * Performance sessions use precision INSERT/UPDATE/DELETE handlers
 * with scoped query invalidation. Other tables use broad invalidation.
 */
export function useSchedulingRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const invalidateScheduling = () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-projection'] });
      queryClient.invalidateQueries({ queryKey: ['gameplan'] });
      queryClient.invalidateQueries({ queryKey: ['game-plan-skipped'] });
      queryClient.invalidateQueries({ queryKey: ['athlete-events'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['task-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-skips'] });
      queryClient.invalidateQueries({ queryKey: ['game-plan-days'] });
    };

    // Pure derived calendar projection — refetched on any source-of-truth change
    const invalidateProjection = () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-projection'] });
    };

    // Scoped invalidation for performance sessions
    const invalidateSessionDate = (sessionDate: string | undefined) => {
      if (sessionDate) {
        queryClient.invalidateQueries({ queryKey: ['day-sessions', user.id, sessionDate] });
      }
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['progressive-gate'] });
      queryClient.invalidateQueries({ queryKey: ['delta-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['split-analytics-composites'] });
      queryClient.invalidateQueries({ queryKey: ['latest-session-ts'] });
    };

    const invalidateHIESnapshot = () => {
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['progressive-gate'] });
      queryClient.invalidateQueries({ queryKey: ['delta-analytics'] });
    };

    const channel = supabase
      .channel(`scheduling-unified-${user.id}`)
      // --- Performance sessions: precision handlers ---
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'performance_sessions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const sessionDate = (payload.new as any)?.session_date;
        invalidateSessionDate(sessionDate);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'performance_sessions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newDate = (payload.new as any)?.session_date;
        const oldDate = (payload.old as any)?.session_date;
        invalidateSessionDate(newDate);
        if (oldDate && oldDate !== newDate) {
          invalidateSessionDate(oldDate);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'performance_sessions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const sessionDate = (payload.old as any)?.session_date;
        invalidateSessionDate(sessionDate);
      })
      // --- Other scheduling tables: broad invalidation ---
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'athlete_events',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_skipped_tasks',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_skipped_items',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_task_schedule',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_day_orders',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_locked_days',
        filter: `user_id=eq.${user.id}`,
      }, invalidateScheduling)
      // --- HIE snapshots: propagate analysis completion to dashboard ---
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hie_snapshots',
        filter: `user_id=eq.${user.id}`,
      }, invalidateHIESnapshot)
      // --- Pure derived calendar projection: source-of-truth tables ---
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_activity_logs',
        filter: `user_id=eq.${user.id}`,
      }, invalidateProjection)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_activity_templates',
        filter: `user_id=eq.${user.id}`,
      }, invalidateProjection)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'training_blocks',
        filter: `user_id=eq.${user.id}`,
      }, invalidateProjection)
      // block_workouts has no user_id column — invalidation is broad.
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'block_workouts',
      }, invalidateProjection)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_plan_days',
        filter: `user_id=eq.${user.id}`,
      }, invalidateProjection)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
