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
  sub_module: 'production_lab' | 'production_studio' | 'the-unicorn';
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
  // Streak tracking
  workout_streak_current: number;
  workout_streak_longest: number;
  total_workouts_completed: number;
  last_workout_date: string | null;
  // Loop tracking
  loops_completed: number;
  // Program status
  program_status: 'not_started' | 'active' | 'paused';
}

const TOTAL_CYCLES = 4;
const TOTAL_WEEKS = 6;
const DAYS_PER_WEEK = 5;
const UNLOCK_DELAY_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export function useSubModuleProgress(
  sport: 'baseball' | 'softball',
  module: 'hitting' | 'pitching',
  subModule: 'production_lab' | 'production_studio' | 'the-unicorn'
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
        workout_streak_current: (data as unknown as { workout_streak_current?: number }).workout_streak_current || 0,
        workout_streak_longest: (data as unknown as { workout_streak_longest?: number }).workout_streak_longest || 0,
        total_workouts_completed: (data as unknown as { total_workouts_completed?: number }).total_workouts_completed || 0,
        last_workout_date: (data as unknown as { last_workout_date?: string | null }).last_workout_date || null,
        loops_completed: (data as unknown as { loops_completed?: number }).loops_completed || 0,
        program_status: ((data as unknown as { program_status?: string }).program_status || 'not_started') as 'not_started' | 'active' | 'paused',
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
        workout_streak_current: 0,
        workout_streak_longest: 0,
        total_workouts_completed: 0,
        last_workout_date: null,
        loops_completed: 0,
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

  // Calculate streak based on calendar days
  const calculateStreak = useCallback((lastWorkoutDate: string | null, currentStreak: number): number => {
    if (!lastWorkoutDate) return 1; // First workout starts streak at 1
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = new Date(lastWorkoutDate);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Same day - no change to streak
      return currentStreak;
    } else if (diffDays === 1) {
      // Consecutive day - increment streak
      return currentStreak + 1;
    } else {
      // Gap in days - reset streak
      return 1;
    }
  }, []);

  // Complete a workout day with timestamp and streak tracking
  const completeWorkoutDay = useCallback(async (week: number, day: string) => {
    if (!user || !progress) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const todayDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

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
        [day]: nowIso,
      },
    };

    // Calculate new streak values
    const newStreak = calculateStreak(progress.last_workout_date, progress.workout_streak_current);
    const newLongestStreak = Math.max(newStreak, progress.workout_streak_longest);
    const newTotalWorkouts = progress.total_workouts_completed + 1;

    // Check if new total hits a milestone
    const WORKOUT_MILESTONES = [10, 50, 100, 200, 350, 500, 700, 1000];
    const reachedMilestone = WORKOUT_MILESTONES.includes(newTotalWorkouts) ? newTotalWorkouts : null;

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          week_progress: updatedWeekProgress,
          day_completion_times: updatedDayCompletionTimes as unknown as null,
          last_activity: nowIso,
          workout_streak_current: newStreak,
          workout_streak_longest: newLongestStreak,
          total_workouts_completed: newTotalWorkouts,
          last_workout_date: todayDate,
          streak_last_updated: nowIso,
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        week_progress: updatedWeekProgress,
        day_completion_times: updatedDayCompletionTimes,
        last_activity: nowIso,
        workout_streak_current: newStreak,
        workout_streak_longest: newLongestStreak,
        total_workouts_completed: newTotalWorkouts,
        last_workout_date: todayDate,
      });

      toast({
        title: 'Workout Complete!',
        description: reachedMilestone 
          ? `Milestone achieved: ${reachedMilestone} workouts! Next unlocks in 12 hours.`
          : 'Next workout unlocks in 12 hours.',
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

      return { reachedMilestone };
    } catch (error) {
      console.error('Error completing workout day:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workout completion',
        variant: 'destructive',
      });
      return { reachedMilestone: null };
    }
  }, [user, progress, calculateStreak]);

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
      // All cycles complete — loop back to cycle 1!
      await loopBackToCycle1();
    }
  }, [progress]);

  // Advance to a specific cycle (resets week/day progress but keeps weight_log)
  const advanceToCycle = useCallback(async (newCycle: number) => {
    if (!user || !progress) return;

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

  // Loop back to cycle 1 after completing all 4 cycles
  const loopBackToCycle1 = useCallback(async () => {
    if (!user || !progress) return;

    const newLoopsCompleted = (progress.loops_completed || 0) + 1;

    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({
          current_cycle: 1,
          current_week: 1,
          week_progress: {},
          exercise_progress: {},
          day_completion_times: {},
          loops_completed: newLoopsCompleted,
          last_activity: new Date().toISOString(),
          // weight_log is intentionally NOT reset — preserved for progressive suggestions
        })
        .eq('id', progress.id);

      if (error) throw error;

      setProgress({
        ...progress,
        current_cycle: 1,
        current_week: 1,
        week_progress: {},
        exercise_progress: {},
        day_completion_times: {},
        loops_completed: newLoopsCompleted,
      });

      toast({
        title: `🔄 Loop ${newLoopsCompleted + 1} Starting!`,
        description: "Let's keep building — your weight history carries forward!",
      });
    } catch (error) {
      console.error('Error looping back to cycle 1:', error);
    }
  }, [user, progress]);

  // Get weight suggestion based on previous loop/cycle data
  const getWeightSuggestion = useCallback((
    week: number,
    day: string,
    exerciseIndex: number,
    readinessRecommendation?: 'full_send' | 'modify_volume' | 'recovery_focus'
  ): { suggestedWeight: number; previousWeight: number } | null => {
    if (!progress?.weight_log) return null;

    // Look up previous weight for same exercise/day/week
    const previousWeights = progress.weight_log?.[week]?.[day]?.[exerciseIndex];
    if (!previousWeights || previousWeights.length === 0) return null;

    const validWeights = previousWeights.filter(w => w > 0);
    if (validWeights.length === 0) return null;

    const avgWeight = validWeights.reduce((a, b) => a + b, 0) / validWeights.length;

    // Apply readiness-based multiplier
    let multiplier = 1.02; // Default: small progressive increase
    if (readinessRecommendation === 'recovery_focus') {
      multiplier = 0.95; // Reduce slightly
    } else if (readinessRecommendation === 'modify_volume') {
      multiplier = 1.0; // Same weight
    }

    const suggested = Math.round(avgWeight * multiplier / 2.5) * 2.5; // Round to nearest 2.5

    return {
      suggestedWeight: suggested,
      previousWeight: Math.round(avgWeight * 10) / 10,
    };
  }, [progress]);

  const updateDayProgress = useCallback(async (week: number, day: string, completed: boolean): Promise<{ reachedMilestone: number | null } | void> => {
    if (!user || !progress) return;

    if (completed) {
      // Use the new completeWorkoutDay for completion and return result
      return await completeWorkoutDay(week, day);
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

  const programStatus = progress?.program_status || 'not_started';

  const startProgram = useCallback(async () => {
    if (!user) return;
    // If no progress row exists yet, initialize first
    let progressId = progress?.id;
    if (!progressId) {
      const result = await initializeProgress();
      if (!result) return;
      progressId = result.id;
    }
    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({ program_status: 'active' })
        .eq('id', progressId);
      if (error) throw error;
      setProgress(prev => prev ? { ...prev, program_status: 'active' } : prev);
    } catch (error) {
      console.error('Error starting program:', error);
    }
  }, [user, progress, initializeProgress]);

  const pauseProgram = useCallback(async () => {
    if (!user || !progress) return;
    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({ program_status: 'paused' })
        .eq('id', progress.id);
      if (error) throw error;
      setProgress(prev => prev ? { ...prev, program_status: 'paused' } : prev);
    } catch (error) {
      console.error('Error pausing program:', error);
    }
  }, [user, progress]);

  const resumeProgram = useCallback(async () => {
    if (!user || !progress) return;
    try {
      const { error } = await supabase
        .from('sub_module_progress')
        .update({ program_status: 'active' })
        .eq('id', progress.id);
      if (error) throw error;
      setProgress(prev => prev ? { ...prev, program_status: 'active' } : prev);
    } catch (error) {
      console.error('Error resuming program:', error);
    }
  }, [user, progress]);

  return {
    progress,
    loading,
    programStatus,
    initializeProgress,
    startProgram,
    pauseProgram,
    resumeProgram,
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
    getWeightSuggestion,
    refetch: fetchProgress,
  };
}
