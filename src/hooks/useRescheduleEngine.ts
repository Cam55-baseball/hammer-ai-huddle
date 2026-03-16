import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { getTodayDate } from '@/utils/dateUtils';
import { toast } from 'sonner';

interface UndoSnapshot {
  type: 'skip' | 'pushForward' | 'pushToDate' | 'replace';
  skippedRows?: { user_id: string; task_id: string; skip_date: string }[];
  movedEvents?: { id: string; original_date: string }[];
  deletedEvents?: any[];
  insertedEventIds?: string[];
}

export function useRescheduleEngine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastAction = useRef<UndoSnapshot | null>(null);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['gameplan'] });
    queryClient.invalidateQueries({ queryKey: ['game-plan-skipped'] });
  }, [queryClient]);

  /** Bulk-skip all given task IDs for a specific date */
  const skipDay = useCallback(async (date: string, taskIds: string[]) => {
    if (!user || taskIds.length === 0) return;
    
    const rows = taskIds.map(taskId => ({
      user_id: user.id,
      task_id: taskId,
      skip_date: date,
    }));

    for (const row of rows) {
      await supabase
        .from('game_plan_skipped_tasks')
        .upsert(row, { onConflict: 'user_id,task_id,skip_date' });
    }

    invalidateAll();
    toast.success(`Skipped ${taskIds.length} tasks for ${date}`);
  }, [user, invalidateAll]);

  /** Push all non-mandatory calendar events forward by 1 day from a given date */
  const pushForwardOneDay = useCallback(async (fromDate: string) => {
    if (!user) return;
    
    const mandatoryTypes = ['game', 'coach_assigned', 'tryout'];
    
    const { data: futureEvents } = await supabase
      .from('calendar_events')
      .select('id, event_date, event_type')
      .eq('user_id', user.id)
      .gte('event_date', fromDate)
      .order('event_date', { ascending: false });

    if (futureEvents) {
      for (const evt of futureEvents) {
        if (mandatoryTypes.includes(evt.event_type)) continue;
        const nextDate = new Date(evt.event_date);
        nextDate.setDate(nextDate.getDate() + 1);
        await supabase.from('calendar_events')
          .update({ event_date: nextDate.toISOString().split('T')[0] })
          .eq('id', evt.id);
      }
    }

    invalidateAll();
    toast.success('Schedule pushed forward 1 day');
  }, [user, invalidateAll]);

  /** Push events from fromDate to a specific targetDate, shifting subsequent accordingly */
  const pushToDate = useCallback(async (fromDate: string, targetDate: string) => {
    if (!user) return;
    
    const fromMs = new Date(fromDate).getTime();
    const targetMs = new Date(targetDate).getTime();
    const diffDays = Math.round((targetMs - fromMs) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      toast.error('Target date must be after the source date');
      return;
    }

    const mandatoryTypes = ['game', 'coach_assigned', 'tryout'];
    
    const { data: futureEvents } = await supabase
      .from('calendar_events')
      .select('id, event_date, event_type')
      .eq('user_id', user.id)
      .gte('event_date', fromDate)
      .order('event_date', { ascending: false });

    if (futureEvents) {
      for (const evt of futureEvents) {
        if (mandatoryTypes.includes(evt.event_type)) continue;
        const newDate = new Date(evt.event_date);
        newDate.setDate(newDate.getDate() + diffDays);
        await supabase.from('calendar_events')
          .update({ event_date: newDate.toISOString().split('T')[0] })
          .eq('id', evt.id);
      }
    }

    invalidateAll();
    toast.success(`Schedule pushed to ${targetDate}`);
  }, [user, invalidateAll]);

  /** Replace a target day's tasks with source day's tasks (copy events) */
  const replaceDay = useCallback(async (targetDate: string, sourceDate: string) => {
    if (!user) return;
    
    // Fetch source day events
    const { data: sourceEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_date', sourceDate);

    if (!sourceEvents || sourceEvents.length === 0) {
      toast.error('No events found on source day');
      return;
    }

    // Delete existing non-mandatory events on target day
    const mandatoryTypes = ['game', 'coach_assigned', 'tryout'];
    const { data: targetEvents } = await supabase
      .from('calendar_events')
      .select('id, event_type')
      .eq('user_id', user.id)
      .eq('event_date', targetDate);

    if (targetEvents) {
      for (const evt of targetEvents) {
        if (mandatoryTypes.includes(evt.event_type)) continue;
        await supabase.from('calendar_events').delete().eq('id', evt.id);
      }
    }

    // Copy source events to target
    for (const evt of sourceEvents) {
      if (mandatoryTypes.includes(evt.event_type)) continue;
      const { id, created_at, updated_at, ...rest } = evt;
      await supabase.from('calendar_events').insert({
        ...rest,
        event_date: targetDate,
      });
    }

    invalidateAll();
    toast.success(`Replaced ${targetDate} with ${sourceDate}'s schedule`);
  }, [user, invalidateAll]);

  return { skipDay, pushForwardOneDay, pushToDate, replaceDay, invalidateAll };
}
