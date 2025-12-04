import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface WeekProgress {
  [day: string]: boolean;
}

export interface ExerciseProgress {
  [week: string]: {
    [day: string]: boolean[];
  };
}

export interface SubModuleProgress {
  id: string;
  user_id: string;
  sport: 'baseball' | 'softball';
  module: 'hitting' | 'pitching';
  sub_module: 'production_lab' | 'production_studio';
  current_week: number;
  week_progress: { [week: string]: WeekProgress };
  exercise_progress: ExerciseProgress;
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
      // Handle exercise_progress - cast to unknown first since TypeScript types may not be updated yet
      const progressData = data ? {
        ...data,
        exercise_progress: (data as unknown as { exercise_progress?: ExerciseProgress }).exercise_progress || {},
      } as SubModuleProgress : null;
      setProgress(progressData);
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
      const progressData = {
        ...data,
        exercise_progress: (data as unknown as { exercise_progress?: ExerciseProgress }).exercise_progress || {},
      } as SubModuleProgress;
      setProgress(progressData);
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

  const updateExerciseProgress = useCallback(async (
    week: number,
    day: string,
    exerciseIndex: number,
    completed: boolean,
    totalExercises: number
  ) => {
    if (!user || !progress) return;

    const currentExercises = progress.exercise_progress?.[week]?.[day] || 
      new Array(totalExercises).fill(false);
    
    const updatedExercises = [...currentExercises];
    updatedExercises[exerciseIndex] = completed;

    const updatedExerciseProgress = {
      ...progress.exercise_progress,
      [week]: {
        ...(progress.exercise_progress?.[week] || {}),
        [day]: updatedExercises,
      },
    };

    // Check if all exercises are complete to auto-mark day complete
    const allComplete = updatedExercises.every(Boolean);

    try {
      const updateData: Record<string, unknown> = {
        exercise_progress: updatedExerciseProgress,
        last_activity: new Date().toISOString(),
      };

      // Auto-complete day if all exercises done
      if (allComplete) {
        const updatedWeekProgress = {
          ...progress.week_progress,
          [week]: {
            ...(progress.week_progress[week] || {}),
            [day]: true,
          },
        };
        updateData.week_progress = updatedWeekProgress;
      }

      const { error } = await supabase
        .from('sub_module_progress')
        .update(updateData)
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        exercise_progress: updatedExerciseProgress,
        ...(allComplete && {
          week_progress: {
            ...progress.week_progress,
            [week]: {
              ...(progress.week_progress[week] || {}),
              [day]: true,
            },
          },
        }),
      });
    } catch (error) {
      console.error('Error updating exercise progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exercise progress',
        variant: 'destructive',
      });
    }
  }, [user, progress]);

  const getExerciseProgress = useCallback((week: number, day: string, totalExercises: number): boolean[] => {
    if (!progress?.exercise_progress?.[week]?.[day]) {
      return new Array(totalExercises).fill(false);
    }
    return progress.exercise_progress[week][day];
  }, [progress]);

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
    updateExerciseProgress,
    getExerciseProgress,
    advanceWeek,
    getWeekCompletionPercent,
    canUnlockWeek,
    refetch: fetchProgress,
  };
}
