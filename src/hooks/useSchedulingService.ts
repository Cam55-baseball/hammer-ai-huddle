import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateCalendarEvent } from '@/hooks/useCalendar';
import type { CreateEventInput } from '@/hooks/useAthleteEvents';
import type { CreateScheduledSession } from '@/hooks/useScheduledPracticeSessions';
import type { DayType } from '@/utils/tdeeCalculations';

type ScheduleSource = 'user' | 'coach' | 'ai' | 'reschedule' | 'system';

/** Logs a scheduling mutation to the audit_log table */
async function logScheduleAudit(
  userId: string,
  action: string,
  tableName: string,
  metadata: Record<string, any>
) {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      table_name: tableName,
      metadata,
    });
  } catch (err) {
    console.error('[SchedulingService] Audit log failed:', err);
  }
}

/**
 * Central scheduling service — ALL schedule mutations MUST route through this hook.
 * No other file should directly .insert/.update/.delete on scheduling tables.
 */
export function useSchedulingService() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateScheduling = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['gameplan'] });
    queryClient.invalidateQueries({ queryKey: ['game-plan-skipped'] });
    queryClient.invalidateQueries({ queryKey: ['athlete-events'] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['task-schedules'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-skips'] });
    queryClient.invalidateQueries({ queryKey: ['schedule-templates'] });
  }, [queryClient]);

  // ═══════════════════════════════════════════════════════════
  // CALENDAR EVENTS
  // ═══════════════════════════════════════════════════════════

  const addCalendarEvent = useCallback(async (
    event: CreateCalendarEvent,
    source: ScheduleSource = 'user'
  ): Promise<{ success: boolean; id?: string }> => {
    if (!user) return { success: false };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ user_id: user.id, ...event })
      .select('id')
      .single();

    if (error) {
      console.error('[SchedulingService] addCalendarEvent failed:', error);
      return { success: false };
    }

    await logScheduleAudit(user.id, 'schedule_create', 'calendar_events', {
      event_id: data.id, source, event_date: event.event_date, event_type: event.event_type,
    });

    invalidateScheduling();
    return { success: true, id: data.id };
  }, [user, invalidateScheduling]);

  const updateCalendarEvent = useCallback(async (
    id: string,
    updates: Partial<CreateCalendarEvent>,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SchedulingService] updateCalendarEvent failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_update', 'calendar_events', {
      event_id: id, source, updates,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const deleteCalendarEvent = useCallback(async (
    id: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SchedulingService] deleteCalendarEvent failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_delete', 'calendar_events', {
      event_id: id, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // ATHLETE EVENTS (Day Type)
  // ═══════════════════════════════════════════════════════════

  const setDayType = useCallback(async (
    input: CreateEventInput,
    source: ScheduleSource = 'user'
  ): Promise<{ success: boolean; id?: string }> => {
    if (!user) return { success: false };

    // Check if event already exists for this date (upsert logic)
    const { data: existing } = await supabase
      .from('athlete_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_date', input.eventDate)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('athlete_events')
        .update({
          event_type: input.eventType,
          event_time: input.eventTime,
          intensity_level: input.intensityLevel,
          sport: input.sport,
          notes: input.notes,
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[SchedulingService] setDayType update failed:', error);
        return { success: false };
      }

      await logScheduleAudit(user.id, 'schedule_update', 'athlete_events', {
        event_id: existing.id, source, event_date: input.eventDate, event_type: input.eventType,
      });

      invalidateScheduling();
      return { success: true, id: existing.id };
    }

    const { data, error } = await supabase
      .from('athlete_events')
      .insert({
        user_id: user.id,
        event_date: input.eventDate,
        event_type: input.eventType,
        event_time: input.eventTime,
        intensity_level: input.intensityLevel,
        sport: input.sport,
        notes: input.notes,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[SchedulingService] setDayType insert failed:', error);
      return { success: false };
    }

    await logScheduleAudit(user.id, 'schedule_create', 'athlete_events', {
      event_id: data.id, source, event_date: input.eventDate, event_type: input.eventType,
    });

    invalidateScheduling();
    return { success: true, id: data.id };
  }, [user, invalidateScheduling]);

  const deleteDayType = useCallback(async (
    eventId: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('athlete_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SchedulingService] deleteDayType failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_delete', 'athlete_events', {
      event_id: eventId, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // SCHEDULED PRACTICE SESSIONS
  // ═══════════════════════════════════════════════════════════

  const scheduleSession = useCallback(async (
    input: CreateScheduledSession,
    source: ScheduleSource = 'user'
  ): Promise<{ success: boolean; data?: any }> => {
    if (!user) return { success: false };

    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .insert({
        user_id: input.user_id || user.id,
        created_by: user.id,
        session_module: input.session_module,
        session_type: input.session_type,
        title: input.title,
        description: input.description || null,
        scheduled_date: input.scheduled_date,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        recurring_active: input.recurring_active || false,
        recurring_days: input.recurring_days || [],
        sport: input.sport,
        organization_id: input.organization_id || null,
        team_id: input.team_id || null,
        assignment_scope: input.assignment_scope || 'individual',
        coach_id: input.coach_id || null,
        opponent_name: (input as any).opponent_name || null,
        opponent_level: (input as any).opponent_level || null,
        team_name: (input as any).team_name || null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[SchedulingService] scheduleSession failed:', error);
      return { success: false };
    }

    await logScheduleAudit(user.id, 'schedule_create', 'scheduled_practice_sessions', {
      session_id: (data as any)?.id, source, title: input.title,
    });

    invalidateScheduling();
    return { success: true, data };
  }, [user, invalidateScheduling]);

  const scheduleBulkSessions = useCallback(async (
    playerIds: string[],
    baseSession: Omit<CreateScheduledSession, 'user_id'>,
    source: ScheduleSource = 'coach'
  ): Promise<boolean> => {
    if (!user || playerIds.length === 0) return false;

    const rows = playerIds.map(playerId => ({
      user_id: playerId,
      created_by: user.id,
      session_module: baseSession.session_module,
      session_type: baseSession.session_type,
      title: baseSession.title,
      description: baseSession.description || null,
      scheduled_date: baseSession.scheduled_date,
      start_time: baseSession.start_time || null,
      end_time: baseSession.end_time || null,
      recurring_active: baseSession.recurring_active || false,
      recurring_days: baseSession.recurring_days || [],
      sport: baseSession.sport,
      organization_id: baseSession.organization_id || null,
      team_id: baseSession.team_id || null,
      assignment_scope: baseSession.assignment_scope || 'individual',
      coach_id: baseSession.coach_id || user.id,
      status: (baseSession as any).status || 'scheduled',
      requires_approval: (baseSession as any).requires_approval || false,
    }));

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .insert(rows as any);

    if (error) {
      console.error('[SchedulingService] scheduleBulkSessions failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_create', 'scheduled_practice_sessions', {
      source, player_count: playerIds.length, title: baseSession.title,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const updateSessionStatus = useCallback(async (
    id: string,
    status: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .update({ status } as any)
      .eq('id', id);

    if (error) {
      console.error('[SchedulingService] updateSessionStatus failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_update', 'scheduled_practice_sessions', {
      session_id: id, source, new_status: status,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const updateSession = useCallback(async (
    id: string,
    updates: Record<string, any>,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .update(updates as any)
      .eq('id', id);

    if (error) {
      console.error('[SchedulingService] updateSession failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_update', 'scheduled_practice_sessions', {
      session_id: id, source, updates,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const deleteSession = useCallback(async (
    id: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SchedulingService] deleteSession failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_delete', 'scheduled_practice_sessions', {
      session_id: id, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // GAME PLAN TASK SKIPS
  // ═══════════════════════════════════════════════════════════

  const skipTask = useCallback(async (
    taskId: string,
    skipDate: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('game_plan_skipped_tasks')
      .upsert({
        user_id: user.id,
        task_id: taskId,
        skip_date: skipDate,
      }, { onConflict: 'user_id,task_id,skip_date' });

    if (error) {
      console.error('[SchedulingService] skipTask failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_skip', 'game_plan_skipped_tasks', {
      task_id: taskId, skip_date: skipDate, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const skipTasksBulk = useCallback(async (
    taskIds: string[],
    skipDate: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user || taskIds.length === 0) return false;

    for (const taskId of taskIds) {
      const { error } = await supabase
        .from('game_plan_skipped_tasks')
        .upsert({
          user_id: user.id,
          task_id: taskId,
          skip_date: skipDate,
        }, { onConflict: 'user_id,task_id,skip_date' });

      if (error) {
        console.error('[SchedulingService] skipTasksBulk failed for', taskId, error);
      }
    }

    await logScheduleAudit(user.id, 'schedule_skip', 'game_plan_skipped_tasks', {
      task_ids: taskIds, skip_date: skipDate, source, count: taskIds.length,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const unskipTask = useCallback(async (
    taskId: string,
    skipDate: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('game_plan_skipped_tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('skip_date', skipDate);

    if (error) {
      console.error('[SchedulingService] unskipTask failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_unskip', 'game_plan_skipped_tasks', {
      task_id: taskId, skip_date: skipDate, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // GAME PLAN TASK SCHEDULE (recurring day preferences)
  // ═══════════════════════════════════════════════════════════

  const setTaskSchedule = useCallback(async (
    taskId: string,
    displayDays: number[],
    displayTime: string | null,
    reminderEnabled: boolean,
    reminderMinutes: number,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('game_plan_task_schedule')
      .upsert({
        user_id: user.id,
        task_id: taskId,
        display_days: displayDays,
        display_time: displayTime,
        reminder_enabled: reminderEnabled,
        reminder_minutes: reminderMinutes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,task_id' })
      .select()
      .single();

    if (error) {
      console.error('[SchedulingService] setTaskSchedule failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_update', 'game_plan_task_schedule', {
      task_id: taskId, source, display_days: displayDays,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // CALENDAR SKIPPED ITEMS (recurring day skips)
  // ═══════════════════════════════════════════════════════════

  const setCalendarSkip = useCallback(async (
    itemId: string,
    itemType: string,
    skipDays: number[],
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    // If empty skip days, remove the record entirely
    if (skipDays.length === 0) {
      return await removeCalendarSkip(itemId, itemType, source);
    }

    const { error } = await supabase
      .from('calendar_skipped_items')
      .upsert({
        user_id: user.id,
        item_id: itemId,
        item_type: itemType,
        skip_days: skipDays,
      }, { onConflict: 'user_id,item_id,item_type' });

    if (error) {
      console.error('[SchedulingService] setCalendarSkip failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_skip', 'calendar_skipped_items', {
      item_id: itemId, item_type: itemType, skip_days: skipDays, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const removeCalendarSkip = useCallback(async (
    itemId: string,
    itemType: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('calendar_skipped_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .eq('item_type', itemType);

    if (error) {
      console.error('[SchedulingService] removeCalendarSkip failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_unskip', 'calendar_skipped_items', {
      item_id: itemId, item_type: itemType, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  // ═══════════════════════════════════════════════════════════
  // SCHEDULE TEMPLATES
  // ═══════════════════════════════════════════════════════════

  const saveScheduleTemplate = useCallback(async (
    name: string,
    schedule: any[],
    isDefault: boolean = false,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    if (isDefault) {
      await supabase
        .from('timeline_schedule_templates')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await supabase
      .from('timeline_schedule_templates')
      .insert({
        user_id: user.id,
        name,
        schedule: schedule as any,
        is_default: isDefault,
      });

    if (error) {
      console.error('[SchedulingService] saveScheduleTemplate failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_create', 'timeline_schedule_templates', {
      name, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const updateScheduleTemplate = useCallback(async (
    templateId: string,
    updates: Record<string, any>,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    if (updates.is_default) {
      await supabase
        .from('timeline_schedule_templates')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await supabase
      .from('timeline_schedule_templates')
      .update({ ...updates, schedule: updates.schedule as any })
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SchedulingService] updateScheduleTemplate failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_update', 'timeline_schedule_templates', {
      template_id: templateId, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  const deleteScheduleTemplate = useCallback(async (
    templateId: string,
    source: ScheduleSource = 'user'
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('timeline_schedule_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SchedulingService] deleteScheduleTemplate failed:', error);
      return false;
    }

    await logScheduleAudit(user.id, 'schedule_delete', 'timeline_schedule_templates', {
      template_id: templateId, source,
    });

    invalidateScheduling();
    return true;
  }, [user, invalidateScheduling]);

  return {
    // Calendar events
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    // Day type
    setDayType,
    deleteDayType,
    // Practice sessions
    scheduleSession,
    scheduleBulkSessions,
    updateSessionStatus,
    updateSession,
    deleteSession,
    // Task skips
    skipTask,
    skipTasksBulk,
    unskipTask,
    // Task schedule
    setTaskSchedule,
    // Calendar skips
    setCalendarSkip,
    removeCalendarSkip,
    // Schedule templates
    saveScheduleTemplate,
    updateScheduleTemplate,
    deleteScheduleTemplate,
    // Utility
    invalidateScheduling,
  };
}
