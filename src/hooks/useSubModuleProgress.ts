import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface WeekProgress {
  [day: string]: boolean;
}

export interface SubModuleProgress {
  id: string;
  user_id: string;
  sport: 'baseball' | 'softball';
  module: 'hitting' | 'pitching';
  sub_module: 'production_lab' | 'production_studio';
  current_week: number;
  week_progress: { [week: string]: WeekProgress };
  equipment_checklist: string[];
  started_at: string;
  last_activity: string;
}

export function useSubModuleProgress(
  sport: 'baseball' | 'softball',
  module: 'hitting' | 'pitching',
  subModule: 'production_lab' | 'production_studio'
) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SubModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sub_module_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .eq('module', module)
        .eq('sub_module', subModule)
        .maybeSingle();

      if (error) throw error;
      setProgress(data as SubModuleProgress | null);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport, module, subModule]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const initializeProgress = useCallback(async () => {
    if (!user) return null;

    const initialProgress = {
      user_id: user.id,
      sport,
      module,
      sub_module: subModule,
      current_week: 1,
      week_progress: {},
      equipment_checklist: [],
    };

    try {
      const { data, error } = await supabase
        .from('sub_module_progress')
        .insert(initialProgress)
        .select()
        .single();

      if (error) throw error;
      setProgress(data as SubModuleProgress);
      return data;
    } catch (error) {
      console.error('Error initializing progress:', error);
      return null;
    }
  }, [user, sport, module, subModule]);

  const updateDayProgress = useCallback(async (week: number, day: string, completed: boolean) => {
    if (!user || !progress) return;

    const updatedWeekProgress = {
      ...progress.week_progress,
      [week]: {
        ...(progress.week_progress[week] || {}),
        [day]: completed,
      },
    };

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          week_progress: updatedWeekProgress,
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        week_progress: updatedWeekProgress,
      });
    } catch (error) {
      console.error('Error updating day progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress',
        variant: 'destructive',
      });
    }
  }, [user, progress]);

  const advanceWeek = useCallback(async (newWeek: number) => {
    if (!user || !progress) return;

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          current_week: newWeek,
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        current_week: newWeek,
      });

      toast({
        title: 'Week Unlocked!',
        description: `You've unlocked Week ${newWeek}!`,
      });
    } catch (error) {
      console.error('Error advancing week:', error);
    }
  }, [user, progress]);

  const getWeekCompletionPercent = useCallback((week: number, totalDays: number = 5): number => {
    if (!progress?.week_progress[week]) return 0;
    const weekData = progress.week_progress[week];
    const completedDays = Object.values(weekData).filter(Boolean).length;
    return Math.round((completedDays / totalDays) * 100);
  }, [progress]);

  const canUnlockWeek = useCallback((week: number): boolean => {
    if (week === 1) return true;
    const previousWeekPercent = getWeekCompletionPercent(week - 1);
    return previousWeekPercent >= 70;
  }, [getWeekCompletionPercent]);

  return {
    progress,
    loading,
    initializeProgress,
    updateDayProgress,
    advanceWeek,
    getWeekCompletionPercent,
    canUnlockWeek,
    refetch: fetchProgress,
  };
}
