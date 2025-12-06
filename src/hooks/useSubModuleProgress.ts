import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { ExperienceLevel, WeightLog } from '@/types/workout';

export interface WeekProgress {
  [day: string]: boolean;
}

export interface ExerciseProgress {
  [week: string]: {
    [day: string]: boolean[];
  };
}

export interface DayCompletionTimes {
  [week: string]: {
    [day: string]: string; // ISO timestamp
  };
}

export interface SubModuleProgress {
  id: string;
  user_id: string;
  sport: 'baseball' | 'softball';
  module: 'hitting' | 'pitching';
  sub_module: 'production_lab' | 'production_studio';
  current_week: number;
  current_cycle: number;
  week_progress: { [week: string]: WeekProgress };
  exercise_progress: ExerciseProgress;
  equipment_checklist: string[];
  weight_log: WeightLog;
  experience_level: ExperienceLevel;
  day_completion_times: DayCompletionTimes;
  started_at: string;
  last_activity: string;
}

const TOTAL_CYCLES = 4;
const TOTAL_WEEKS = 6;
const DAYS_PER_WEEK = 5;
const UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
      const progressData = data ? {
        ...data,
        exercise_progress: (data as unknown as { exercise_progress?: ExerciseProgress }).exercise_progress || {},
        weight_log: (data as unknown as { weight_log?: WeightLog }).weight_log || {},
        experience_level: ((data as unknown as { experience_level?: ExperienceLevel }).experience_level || 'intermediate') as ExperienceLevel,
        current_cycle: (data as unknown as { current_cycle?: number }).current_cycle || 1,
        day_completion_times: (data as unknown as { day_completion_times?: DayCompletionTimes }).day_completion_times || {},
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
      current_cycle: 1,
      week_progress: {},
      exercise_progress: {},
      equipment_checklist: [],
      weight_log: {},
      experience_level: 'intermediate',
      day_completion_times: {},
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
        exercise_progress: {},
        weight_log: {},
        experience_level: 'intermediate' as ExperienceLevel,
        current_cycle: 1,
        day_completion_times: {},
      } as SubModuleProgress;
      setProgress(progressData);
      return data;
    } catch (error) {
      console.error('Error initializing progress:', error);
      return null;
    }
  }, [user, sport, module, subModule]);

  // Get when a day was completed
  const getDayCompletionTime = useCallback((week: number, day: string): Date | null => {
    const timestamp = progress?.day_completion_times?.[week]?.[day];
    return timestamp ? new Date(timestamp) : null;
  }, [progress]);

  // Get when the next day will unlock (previous day completion + 24 hours)
  const getNextDayUnlockTime = useCallback((week: number, dayIndex: number): Date | null => {
    // First day of first week is always unlocked
    if (week === 1 && dayIndex === 0) return null;

    // For day 2+ in same week, check previous day
    if (dayIndex > 0) {
      const prevDay = `day${dayIndex}`;
      const prevCompletionTime = getDayCompletionTime(week, prevDay);
      if (prevCompletionTime) {
        return new Date(prevCompletionTime.getTime() + UNLOCK_DELAY_MS);
      }
      return null; // Previous day not completed yet
    }

    // For day 1 of week 2+, check last day of previous week
    if (week > 1) {
      const prevDay = `day${DAYS_PER_WEEK}`;
      const prevCompletionTime = getDayCompletionTime(week - 1, prevDay);
      if (prevCompletionTime) {
        return new Date(prevCompletionTime.getTime() + UNLOCK_DELAY_MS);
      }
    }

    return null;
  }, [getDayCompletionTime]);

  // Check if a day is accessible (unlocked and past 24-hour wait period)
  const isDayAccessible = useCallback((week: number, dayIndex: number): boolean => {
    // First day of first week is always accessible
    if (week === 1 && dayIndex === 0) return true;

    // Check if week is unlocked first
    if (week > (progress?.current_week || 1)) return false;

    const unlockTime = getNextDayUnlockTime(week, dayIndex);
    
    // If no unlock time, previous day isn't complete yet
    if (!unlockTime) return false;

    // Check if 24 hours have passed
    return new Date() >= unlockTime;
  }, [progress, getNextDayUnlockTime]);

  // Get time remaining until day unlocks (includes seconds for real-time countdown)
  const getTimeUntilUnlock = useCallback((week: number, dayIndex: number): { hours: number; minutes: number; seconds: number; unlockTime: Date } | null => {
    const unlockTime = getNextDayUnlockTime(week, dayIndex);
    if (!unlockTime) return null;

    const now = new Date();
    if (now >= unlockTime) return null;

    const diffMs = unlockTime.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, unlockTime };
  }, [getNextDayUnlockTime]);

  // Complete a workout day with timestamp
  const completeWorkoutDay = useCallback(async (week: number, day: string) => {
    if (!user || !progress) return;

    const now = new Date().toISOString();

    const updatedWeekProgress = {
      ...progress.week_progress,
      [week]: {
        ...(progress.week_progress[week] || {}),
        [day]: true,
      },
    };

    const updatedDayCompletionTimes = {
      ...progress.day_completion_times,
      [week]: {
        ...(progress.day_completion_times?.[week] || {}),
        [day]: now,
      },
    };

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          week_progress: updatedWeekProgress,
          day_completion_times: updatedDayCompletionTimes as unknown as null,
          last_activity: now,
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        week_progress: updatedWeekProgress,
        day_completion_times: updatedDayCompletionTimes,
        last_activity: now,
      });

      toast({
        title: 'Workout Complete!',
        description: 'Next workout unlocks in 24 hours.',
      });

      // Check if week is complete (all 5 days done)
      const weekDays = updatedWeekProgress[week] || {};
      const completedDays = Object.values(weekDays).filter(Boolean).length;
      
      if (completedDays >= DAYS_PER_WEEK && week < TOTAL_WEEKS) {
        // Advance to next week
        await advanceWeek(week + 1);
      } else if (completedDays >= DAYS_PER_WEEK && week === TOTAL_WEEKS) {
        // Cycle complete - check if can advance to next cycle
        await checkAndAdvanceCycle();
      }
    } catch (error) {
      console.error('Error completing workout day:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workout completion',
        variant: 'destructive',
      });
    }
  }, [user, progress]);

  // Check if current cycle is complete and advance to next
  const checkAndAdvanceCycle = useCallback(async () => {
    if (!progress) return;

    const currentCycle = progress.current_cycle || 1;
    
    // Check if all 6 weeks are 100% complete
    let allWeeksComplete = true;
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const weekDays = progress.week_progress[w] || {};
      const completedDays = Object.values(weekDays).filter(Boolean).length;
      if (completedDays < DAYS_PER_WEEK) {
        allWeeksComplete = false;
        break;
      }
    }

    if (!allWeeksComplete) return;

    if (currentCycle < TOTAL_CYCLES) {
      await advanceToCycle(currentCycle + 1);
    } else {
      // All cycles complete!
      toast({
        title: '🎉 Program Complete!',
        description: 'Congratulations! You have completed all 4 training cycles!',
      });
    }
  }, [progress]);

  // Advance to a specific cycle (resets week/day progress)
  const advanceToCycle = useCallback(async (newCycle: number) => {
    if (!user || !progress || newCycle > TOTAL_CYCLES) return;

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          current_cycle: newCycle,
          current_week: 1,
          week_progress: {},
          exercise_progress: {},
          day_completion_times: {},
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        current_cycle: newCycle,
        current_week: 1,
        week_progress: {},
        exercise_progress: {},
        day_completion_times: {},
      });

      toast({
        title: `Cycle ${newCycle} Unlocked!`,
        description: `You've advanced to Cycle ${newCycle}!`,
      });
    } catch (error) {
      console.error('Error advancing cycle:', error);
    }
  }, [user, progress]);

  const updateDayProgress = useCallback(async (week: number, day: string, completed: boolean) => {
    if (!user || !progress) return;

    if (completed) {
      // Use the new completeWorkoutDay for completion
      await completeWorkoutDay(week, day);
    } else {
      // Handle uncomplete (remove completion timestamp)
      const updatedWeekProgress = {
        ...progress.week_progress,
        [week]: {
          ...(progress.week_progress[week] || {}),
          [day]: false,
        },
      };

      const updatedDayCompletionTimes = { ...progress.day_completion_times };
      if (updatedDayCompletionTimes[week]) {
        delete updatedDayCompletionTimes[week][day];
      }

      try {
        const { error } = await supabase
          .from('sub_module_progress')
          .update({
            week_progress: updatedWeekProgress,
            day_completion_times: updatedDayCompletionTimes as unknown as null,
            last_activity: new Date().toISOString(),
          })
          .eq('id', progress.id);

        if (error) throw error;

        setProgress({
          ...progress,
          week_progress: updatedWeekProgress,
          day_completion_times: updatedDayCompletionTimes,
        });
      } catch (error) {
        console.error('Error updating day progress:', error);
        toast({
          title: 'Error',
          description: 'Failed to save progress',
          variant: 'destructive',
        });
      }
    }
  }, [user, progress, completeWorkoutDay]);

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

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          exercise_progress: updatedExerciseProgress,
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        exercise_progress: updatedExerciseProgress,
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

  const updateWeightLog = useCallback(async (
    week: number,
    day: string,
    exerciseIndex: number,
    setIndex: number,
    weight: number
  ) => {
    if (!user || !progress) return;

    const currentWeights = progress.weight_log?.[week]?.[day]?.[exerciseIndex] || [];
    const newWeights = [...currentWeights];
    newWeights[setIndex] = weight;

    const newWeightLog: WeightLog = {
      ...progress.weight_log,
      [week]: {
        ...(progress.weight_log?.[week] || {}),
        [day]: {
          ...(progress.weight_log?.[week]?.[day] || {}),
          [exerciseIndex]: newWeights,
        },
      },
    };

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          weight_log: newWeightLog as unknown as null,
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        weight_log: newWeightLog,
      });
    } catch (error) {
      console.error('Error updating weight log:', error);
      toast({
        title: 'Error',
        description: 'Failed to save weight',
        variant: 'destructive',
      });
    }
  }, [user, progress]);

  const getWeightLog = useCallback((week: number, day: string): { [exerciseIndex: number]: number[] } => {
    return progress?.weight_log?.[week]?.[day] || {};
  }, [progress]);

  const updateExperienceLevel = useCallback(async (level: ExperienceLevel) => {
    if (!user || !progress) return;

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          experience_level: level,
          last_activity: new Date().toISOString(),
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        experience_level: level,
      });
    } catch (error) {
      console.error('Error updating experience level:', error);
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

  const getWeekCompletionPercent = useCallback((week: number, totalDays: number = DAYS_PER_WEEK): number => {
    if (!progress?.week_progress[week]) return 0;
    const weekData = progress.week_progress[week];
    const completedDays = Object.values(weekData).filter(Boolean).length;
    return Math.round((completedDays / totalDays) * 100);
  }, [progress]);

  const canUnlockWeek = useCallback((week: number): boolean => {
    if (week === 1) return true;
    // Week unlocks when ALL 5 days of previous week are complete
    const previousWeekPercent = getWeekCompletionPercent(week - 1);
    return previousWeekPercent === 100;
  }, [getWeekCompletionPercent]);

  return {
    progress,
    loading,
    initializeProgress,
    updateDayProgress,
    updateExerciseProgress,
    getExerciseProgress,
    updateWeightLog,
    getWeightLog,
    updateExperienceLevel,
    advanceWeek,
    advanceToCycle,
    getWeekCompletionPercent,
    canUnlockWeek,
    isDayAccessible,
    getTimeUntilUnlock,
    getNextDayUnlockTime,
    getDayCompletionTime,
    completeWorkoutDay,
    refetch: fetchProgress,
  };
}
