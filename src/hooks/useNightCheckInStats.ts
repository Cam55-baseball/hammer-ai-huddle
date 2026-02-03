import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, addDays } from 'date-fns';

interface TodayStats {
  checkinsCompleted: number;
  workoutsLogged: number;
  sleepGoalHours: number | null;
  weightTracked: number | null;
}

interface TomorrowPreview {
  hasWorkout: boolean;
  workoutName?: string;
  hasMindFuel: boolean;
  hasNutritionTip: boolean;
}

interface NightCheckInStats {
  todayStats: TodayStats;
  tomorrowPreview: TomorrowPreview;
  streakDays: number;
  loading: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch statistics for the Night Check-in Success screen.
 * Aggregates today's activity and previews tomorrow's scheduled items.
 */
export function useNightCheckInStats(): NightCheckInStats {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    checkinsCompleted: 0,
    workoutsLogged: 0,
    sleepGoalHours: null,
    weightTracked: null,
  });
  const [tomorrowPreview, setTomorrowPreview] = useState<TomorrowPreview>({
    hasWorkout: false,
    hasMindFuel: true, // Always available
    hasNutritionTip: true, // Always available
  });
  const [streakDays, setStreakDays] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const dayOfWeekTomorrow = addDays(new Date(), 1).getDay();

    try {
      // Fetch all data in parallel
      const [
        quizzesResult,
        workoutsResult,
        streakResult,
        tomorrowEventsResult,
        tomorrowTemplatesResult,
      ] = await Promise.all([
        // Today's quizzes
        supabase
          .from('vault_focus_quizzes')
          .select('quiz_type, weight_lbs')
          .eq('user_id', user.id)
          .eq('entry_date', today),
        
        // Today's workout notes
        supabase
          .from('vault_workout_notes')
          .select('id')
          .eq('user_id', user.id)
          .eq('entry_date', today),
        
        // User's streak
        supabase
          .from('vault_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle(),
        
        // Tomorrow's calendar events (workouts)
        supabase
          .from('calendar_events')
          .select('title, event_type')
          .eq('user_id', user.id)
          .eq('event_date', tomorrow)
          .in('event_type', ['workout', 'training', 'practice']),
        
        // Tomorrow's recurring activity templates
        supabase
          .from('custom_activity_templates')
          .select('title, display_days')
          .eq('user_id', user.id)
          .eq('recurring_active', true)
          .is('deleted_at', null),
      ]);

      // Process today's stats
      const quizzes = quizzesResult.data || [];
      const checkinsCompleted = quizzes.length;
      
      // Get weight from any quiz that has it
      const weightQuiz = quizzes.find(q => q.weight_lbs);
      const weightTracked = weightQuiz?.weight_lbs || null;

      // Process workout count
      const workoutsLogged = workoutsResult.data?.length || 0;

      // Get streak
      const currentStreak = streakResult.data?.current_streak || 0;

      // Check tomorrow's workouts
      const tomorrowEvents = tomorrowEventsResult.data || [];
      const tomorrowTemplates = tomorrowTemplatesResult.data || [];
      
      // Check if any templates are scheduled for tomorrow
      const scheduledTemplates = tomorrowTemplates.filter(template => {
        if (!template.display_days || !Array.isArray(template.display_days)) return false;
        return template.display_days.includes(dayOfWeekTomorrow);
      });

      const hasWorkout = tomorrowEvents.length > 0 || scheduledTemplates.length > 0;
      const workoutName = tomorrowEvents[0]?.title || scheduledTemplates[0]?.title;

      setTodayStats({
        checkinsCompleted,
        workoutsLogged,
        sleepGoalHours: null, // Will be set from form data
        weightTracked,
      });

      setTomorrowPreview({
        hasWorkout,
        workoutName,
        hasMindFuel: true,
        hasNutritionTip: true,
      });

      setStreakDays(currentStreak);
    } catch (error) {
      console.error('Error fetching night check-in stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    todayStats,
    tomorrowPreview,
    streakDays,
    loading,
    refetch: fetchStats,
  };
}
