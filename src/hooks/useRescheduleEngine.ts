import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchedulingService } from '@/hooks/useSchedulingService';
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
  const scheduling = useSchedulingService();
  const lastAction = useRef<UndoSnapshot | null>(null);

  /** Bulk-skip all given task IDs for a specific date */
  const skipDay = useCallback(async (date: string, taskIds: string[]) => {
    if (!user || taskIds.length === 0) return;
    
    const rows = taskIds.map(taskId => ({
      user_id: user.id,
      task_id: taskId,
      skip_date: date,
    }));

    // Stack onto existing snapshot if present (for compound skip+push undo)
    const prev = lastAction.current;
    if (prev) {
      lastAction.current = { ...prev, skippedRows: [...(prev.skippedRows || []), ...rows] };
    } else {
      lastAction.current = { type: 'skip', skippedRows: rows };
    }

    await scheduling.skipTasksBulk(taskIds, date, 'reschedule');
    toast.success(`Skipped ${taskIds.length} tasks for ${date}`);
  }, [user, scheduling]);

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

    const movedEvents: { id: string; original_date: string }[] = [];

    if (futureEvents) {
      for (const evt of futureEvents) {
        if (mandatoryTypes.includes(evt.event_type)) continue;
        movedEvents.push({ id: evt.id, original_date: evt.event_date });
        const nextDate = new Date(evt.event_date);
        nextDate.setDate(nextDate.getDate() + 1);
        await scheduling.updateCalendarEvent(evt.id, {
          event_date: nextDate.toISOString().split('T')[0],
        }, 'reschedule');
      }
    }

    // Stack onto existing snapshot (compound undo for skip+push)
    const prev = lastAction.current;
    if (prev) {
      lastAction.current = { ...prev, type: 'pushForward', movedEvents: [...(prev.movedEvents || []), ...movedEvents] };
    } else {
      lastAction.current = { type: 'pushForward', movedEvents };
    }
    toast.success('Schedule pushed forward 1 day');
  }, [user, scheduling]);

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
        await scheduling.updateCalendarEvent(evt.id, {
          event_date: newDate.toISOString().split('T')[0],
        }, 'reschedule');
      }
    }

    toast.success(`Schedule pushed to ${targetDate}`);
  }, [user, scheduling]);

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
        await scheduling.deleteCalendarEvent(evt.id, 'reschedule');
      }
    }

    // Copy source events to target
    for (const evt of sourceEvents) {
      if (mandatoryTypes.includes(evt.event_type)) continue;
      const { id, created_at, updated_at, user_id, ...rest } = evt;
      await scheduling.addCalendarEvent({
        ...rest,
        event_date: targetDate,
      }, 'reschedule');
    }

    toast.success(`Replaced ${targetDate} with ${sourceDate}'s schedule`);
  }, [user, scheduling]);

  /** Undo the last scheduling action */
  const undoLastAction = useCallback(async () => {
    if (!user || !lastAction.current) return false;
    const snapshot = lastAction.current;

    try {
      // Undo skipped rows (from skip or compound skip+push)
      if (snapshot.skippedRows) {
        for (const row of snapshot.skippedRows) {
          await scheduling.unskipTask(row.task_id, row.skip_date, 'reschedule');
        }
      }

      // Undo moved events (from push or compound skip+push)
      if (snapshot.movedEvents) {
        for (const evt of snapshot.movedEvents) {
          await scheduling.updateCalendarEvent(evt.id, {
            event_date: evt.original_date,
          }, 'reschedule');
        }
      }

      if (snapshot.type === 'replace') {
        if (snapshot.insertedEventIds) {
          for (const id of snapshot.insertedEventIds) {
            await scheduling.deleteCalendarEvent(id, 'reschedule');
          }
        }
        if (snapshot.deletedEvents) {
          for (const evt of snapshot.deletedEvents) {
            const { id, ...rest } = evt;
            await scheduling.addCalendarEvent({ ...rest }, 'reschedule');
          }
        }
      }

      lastAction.current = null;
      toast.success('Action undone');
      return true;
    } catch (err: any) {
      toast.error('Failed to undo');
      return false;
    }
  }, [user, scheduling]);

  const canUndo = useCallback(() => !!lastAction.current, []);

  return { skipDay, pushForwardOneDay, pushToDate, replaceDay, undoLastAction, canUndo, invalidateAll: scheduling.invalidateScheduling };
}
