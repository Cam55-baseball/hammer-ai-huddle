import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { toast } from 'sonner';

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_oz: number;
  log_date: string;
  logged_at: string;
}

export interface HydrationSettings {
  id: string;
  user_id: string;
  daily_goal_oz: number;
  enabled: boolean;
  reminder_interval_minutes: number;
  start_time: string;
  end_time: string;
}

export interface HydrationStats {
  todayTotal: number;
  weeklyAverage: number;
  monthlyAverage: number;
  currentStreak: number;
  goalReachedToday: boolean;
}

const DEFAULT_GOAL = 100; // oz

export function useHydration() {
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<HydrationLog[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_GOAL);
  const [settings, setSettings] = useState<HydrationSettings | null>(null);
  const [stats, setStats] = useState<HydrationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's logs
  const fetchTodayLogs = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .order('logged_at', { ascending: true });

    if (!error && data) {
      setTodayLogs(data);
      const total = data.reduce((sum, log) => sum + Number(log.amount_oz), 0);
      setTodayTotal(total);
    }
  }, [user, today]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hydration_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
      setDailyGoal(data.daily_goal_oz || DEFAULT_GOAL);
    }
  }, [user]);

  // Fetch stats (weekly/monthly averages, streak)
  const fetchStats = useCallback(async () => {
    if (!user) return;

    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Fetch week logs
    const { data: weekLogs } = await supabase
      .from('hydration_logs')
      .select('amount_oz, log_date')
      .eq('user_id', user.id)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd);

    // Fetch month logs
    const { data: monthLogs } = await supabase
      .from('hydration_logs')
      .select('amount_oz, log_date')
      .eq('user_id', user.id)
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd);

    // Calculate weekly average (total / days with data)
    const weekDays = new Set(weekLogs?.map(l => l.log_date) || []);
    const weekTotal = weekLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
    const weeklyAverage = weekDays.size > 0 ? Math.round(weekTotal / weekDays.size) : 0;

    // Calculate monthly average
    const monthDays = new Set(monthLogs?.map(l => l.log_date) || []);
    const monthTotal = monthLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
    const monthlyAverage = monthDays.size > 0 ? Math.round(monthTotal / monthDays.size) : 0;

    // Calculate streak (consecutive days meeting goal)
    let streak = 0;
    const checkDate = new Date();
    const goal = settings?.daily_goal_oz || DEFAULT_GOAL;

    for (let i = 0; i < 365; i++) {
      const dateStr = format(subDays(checkDate, i), 'yyyy-MM-dd');
      const { data: dayLogs } = await supabase
        .from('hydration_logs')
        .select('amount_oz')
        .eq('user_id', user.id)
        .eq('log_date', dateStr);

      const dayTotal = dayLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
      
      if (dayTotal >= goal) {
        streak++;
      } else if (i > 0) {
        // Don't break on today if we haven't met goal yet
        break;
      }
    }

    setStats({
      todayTotal,
      weeklyAverage,
      monthlyAverage,
      currentStreak: streak,
      goalReachedToday: todayTotal >= dailyGoal,
    });
  }, [user, settings, todayTotal, dailyGoal]);

  // Add water
  const addWater = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: user.id,
          amount_oz: amount,
          log_date: today,
        });

      if (error) throw error;

      const newTotal = todayTotal + amount;
      setTodayTotal(newTotal);
      
      // Check if goal reached
      if (newTotal >= dailyGoal && todayTotal < dailyGoal) {
        toast.success('🎉 Daily hydration goal reached!', { duration: 5000 });
      } else {
        toast.success(`+${amount} oz logged!`);
      }

      // Refresh logs
      fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('Error logging water:', error);
      toast.error('Failed to log water');
      return false;
    }
  }, [user, today, todayTotal, dailyGoal, fetchTodayLogs]);

  // Delete log entry
  const deleteLog = useCallback(async (logId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) throw error;

      fetchTodayLogs();
      toast.success('Entry removed');
      return true;
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to remove entry');
      return false;
    }
  }, [user, fetchTodayLogs]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<HydrationSettings>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('hydration_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('hydration_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hydration_settings')
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }

      if (updates.daily_goal_oz) {
        setDailyGoal(updates.daily_goal_oz);
      }
      
      fetchSettings();
      toast.success('Settings updated');
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      return false;
    }
  }, [user, fetchSettings]);

  // Get logs for a date range
  const getLogsForDateRange = useCallback(async (startDate: string, endDate: string): Promise<HydrationLog[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }

    return data || [];
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchTodayLogs(), fetchSettings()]).then(() => {
        setLoading(false);
      });
    }
  }, [user, fetchTodayLogs, fetchSettings]);

  // Refresh stats when todayTotal changes
  useEffect(() => {
    if (user && !loading) {
      fetchStats();
    }
  }, [user, loading, todayTotal]);

  const progress = dailyGoal > 0 ? Math.min((todayTotal / dailyGoal) * 100, 100) : 0;
  const remaining = Math.max(dailyGoal - todayTotal, 0);

  return {
    // Data
    todayLogs,
    todayTotal,
    dailyGoal,
    settings,
    stats,
    loading,
    progress,
    remaining,
    goalReached: todayTotal >= dailyGoal,
    
    // Actions
    addWater,
    deleteLog,
    updateSettings,
    getLogsForDateRange,
    refresh: fetchTodayLogs,
  };
}
