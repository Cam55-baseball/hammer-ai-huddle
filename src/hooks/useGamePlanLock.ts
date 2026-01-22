import { useState, useEffect, useCallback } from 'react';
import { getDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Json } from '@/integrations/supabase/types';

export interface ScheduleItem {
  taskId: string;
  order: number;
  displayTime: string | null;
  reminderMinutes: number | null;
  reminderEnabled: boolean;
}

export interface LockedDayData {
  id: string;
  dayOfWeek: number;
  schedule: ScheduleItem[];
  lockedAt: string;
}

// Helper to convert Json to ScheduleItem[]
const parseSchedule = (json: Json | undefined): ScheduleItem[] => {
  if (!json || !Array.isArray(json)) return [];
  return json as unknown as ScheduleItem[];
};

// Helper to convert ScheduleItem[] to Json
const serializeSchedule = (schedule: ScheduleItem[]): Json => {
  return schedule as unknown as Json;
};

export function useGamePlanLock() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [lockedDays, setLockedDays] = useState<Map<number, LockedDayData>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch all locked days for the user
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

      if (error) {
        console.error('Error fetching locked days:', error);
        setLoading(false);
        return;
      }

      const newMap = new Map<number, LockedDayData>();
      data?.forEach((row) => {
        newMap.set(row.day_of_week, {
          id: row.id,
          dayOfWeek: row.day_of_week,
          schedule: parseSchedule(row.schedule),
          lockedAt: row.locked_at || row.created_at || '',
        });
      });

      setLockedDays(newMap);
    } catch (err) {
      console.error('Error in fetchLockedDays:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchLockedDays();
  }, [fetchLockedDays]);

  // Real-time subscription for cross-device sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`game-plan-lock-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_plan_locked_days',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Game plan lock changed (realtime):', payload.eventType);
          fetchLockedDays();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLockedDays]);

  // Check if today is locked
  const isTodayLocked = useCallback((): boolean => {
    const today = getDay(new Date()); // 0 (Sunday) - 6 (Saturday)
    return lockedDays.has(today);
  }, [lockedDays]);

  // Check if a specific day is locked
  const isDayLocked = useCallback((dayOfWeek: number): boolean => {
    return lockedDays.has(dayOfWeek);
  }, [lockedDays]);

  // Get schedule for today (if locked)
  const getTodaySchedule = useCallback((): ScheduleItem[] | null => {
    const today = getDay(new Date());
    return lockedDays.get(today)?.schedule || null;
  }, [lockedDays]);

  // Get schedule for a specific day
  const getDaySchedule = useCallback((dayOfWeek: number): ScheduleItem[] | null => {
    return lockedDays.get(dayOfWeek)?.schedule || null;
  }, [lockedDays]);

  // Get all locked day numbers
  const getLockedDayNumbers = useCallback((): number[] => {
    return Array.from(lockedDays.keys());
  }, [lockedDays]);

  // Lock today with current schedule
  const lockToday = useCallback(async (schedule: ScheduleItem[]): Promise<boolean> => {
    if (!user) return false;

    const today = getDay(new Date());
    
    try {
      const { error } = await supabase
        .from('game_plan_locked_days')
        .upsert({
          user_id: user.id,
          day_of_week: today,
          schedule: serializeSchedule(schedule),
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,day_of_week' 
        });

      if (error) {
        console.error('Error locking today:', error);
        toast.error(t('gamePlan.lockOrder.lockError', 'Failed to lock order'));
        return false;
      }

      toast.success(t('gamePlan.lockOrder.locked', 'Order locked for today'));
      return true;
    } catch (err) {
      console.error('Error in lockToday:', err);
      return false;
    }
  }, [user, t]);

  // Lock specific days with schedule
  const lockDays = useCallback(async (daysToLock: number[], schedule: ScheduleItem[]): Promise<boolean> => {
    if (!user || daysToLock.length === 0) return false;

    try {
      const serializedSchedule = serializeSchedule(schedule);
      const records = daysToLock.map(day => ({
        user_id: user.id,
        day_of_week: day,
        schedule: serializedSchedule,
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('game_plan_locked_days')
        .upsert(records, { onConflict: 'user_id,day_of_week' });

      if (error) {
        console.error('Error locking days:', error);
        toast.error(t('gamePlan.lockOrder.lockError', 'Failed to lock order'));
        return false;
      }

      toast.success(t('gamePlan.lockOrder.locked', 'Order locked'));
      return true;
    } catch (err) {
      console.error('Error in lockDays:', err);
      return false;
    }
  }, [user, t]);

  // Unlock specific days
  const unlockDays = useCallback(async (daysToUnlock: number[]): Promise<boolean> => {
    if (!user || daysToUnlock.length === 0) return false;

    try {
      const { error } = await supabase
        .from('game_plan_locked_days')
        .delete()
        .eq('user_id', user.id)
        .in('day_of_week', daysToUnlock);

      if (error) {
        console.error('Error unlocking days:', error);
        toast.error(t('gamePlan.lockOrder.unlockError', 'Failed to unlock'));
        return false;
      }

      toast.success(t('gamePlan.lockOrder.unlocked', 'Days unlocked'));
      return true;
    } catch (err) {
      console.error('Error in unlockDays:', err);
      return false;
    }
  }, [user, t]);

  // Unlock today specifically
  const unlockToday = useCallback(async (): Promise<boolean> => {
    const today = getDay(new Date());
    return unlockDays([today]);
  }, [unlockDays]);

  // Update schedule for locked days (without unlocking)
  const updateLockedSchedule = useCallback(async (daysToUpdate: number[], schedule: ScheduleItem[]): Promise<boolean> => {
    if (!user || daysToUpdate.length === 0) return false;

    try {
      // Only update days that are already locked
      const existingLockedDays = daysToUpdate.filter(d => lockedDays.has(d));
      if (existingLockedDays.length === 0) return true;

      const serializedSchedule = serializeSchedule(schedule);
      const records = existingLockedDays.map(day => ({
        user_id: user.id,
        day_of_week: day,
        schedule: serializedSchedule,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('game_plan_locked_days')
        .upsert(records, { onConflict: 'user_id,day_of_week' });

      if (error) {
        console.error('Error updating locked schedule:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in updateLockedSchedule:', err);
      return false;
    }
  }, [user, lockedDays]);

  return {
    lockedDays,
    loading,
    isTodayLocked,
    isDayLocked,
    getTodaySchedule,
    getDaySchedule,
    getLockedDayNumbers,
    lockToday,
    lockDays,
    unlockDays,
    unlockToday,
    updateLockedSchedule,
    refetch: fetchLockedDays,
  };
}
