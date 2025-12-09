import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VaultEntry {
  id: string;
  user_id: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface VaultWorkoutNote {
  id: string;
  user_id: string;
  entry_date: string;
  sport: string;
  module: string;
  sub_module: string;
  week_number: number;
  day_number: number;
  notes: string | null;
  weight_increases: WeightIncrease[];
  total_weight_lifted: number;
  created_at: string;
}

export interface WeightIncrease {
  exercise_name: string;
  previous_weight: number;
  new_weight: number;
  increase_amount: number;
  set_index?: number;
}

export interface VaultFocusQuiz {
  id: string;
  user_id: string;
  entry_date: string;
  quiz_type: 'pre_lift' | 'night' | 'morning';
  mental_readiness: number;
  emotional_state: number;
  physical_readiness: number;
  reflection_did_well?: string;
  reflection_improve?: string;
  reflection_learned?: string;
  reflection_motivation?: string;
  sleep_time?: string;
  wake_time?: string;
  created_at: string;
}

export interface VaultFreeNote {
  id: string;
  user_id: string;
  entry_date: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export interface VaultStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_entry_date: string | null;
  total_entries: number;
  nutrition_streak: number;
  quiz_streak: number;
  journal_streak: number;
  badges_earned: string[];
  created_at: string;
  updated_at: string;
}

export function useVault() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<VaultStreak | null>(null);
  const [todaysQuizzes, setTodaysQuizzes] = useState<VaultFocusQuiz[]>([]);
  const [todaysNotes, setTodaysNotes] = useState<VaultFreeNote | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState<VaultWorkoutNote[]>([]);

  const today = new Date().toISOString().split('T')[0];

  // Fetch vault streak data
  const fetchStreak = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching streak:', error);
        return;
      }

      if (data) {
        setStreak(data as VaultStreak);
      }
    } catch (err) {
      console.error('Error fetching vault streak:', err);
    }
  }, [user]);

  // Fetch today's quizzes
  const fetchTodaysQuizzes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_focus_quizzes')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      if (error) {
        console.error('Error fetching quizzes:', error);
        return;
      }

      setTodaysQuizzes((data || []) as VaultFocusQuiz[]);
    } catch (err) {
      console.error('Error fetching today\'s quizzes:', err);
    }
  }, [user, today]);

  // Fetch today's free notes
  const fetchTodaysNotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_free_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notes:', error);
        return;
      }

      setTodaysNotes(data as VaultFreeNote | null);
    } catch (err) {
      console.error('Error fetching today\'s notes:', err);
    }
  }, [user, today]);

  // Fetch workout notes
  const fetchWorkoutNotes = useCallback(async (date?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_workout_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', date || today)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workout notes:', error);
        return;
      }

      const mappedNotes = (data || []).map(note => ({
        ...note,
        weight_increases: (note.weight_increases || []) as unknown as WeightIncrease[],
      })) as VaultWorkoutNote[];
      setWorkoutNotes(mappedNotes);
    } catch (err) {
      console.error('Error fetching workout notes:', err);
    }
  }, [user, today]);

  // Initialize/update streak
  const updateStreak = useCallback(async () => {
    if (!user) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
      // Check if streak record exists
      const { data: existingStreak, error: fetchError } = await supabase
        .from('vault_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking streak:', fetchError);
        return;
      }

      if (!existingStreak) {
        // Create new streak record
        const { data: newStreak, error: insertError } = await supabase
          .from('vault_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_entry_date: today,
            total_entries: 1,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating streak:', insertError);
          return;
        }

        setStreak(newStreak as VaultStreak);
        return;
      }

      // Update existing streak
      let newCurrentStreak = existingStreak.current_streak;
      const lastEntryDate = existingStreak.last_entry_date;

      if (lastEntryDate === today) {
        // Already logged today, no change
        return;
      } else if (lastEntryDate === yesterdayStr) {
        // Consecutive day
        newCurrentStreak += 1;
      } else {
        // Streak broken
        newCurrentStreak = 1;
      }

      const newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak);
      const newTotalEntries = existingStreak.total_entries + 1;

      // Check for new badges
      const badges = [...(existingStreak.badges_earned || [])];
      const streakBadges: Record<number, string> = {
        7: 'week_warrior',
        14: 'two_week_titan',
        30: 'monthly_master',
        60: 'sixty_day_sentinel',
        100: 'century_champion',
      };

      Object.entries(streakBadges).forEach(([days, badge]) => {
        if (newCurrentStreak >= parseInt(days) && !badges.includes(badge)) {
          badges.push(badge);
        }
      });

      const { data: updatedStreak, error: updateError } = await supabase
        .from('vault_streaks')
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_entry_date: today,
          total_entries: newTotalEntries,
          badges_earned: badges,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return;
      }

      setStreak(updatedStreak as VaultStreak);
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  }, [user, today]);

  // Save focus quiz
  const saveFocusQuiz = useCallback(async (
    quizType: 'pre_lift' | 'night' | 'morning',
    data: {
      mental_readiness: number;
      emotional_state: number;
      physical_readiness: number;
      reflection_did_well?: string;
      reflection_improve?: string;
      reflection_learned?: string;
      reflection_motivation?: string;
    }
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Calculate sleep/wake times based on quiz type
      let sleepTime: string | undefined;
      let wakeTime: string | undefined;

      if (quizType === 'night') {
        // Assume sleep 1 hour after quiz completion
        const sleepDate = new Date();
        sleepDate.setHours(sleepDate.getHours() + 1);
        sleepTime = sleepDate.toISOString();
      } else if (quizType === 'morning') {
        // Assume woke up 15 min before quiz
        const wakeDate = new Date();
        wakeDate.setMinutes(wakeDate.getMinutes() - 15);
        wakeTime = wakeDate.toISOString();
      }

      const { error } = await supabase
        .from('vault_focus_quizzes')
        .upsert({
          user_id: user.id,
          entry_date: today,
          quiz_type: quizType,
          ...data,
          sleep_time: sleepTime,
          wake_time: wakeTime,
        }, {
          onConflict: 'user_id,entry_date,quiz_type',
        });

      if (error) {
        console.error('Error saving quiz:', error);
        return { success: false, error: error.message };
      }

      // Update streak
      await updateStreak();
      await fetchTodaysQuizzes();

      return { success: true };
    } catch (err) {
      console.error('Error saving focus quiz:', err);
      return { success: false, error: 'Failed to save quiz' };
    }
  }, [user, today, updateStreak, fetchTodaysQuizzes]);

  // Save free note
  const saveFreeNote = useCallback(async (noteText: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('vault_free_notes')
        .upsert({
          user_id: user.id,
          entry_date: today,
          note_text: noteText,
        }, {
          onConflict: 'user_id,entry_date',
        });

      if (error) {
        console.error('Error saving note:', error);
        return { success: false, error: error.message };
      }

      await updateStreak();
      await fetchTodaysNotes();

      return { success: true };
    } catch (err) {
      console.error('Error saving free note:', err);
      return { success: false, error: 'Failed to save note' };
    }
  }, [user, today, updateStreak, fetchTodaysNotes]);

  // Save workout notes with weight increases
  const saveWorkoutNote = useCallback(async (
    sport: string,
    module: string,
    subModule: string,
    weekNumber: number,
    dayNumber: number,
    notes: string | null,
    weightIncreases: WeightIncrease[],
    totalWeightLifted: number
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('vault_workout_notes')
        .insert([{
          user_id: user.id,
          entry_date: today,
          sport,
          module,
          sub_module: subModule,
          week_number: weekNumber,
          day_number: dayNumber,
          notes,
          weight_increases: JSON.parse(JSON.stringify(weightIncreases)),
          total_weight_lifted: totalWeightLifted,
        }]);

      if (error) {
        console.error('Error saving workout note:', error);
        return { success: false, error: error.message };
      }

      await updateStreak();
      await fetchWorkoutNotes();

      return { success: true };
    } catch (err) {
      console.error('Error saving workout note:', err);
      return { success: false, error: 'Failed to save workout note' };
    }
  }, [user, today, updateStreak, fetchWorkoutNotes]);

  // Check if user has access to The Vault (any module subscription)
  const checkVaultAccess = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('subscribed_modules')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return false;

      const modules = data.subscribed_modules || [];
      return modules.length > 0;
    } catch {
      return false;
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchStreak(),
        fetchTodaysQuizzes(),
        fetchTodaysNotes(),
        fetchWorkoutNotes(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [user, fetchStreak, fetchTodaysQuizzes, fetchTodaysNotes, fetchWorkoutNotes]);

  return {
    loading,
    streak,
    todaysQuizzes,
    todaysNotes,
    workoutNotes,
    saveFocusQuiz,
    saveFreeNote,
    saveWorkoutNote,
    updateStreak,
    checkVaultAccess,
    fetchWorkoutNotes,
  };
}
