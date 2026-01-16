import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { startOfWeek, format } from 'date-fns';

export interface LockedDayScheduleItem {
  taskId: string;
  displayTime: string | null;
  reminderEnabled: boolean;
  reminderMinutes: number | null;
  order: number;
}

export interface LockedDay {
  id: string;
  day_of_week: number;
  locked_at: string;
  schedule: LockedDayScheduleItem[];
}

export interface WeekOverride {
  id: string;
  day_of_week: number;
  week_start: string;
  override_schedule: LockedDayScheduleItem[];
}

export function useLockedDays() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [lockedDays, setLockedDays] = useState<Map<number, LockedDay>>(new Map());
  const [weekOverrides, setWeekOverrides] = useState<Map<string, WeekOverride>>(new Map());
  const [loading, setLoading] = useState(true);

  const getWeekKey = (dayOfWeek: number, weekStart: Date) => 
    `${dayOfWeek}-${format(weekStart, 'yyyy-MM-dd')}`;

  const getCurrentWeekStart = () => startOfWeek(new Date(), { weekStartsOn: 1 });

  const fetchLockedDays = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch locked days
      const { data: lockedData, error: lockedError } = await supabase
        .from('game_plan_locked_days')
        .select('*')
        .eq('user_id', user.id);

      if (lockedError) throw lockedError;

      const lockedMap = new Map<number, LockedDay>();
      lockedData?.forEach((row) => {
        const scheduleData = Array.isArray(row.schedule) 
          ? (row.schedule as unknown as LockedDayScheduleItem[])
          : [];
        lockedMap.set(row.day_of_week, {
          id: row.id,
          day_of_week: row.day_of_week,
          locked_at: row.locked_at || new Date().toISOString(),
          schedule: scheduleData,
        });
      });
      setLockedDays(lockedMap);

      // Fetch week overrides for current week
      const weekStart = getCurrentWeekStart();
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data: overrideData, error: overrideError } = await supabase
        .from('game_plan_week_overrides')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      if (overrideError) throw overrideError;

      const overrideMap = new Map<string, WeekOverride>();
      overrideData?.forEach((row) => {
        const scheduleData = Array.isArray(row.override_schedule) 
          ? (row.override_schedule as unknown as LockedDayScheduleItem[])
          : [];
        const key = getWeekKey(row.day_of_week, weekStart);
        overrideMap.set(key, {
          id: row.id,
          day_of_week: row.day_of_week,
          week_start: row.week_start,
          override_schedule: scheduleData,
        });
      });
      setWeekOverrides(overrideMap);
    } catch (error) {
      console.error('Error fetching locked days:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLockedDays();
  }, [fetchLockedDays]);

  const lockDay = useCallback(
    async (dayOfWeek: number, schedule: LockedDayScheduleItem[]): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data, error } = await supabase
          .from('game_plan_locked_days')
          .upsert(
            [{
              user_id: user.id,
              day_of_week: dayOfWeek,
              schedule: JSON.parse(JSON.stringify(schedule)),
              locked_at: new Date().toISOString(),
            }],
            { onConflict: 'user_id,day_of_week' }
          )
          .select()
          .single();

        if (error) throw error;

        const scheduleData = Array.isArray(data.schedule)
          ? (data.schedule as unknown as LockedDayScheduleItem[])
          : [];

        setLockedDays((prev) => {
          const newMap = new Map(prev);
          newMap.set(dayOfWeek, {
            id: data.id,
            day_of_week: data.day_of_week,
            locked_at: data.locked_at || new Date().toISOString(),
            schedule: scheduleData,
          });
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.dayLocked', 'Day locked successfully'));
        return true;
      } catch (error) {
        console.error('Error locking day:', error);
        toast.error(t('gamePlan.lockedDays.lockError', 'Failed to lock day'));
        return false;
      }
    },
    [user, t]
  );

  const unlockDay = useCallback(
    async (dayOfWeek: number): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('game_plan_locked_days')
          .delete()
          .eq('user_id', user.id)
          .eq('day_of_week', dayOfWeek);

        if (error) throw error;

        // Also delete any week overrides for this day
        const weekStart = getCurrentWeekStart();
        await supabase
          .from('game_plan_week_overrides')
          .delete()
          .eq('user_id', user.id)
          .eq('day_of_week', dayOfWeek);

        setLockedDays((prev) => {
          const newMap = new Map(prev);
          newMap.delete(dayOfWeek);
          return newMap;
        });

        // Clear week override for this day
        setWeekOverrides((prev) => {
          const newMap = new Map(prev);
          const key = getWeekKey(dayOfWeek, weekStart);
          newMap.delete(key);
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.dayUnlocked', 'Day unlocked'));
        return true;
      } catch (error) {
        console.error('Error unlocking day:', error);
        toast.error(t('gamePlan.lockedDays.unlockError', 'Failed to unlock day'));
        return false;
      }
    },
    [user, t]
  );

  const copyDayToMultiple = useCallback(
    async (sourceDayOfWeek: number, targetDays: number[]): Promise<boolean> => {
      if (!user) return false;

      const sourceSchedule = lockedDays.get(sourceDayOfWeek)?.schedule;
      if (!sourceSchedule) return false;

      try {
        const upsertData = targetDays.map(dayOfWeek => ({
          user_id: user.id,
          day_of_week: dayOfWeek,
          schedule: JSON.parse(JSON.stringify(sourceSchedule)),
          locked_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
          .from('game_plan_locked_days')
          .upsert(upsertData, { onConflict: 'user_id,day_of_week' })
          .select();

        if (error) throw error;

        // Update local state
        setLockedDays((prev) => {
          const newMap = new Map(prev);
          data?.forEach((row) => {
            const scheduleData = Array.isArray(row.schedule)
              ? (row.schedule as unknown as LockedDayScheduleItem[])
              : [];
            newMap.set(row.day_of_week, {
              id: row.id,
              day_of_week: row.day_of_week,
              locked_at: row.locked_at || new Date().toISOString(),
              schedule: scheduleData,
            });
          });
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.copySuccess', 'Schedule copied to {{count}} days', { count: targetDays.length }));
        return true;
      } catch (error) {
        console.error('Error copying schedule:', error);
        toast.error(t('gamePlan.lockedDays.copyError', 'Failed to copy schedule'));
        return false;
      }
    },
    [user, t, lockedDays]
  );

  const unlockForWeek = useCallback(
    async (dayOfWeek: number): Promise<boolean> => {
      if (!user) return false;

      const lockedSchedule = lockedDays.get(dayOfWeek)?.schedule;
      if (!lockedSchedule) return false;

      try {
        const weekStart = getCurrentWeekStart();
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const { data, error } = await supabase
          .from('game_plan_week_overrides')
          .upsert(
            [{
              user_id: user.id,
              day_of_week: dayOfWeek,
              week_start: weekStartStr,
              override_schedule: JSON.parse(JSON.stringify(lockedSchedule)),
            }],
            { onConflict: 'user_id,day_of_week,week_start' }
          )
          .select()
          .single();

        if (error) throw error;

        const key = getWeekKey(dayOfWeek, weekStart);
        const scheduleData = Array.isArray(data.override_schedule)
          ? (data.override_schedule as unknown as LockedDayScheduleItem[])
          : [];

        setWeekOverrides((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, {
            id: data.id,
            day_of_week: data.day_of_week,
            week_start: data.week_start,
            override_schedule: scheduleData,
          });
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.weekOverrideCreated', 'Week override created'));
        return true;
      } catch (error) {
        console.error('Error creating week override:', error);
        toast.error(t('gamePlan.lockedDays.weekOverrideError', 'Failed to create week override'));
        return false;
      }
    },
    [user, t, lockedDays]
  );

  const saveWeekOverride = useCallback(
    async (dayOfWeek: number, schedule: LockedDayScheduleItem[]): Promise<boolean> => {
      if (!user) return false;

      try {
        const weekStart = getCurrentWeekStart();
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const { data, error } = await supabase
          .from('game_plan_week_overrides')
          .upsert(
            [{
              user_id: user.id,
              day_of_week: dayOfWeek,
              week_start: weekStartStr,
              override_schedule: JSON.parse(JSON.stringify(schedule)),
            }],
            { onConflict: 'user_id,day_of_week,week_start' }
          )
          .select()
          .single();

        if (error) throw error;

        const key = getWeekKey(dayOfWeek, weekStart);
        const scheduleData = Array.isArray(data.override_schedule)
          ? (data.override_schedule as unknown as LockedDayScheduleItem[])
          : [];

        setWeekOverrides((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, {
            id: data.id,
            day_of_week: data.day_of_week,
            week_start: data.week_start,
            override_schedule: scheduleData,
          });
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.weekOverrideSaved', 'Week override saved'));
        return true;
      } catch (error) {
        console.error('Error saving week override:', error);
        toast.error(t('gamePlan.lockedDays.weekOverrideSaveError', 'Failed to save week override'));
        return false;
      }
    },
    [user, t]
  );

  const discardWeekOverride = useCallback(
    async (dayOfWeek: number): Promise<boolean> => {
      if (!user) return false;

      try {
        const weekStart = getCurrentWeekStart();
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const { error } = await supabase
          .from('game_plan_week_overrides')
          .delete()
          .eq('user_id', user.id)
          .eq('day_of_week', dayOfWeek)
          .eq('week_start', weekStartStr);

        if (error) throw error;

        const key = getWeekKey(dayOfWeek, weekStart);
        setWeekOverrides((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });

        toast.success(t('gamePlan.lockedDays.weekOverrideDiscarded', 'Week override discarded'));
        return true;
      } catch (error) {
        console.error('Error discarding week override:', error);
        toast.error(t('gamePlan.lockedDays.weekOverrideDiscardError', 'Failed to discard week override'));
        return false;
      }
    },
    [user, t]
  );

  const isDayLocked = useCallback(
    (dayOfWeek: number): boolean => {
      return lockedDays.has(dayOfWeek);
    },
    [lockedDays]
  );

  const hasWeekOverride = useCallback(
    (dayOfWeek: number): boolean => {
      const weekStart = getCurrentWeekStart();
      const key = getWeekKey(dayOfWeek, weekStart);
      return weekOverrides.has(key);
    },
    [weekOverrides]
  );

  const getLockedSchedule = useCallback(
    (dayOfWeek: number): LockedDayScheduleItem[] | null => {
      const lockedDay = lockedDays.get(dayOfWeek);
      return lockedDay ? lockedDay.schedule : null;
    },
    [lockedDays]
  );

  const getEffectiveSchedule = useCallback(
    (dayOfWeek: number): LockedDayScheduleItem[] | null => {
      const weekStart = getCurrentWeekStart();
      const key = getWeekKey(dayOfWeek, weekStart);
      
      // Check for week override first
      const override = weekOverrides.get(key);
      if (override) {
        return override.override_schedule;
      }
      
      // Fall back to locked schedule
      return getLockedSchedule(dayOfWeek);
    },
    [weekOverrides, getLockedSchedule]
  );

  return {
    lockedDays,
    weekOverrides,
    lockDay,
    unlockDay,
    copyDayToMultiple,
    unlockForWeek,
    saveWeekOverride,
    discardWeekOverride,
    isDayLocked,
    hasWeekOverride,
    getLockedSchedule,
    getEffectiveSchedule,
    loading,
    refetch: fetchLockedDays,
  };
}
