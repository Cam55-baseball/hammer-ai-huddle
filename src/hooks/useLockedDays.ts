import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface LockedDayScheduleItem {
  taskId: string;
  displayTime: string | null;
  reminderEnabled: boolean;
  reminderMinutes: number | null;
}

export interface LockedDay {
  id: string;
  day_of_week: number;
  locked_at: string;
  schedule: LockedDayScheduleItem[];
}

export function useLockedDays() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [lockedDays, setLockedDays] = useState<Map<number, LockedDay>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchLockedDays = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_plan_locked_days')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const map = new Map<number, LockedDay>();
      data?.forEach((row) => {
        const scheduleData = Array.isArray(row.schedule) 
          ? (row.schedule as unknown as LockedDayScheduleItem[])
          : [];
        map.set(row.day_of_week, {
          id: row.id,
          day_of_week: row.day_of_week,
          locked_at: row.locked_at || new Date().toISOString(),
          schedule: scheduleData,
        });
      });
      setLockedDays(map);
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

        setLockedDays((prev) => {
          const newMap = new Map(prev);
          newMap.delete(dayOfWeek);
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

  const isDayLocked = useCallback(
    (dayOfWeek: number): boolean => {
      return lockedDays.has(dayOfWeek);
    },
    [lockedDays]
  );

  const getLockedSchedule = useCallback(
    (dayOfWeek: number): LockedDayScheduleItem[] | null => {
      const lockedDay = lockedDays.get(dayOfWeek);
      return lockedDay ? lockedDay.schedule : null;
    },
    [lockedDays]
  );

  return {
    lockedDays,
    lockDay,
    unlockDay,
    isDayLocked,
    getLockedSchedule,
    loading,
    refetch: fetchLockedDays,
  };
}
