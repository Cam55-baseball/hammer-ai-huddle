import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getDay } from 'date-fns';

export interface TaskSchedule {
  id: string;
  task_id: string;
  display_days: number[];
  display_time: string | null;
  reminder_enabled: boolean;
  reminder_minutes: number;
}

export function useSystemTaskSchedule() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Record<string, TaskSchedule>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all task schedules for the user
  const fetchSchedules = useCallback(async () => {
    if (!user) {
      setSchedules({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_plan_task_schedule')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const scheduleMap: Record<string, TaskSchedule> = {};
      data?.forEach((schedule) => {
        scheduleMap[schedule.task_id] = {
          id: schedule.id,
          task_id: schedule.task_id,
          display_days: (schedule.display_days as number[]) || [0, 1, 2, 3, 4, 5, 6],
          display_time: schedule.display_time,
          reminder_enabled: schedule.reminder_enabled || false,
          reminder_minutes: schedule.reminder_minutes || 15,
        };
      });

      setSchedules(scheduleMap);
    } catch (error) {
      console.error('Error fetching task schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Save or update a task schedule
  const saveSchedule = useCallback(async (
    taskId: string,
    displayDays: number[],
    displayTime: string | null,
    reminderEnabled: boolean,
    reminderMinutes: number
  ): Promise<boolean> => {
    if (!user) {
      toast.error(t('gamePlan.taskSchedule.signInRequired', 'Please sign in to save schedules'));
      return false;
    }

    try {
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
        }, { 
          onConflict: 'user_id,task_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state from the persisted row (source of truth)
      if (data) {
        setSchedules(prev => ({
          ...prev,
          [taskId]: {
            id: data.id,
            task_id: data.task_id,
            display_days: (data.display_days as number[]) || [0, 1, 2, 3, 4, 5, 6],
            display_time: data.display_time,
            reminder_enabled: data.reminder_enabled || false,
            reminder_minutes: data.reminder_minutes || 15,
          }
        }));
      }

      toast.success(t('gamePlan.taskSchedule.saved', 'Schedule saved'));
      return true;
    } catch (error) {
      console.error('Error saving task schedule:', error);
      toast.error(t('gamePlan.taskSchedule.saveError', 'Failed to save schedule'));
      return false;
    }
  }, [user, t]);

  // Check if a task should be displayed today based on its schedule
  const isScheduledForToday = useCallback((taskId: string): boolean => {
    const schedule = schedules[taskId];
    if (!schedule) return true; // Default to showing if no schedule exists

    const todayDayOfWeek = getDay(new Date()); // 0 = Sunday, 6 = Saturday
    return schedule.display_days.includes(todayDayOfWeek);
  }, [schedules]);

  // Get schedule for a specific task
  const getSchedule = useCallback((taskId: string): TaskSchedule | null => {
    return schedules[taskId] || null;
  }, [schedules]);

  // Get all task IDs that are scheduled off for today
  const getScheduledOffTaskIds = useCallback((): Set<string> => {
    const scheduledOff = new Set<string>();
    const todayDayOfWeek = getDay(new Date());

    Object.entries(schedules).forEach(([taskId, schedule]) => {
      if (!schedule.display_days.includes(todayDayOfWeek)) {
        scheduledOff.add(taskId);
      }
    });

    return scheduledOff;
  }, [schedules]);

  return {
    schedules,
    loading,
    saveSchedule,
    isScheduledForToday,
    getSchedule,
    getScheduledOffTaskIds,
    refetch: fetchSchedules,
  };
}
