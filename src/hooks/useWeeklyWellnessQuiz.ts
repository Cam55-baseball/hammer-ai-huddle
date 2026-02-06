import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, format, differenceInDays } from 'date-fns';

interface WeeklyWellnessGoals {
  id: string;
  week_start_date: string;
  target_mood_level: number;
  target_stress_level: number;
  target_discipline_level: number;
  notification_enabled: boolean;
  completed_at: string;
  weekly_goals_text?: string;
}

interface WeeklyAverages {
  avgMood: number | null;
  avgStress: number | null;
  avgDiscipline: number | null;
}

interface UseWeeklyWellnessQuizReturn {
  isCompletedThisWeek: boolean;
  currentGoals: WeeklyWellnessGoals | null;
  lastWeekGoals: WeeklyWellnessGoals | null;
  lastWeekAverages: WeeklyAverages;
  isLoading: boolean;
  isDueThisWeek: boolean;
  nextOpenDate: string;
  saveGoals: (goals: { mood: number; stress: number; discipline: number; goalsText?: string }) => Promise<{ success: boolean; reason?: string }>;
  refetch: () => void;
}

export function useWeeklyWellnessQuiz(): UseWeeklyWellnessQuizReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentGoals, setCurrentGoals] = useState<WeeklyWellnessGoals | null>(null);
  const [lastWeekGoals, setLastWeekGoals] = useState<WeeklyWellnessGoals | null>(null);
  const [lastWeekAverages, setLastWeekAverages] = useState<WeeklyAverages>({
    avgMood: null,
    avgStress: null,
    avgDiscipline: null,
  });

  const getCurrentWeekStart = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    return format(weekStart, 'yyyy-MM-dd');
  };

  const getLastWeekStart = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return format(lastWeekStart, 'yyyy-MM-dd');
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    const currentWeekStart = getCurrentWeekStart();
    const lastWeekStart = getLastWeekStart();

    try {
      // Fetch current week goals
      const { data: currentData } = await supabase
        .from('vault_weekly_wellness_quiz')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', currentWeekStart)
        .maybeSingle();

      setCurrentGoals(currentData);

      // Fetch last week goals
      const { data: lastData } = await supabase
        .from('vault_weekly_wellness_quiz')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', lastWeekStart)
        .maybeSingle();

      setLastWeekGoals(lastData);

      // Calculate last week's actual averages from vault_focus_quizzes
      if (lastData) {
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

        const { data: quizData } = await supabase
          .from('vault_focus_quizzes')
          .select('mood_level, stress_level, discipline_level')
          .eq('user_id', user.id)
          .gte('entry_date', lastWeekStart)
          .lte('entry_date', format(lastWeekEnd, 'yyyy-MM-dd'));

        if (quizData && quizData.length > 0) {
          const validMoods = quizData.filter(q => q.mood_level !== null).map(q => q.mood_level as number);
          const validStress = quizData.filter(q => q.stress_level !== null).map(q => q.stress_level as number);
          const validDiscipline = quizData.filter(q => q.discipline_level !== null).map(q => q.discipline_level as number);

          setLastWeekAverages({
            avgMood: validMoods.length > 0 ? validMoods.reduce((a, b) => a + b, 0) / validMoods.length : null,
            avgStress: validStress.length > 0 ? validStress.reduce((a, b) => a + b, 0) / validStress.length : null,
            avgDiscipline: validDiscipline.length > 0 ? validDiscipline.reduce((a, b) => a + b, 0) / validDiscipline.length : null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching weekly wellness quiz data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveGoals = async (goals: { mood: number; stress: number; discipline: number; goalsText?: string }) => {
    if (!user) return { success: false };

    const currentWeekStart = getCurrentWeekStart();

    // Check if already completed this week - hard lock
    if (currentGoals) {
      console.log('[useWeeklyWellnessQuiz] Goals already set for this week, blocking save');
      return { success: false, reason: 'already_completed' };
    }

    try {
      // Use INSERT only (not upsert) to prevent overwrites
      const { error } = await supabase
        .from('vault_weekly_wellness_quiz')
        .insert({
          user_id: user.id,
          week_start_date: currentWeekStart,
          target_mood_level: goals.mood,
          target_stress_level: goals.stress,
          target_discipline_level: goals.discipline,
          weekly_goals_text: goals.goalsText || null,
          completed_at: new Date().toISOString(),
        });

      if (error) {
        // If duplicate key error, goals were already set
        if (error.code === '23505') {
          console.log('[useWeeklyWellnessQuiz] Duplicate key - already completed');
          await fetchData();
          return { success: false, reason: 'already_completed' };
        }
        throw error;
      }

      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error saving weekly wellness goals:', error);
      return { success: false };
    }
  };

  // Check if it's due (not completed this week)
  const isCompletedThisWeek = !!currentGoals;
  
  // Calculate next Monday 12:00am for display
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  nextMonday.setHours(0, 0, 0, 0);
  
  // Show as due on Monday or if not completed this week (only show Mon-Wed)
  const daysSinceWeekStart = differenceInDays(today, weekStart);
  const isDueThisWeek = !isCompletedThisWeek && daysSinceWeekStart <= 2; // Show Mon-Wed
  
  // Format next Monday for display
  const nextOpenDate = format(nextMonday, 'EEEE, MMM d');

  return {
    isCompletedThisWeek,
    currentGoals,
    lastWeekGoals,
    lastWeekAverages,
    isLoading,
    isDueThisWeek,
    nextOpenDate,
    saveGoals,
    refetch: fetchData,
  };
}
