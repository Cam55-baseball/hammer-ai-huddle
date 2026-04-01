/**
 * Unified Scheduling Data Layer
 * 
 * Single source of truth for ALL scheduling data used by both
 * useGamePlan (today view) and useCalendar (range view).
 * 
 * Eliminates fragmentation where Game Plan and Calendar independently
 * queried overlapping tables with different filtering logic.
 * 
 * All write-only hooks (useCalendarSkips, useSystemTaskSchedule,
 * useRescheduleEngine, useAthleteEvents) invalidate this cache
 * after mutations to keep both views in sync.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TRAINING_DEFAULT_SCHEDULES } from '@/constants/trainingSchedules';
import { format, addDays } from 'date-fns';

export const UNIFIED_SCHEDULE_KEY = 'unified-schedule';

interface ScheduleConfigData {
  templates: any[];
  skipItemsRaw: { item_id: string; skip_days: number[]; item_type: string }[];
  taskSchedulesRaw: any[];
  dateSkippedTasksRaw: { task_id: string; skip_date: string }[];
  subModuleProgress: any[];
  playerFolders: any[];
  coachFolderIds: string[];
  athleteEvents: any[];
  scheduledPracticeSessions: any[];
}

async function fetchScheduleConfig(userId: string, sport: string): Promise<ScheduleConfigData> {
  const windowStart = format(addDays(new Date(), -7), 'yyyy-MM-dd');
  const windowEnd = format(addDays(new Date(), 90), 'yyyy-MM-dd');

  const [
    templatesRes, skipItemsRes, taskSchedulesRes, dateSkipsRes,
    subModRes, playerFoldersRes, assignmentsRes,
    athleteEventsRes, practiceSessionsRes,
  ] = await Promise.all([
    supabase.from('custom_activity_templates').select('*')
      .eq('user_id', userId).or(`sport.eq.${sport},sport.is.null`).is('deleted_at', null),
    supabase.from('calendar_skipped_items').select('item_id, skip_days, item_type')
      .eq('user_id', userId),
    supabase.from('game_plan_task_schedule').select('*')
      .eq('user_id', userId),
    supabase.from('game_plan_skipped_tasks').select('task_id, skip_date')
      .eq('user_id', userId).gte('skip_date', windowStart).lte('skip_date', windowEnd),
    supabase.from('sub_module_progress').select('*')
      .eq('user_id', userId).eq('sport', sport),
    supabase.from('activity_folders').select('*')
      .eq('owner_id', userId).eq('owner_type', 'player').eq('sport', sport).eq('status', 'active'),
    supabase.from('folder_assignments').select('folder_id')
      .eq('recipient_id', userId).eq('status', 'accepted'),
    supabase.from('athlete_events').select('*')
      .eq('user_id', userId).gte('event_date', windowStart).lte('event_date', windowEnd),
    (supabase.from('scheduled_practice_sessions' as any).select('*').neq('status', 'cancelled') as any),
  ]);

  return {
    templates: templatesRes.data || [],
    skipItemsRaw: (skipItemsRes.data || []) as any[],
    taskSchedulesRaw: taskSchedulesRes.data || [],
    dateSkippedTasksRaw: (dateSkipsRes.data || []) as any[],
    subModuleProgress: subModRes.data || [],
    playerFolders: playerFoldersRes.data || [],
    coachFolderIds: (assignmentsRes.data || []).map((a: any) => a.folder_id),
    athleteEvents: athleteEventsRes.data || [],
    scheduledPracticeSessions: (practiceSessionsRes?.data || []) as any[],
  };
}

export function useUnifiedSchedule(sport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [UNIFIED_SCHEDULE_KEY, user?.id, sport],
    queryFn: () => fetchScheduleConfig(user!.id, sport),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Derived: skip items map (item_id → skip day numbers)
  const skipItems = useMemo(() => {
    const map = new Map<string, number[]>();
    (data?.skipItemsRaw || []).forEach(item => {
      map.set(item.item_id, item.skip_days || []);
    });
    return map;
  }, [data?.skipItemsRaw]);

  // Derived: task schedules map (task_id → { displayDays, displayTime })
  const taskSchedules = useMemo(() => {
    const map = new Map<string, { displayDays: number[]; displayTime: string | null }>();
    (data?.taskSchedulesRaw || []).forEach((s: any) => {
      map.set(s.task_id, {
        displayDays: s.display_days || [0, 1, 2, 3, 4, 5, 6],
        displayTime: s.display_time,
      });
    });
    return map;
  }, [data?.taskSchedulesRaw]);

  // Derived: date-skipped tasks set ("taskId:date" format for O(1) lookup)
  const dateSkippedTasks = useMemo(() => {
    const set = new Set<string>();
    (data?.dateSkippedTasksRaw || []).forEach(s => {
      set.add(`${s.task_id}:${s.skip_date}`);
    });
    return set;
  }, [data?.dateSkippedTasksRaw]);

  // Helper: is a system task scheduled for a given day of week?
  // Checks DB schedules first, falls back to TRAINING_DEFAULT_SCHEDULES
  const isTaskScheduledForDay = useCallback((taskId: string, dayOfWeek: number): boolean => {
    const schedule = taskSchedules.get(taskId);
    if (schedule) return schedule.displayDays.includes(dayOfWeek);
    const defaultDays = TRAINING_DEFAULT_SCHEDULES[taskId];
    if (defaultDays) return defaultDays.includes(dayOfWeek);
    return true; // No schedule defined = show every day
  }, [taskSchedules]);

  // Helper: is a task skipped for a specific date?
  const isDateSkipped = useCallback((taskId: string, date: string): boolean => {
    return dateSkippedTasks.has(`${taskId}:${date}`);
  }, [dateSkippedTasks]);

  // Single Realtime channel for all scheduling-relevant tables
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`unified-schedule-${user.id}`);

    const tablesWithUserFilter = [
      'calendar_skipped_items',
      'game_plan_task_schedule',
      'game_plan_skipped_tasks',
      'custom_activity_templates',
      'athlete_events',
      'sub_module_progress',
      'activity_folders',
      'folder_assignments',
    ];

    tablesWithUserFilter.forEach(table => {
      const filterCol = table === 'folder_assignments' ? 'recipient_id' : 'user_id';
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `${filterCol}=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: [UNIFIED_SCHEDULE_KEY, user.id] });
      });
    });

    // scheduled_practice_sessions has no user_id filter (shared table)
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'scheduled_practice_sessions',
    }, () => {
      queryClient.invalidateQueries({ queryKey: [UNIFIED_SCHEDULE_KEY, user.id] });
    });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return {
    data,
    isLoading,
    templates: data?.templates || [],
    skipItems,
    taskSchedules,
    dateSkippedTasks,
    subModuleProgress: data?.subModuleProgress || [],
    playerFolders: data?.playerFolders || [],
    coachFolderIds: data?.coachFolderIds || [],
    athleteEvents: data?.athleteEvents || [],
    scheduledPracticeSessions: data?.scheduledPracticeSessions || [],
    isTaskScheduledForDay,
    isDateSkipped,
  };
}
