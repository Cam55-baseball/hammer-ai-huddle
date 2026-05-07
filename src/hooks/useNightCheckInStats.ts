import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, addDays } from 'date-fns';

interface TodayStats {
  checkinsCompleted: number;
  checkinsTotal: number;
  workoutsLogged: number;
  sleepGoalHours: number | null;
  weightTracked: number | null;
}

/**
 * The three canonical daily check-ins counted in the Nightly Recap.
 * Other quiz_type rows (e.g. 'confidence', 'weekly_wellness') must NOT
 * inflate this count — users have reported false "3/3" recaps.
 */
const CANONICAL_QUIZ_TYPES = ['morning', 'pre_lift', 'night'] as const;
type CanonicalQuizType = typeof CANONICAL_QUIZ_TYPES[number];

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
 * Stats for the Night Check-in success screen ("Nightly Recap").
 *
 * INTEGRITY RULE: every value here must reflect a REAL completion the user
 * actually made today. Do not fabricate, hard-code, or count goal/preview
 * rows as completions. The behavioral source of truth for completed work
 * is `custom_activity_logs` (Phase 9 architecture) — not `vault_workout_notes`,
 * which are free-form journal entries.
 */
const TRAINING_ACTIVITY_TYPES = [
  'practice',
  'short_practice',
  'workout',
  'running',
  'warmup',
  'recovery',
  'free_session',
];

export function useNightCheckInStats(): NightCheckInStats {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    checkinsCompleted: 0,
    checkinsTotal: CANONICAL_QUIZ_TYPES.length,
    workoutsLogged: 0,
    sleepGoalHours: null,
    weightTracked: null,
  });
  const [tomorrowPreview, setTomorrowPreview] = useState<TomorrowPreview>({
    hasWorkout: false,
    hasMindFuel: false,
    hasNutritionTip: false,
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
      const [
        quizzesResult,
        completedTrainingResult,
        streakResult,
        tomorrowEventsResult,
        tomorrowTemplatesResult,
      ] = await Promise.all([
        // Today's focus quizzes (used to count UNIQUE check-ins by type)
        supabase
          .from('vault_focus_quizzes')
          .select('quiz_type, weight_lbs')
          .eq('user_id', user.id)
          .eq('entry_date', today),

        // Today's actually-completed training activities (single source of truth)
        (supabase as any)
          .from('custom_activity_logs')
          .select('id, template:custom_activity_templates!inner(activity_type)')
          .eq('user_id', user.id)
          .eq('entry_date', today)
          .eq('completion_state', 'completed')
          .in('template.activity_type', TRAINING_ACTIVITY_TYPES),

        supabase
          .from('vault_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Tomorrow's calendar events (workouts/training/practice)
        supabase
          .from('calendar_events')
          .select('title, event_type')
          .eq('user_id', user.id)
          .eq('event_date', tomorrow)
          .in('event_type', ['workout', 'training', 'practice']),

        // Tomorrow's recurring NN templates only (we don't promise non-NN
        // optional templates as guaranteed work)
        supabase
          .from('custom_activity_templates')
          .select('title, display_days, is_non_negotiable, activity_type')
          .eq('user_id', user.id)
          .eq('recurring_active', true)
          .eq('is_non_negotiable', true)
          .is('deleted_at', null),
      ]);

      const quizzes = quizzesResult.data || [];

      // Count UNIQUE check-ins by quiz_type (morning / pre_lift / night each
      // count at most once). Prevents inflated counts if a user re-submits.
      const uniqueQuizTypes = new Set(quizzes.map((q: any) => q.quiz_type));
      const checkinsCompleted = uniqueQuizTypes.size;

      // Weight: only from a real quiz row entered today
      const weightQuiz = quizzes.find((q: any) => q.weight_lbs);
      const weightTracked = weightQuiz?.weight_lbs || null;

      // Workouts logged = count of distinct completed training activities today
      const completedTraining = (completedTrainingResult as any).data || [];
      const workoutsLogged = completedTraining.length;

      const currentStreak = streakResult.data?.current_streak || 0;

      // Tomorrow promise: only true when something concrete is scheduled
      const tomorrowEvents = tomorrowEventsResult.data || [];
      const tomorrowTemplates = tomorrowTemplatesResult.data || [];

      const scheduledTrainingTemplates = tomorrowTemplates.filter((tpl: any) => {
        if (!Array.isArray(tpl.display_days)) return false;
        if (!tpl.display_days.includes(dayOfWeekTomorrow)) return false;
        return TRAINING_ACTIVITY_TYPES.includes(tpl.activity_type);
      });

      const hasWorkout = tomorrowEvents.length > 0 || scheduledTrainingTemplates.length > 0;
      const workoutName = tomorrowEvents[0]?.title || scheduledTrainingTemplates[0]?.title;

      setTodayStats({
        checkinsCompleted,
        workoutsLogged,
        sleepGoalHours: null, // populated from form data at the call site only
        weightTracked,
      });

      setTomorrowPreview({
        hasWorkout,
        workoutName,
        // No backing source of truth yet for daily Mind Fuel / Nutrition Tip
        // queues. Do not fabricate — leave false until we wire a real source.
        hasMindFuel: false,
        hasNutritionTip: false,
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
