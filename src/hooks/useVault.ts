import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';

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
  hours_slept?: number;
  sleep_quality?: number;
  // Elite morning check-in fields
  daily_motivation?: string;
  daily_intentions?: string;
  discipline_level?: number;
  mood_level?: number;
  stress_level?: number;
  // NEW: Morning check-in additions
  weight_lbs?: number;
  perceived_recovery?: number;
  // NEW: Pre-workout CNS fields
  reaction_time_ms?: number;
  reaction_time_score?: number;
  balance_left_seconds?: number;
  balance_right_seconds?: number;
  // NEW: Pre-workout pain fields
  pain_location?: string[];
  pain_scale?: number;
  pain_scales?: Record<string, number>; // Per-area pain levels
  pain_increases_with_movement?: boolean;
  // NEW: Pre-workout intent fields
  training_intent?: string[];
  mental_energy?: number;
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

export interface VaultNutritionLog {
  id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  hydration_oz: number | null;
  energy_level: number | null;
  digestion_notes: string | null;
  supplements: string[];
  meal_type: string | null;
  meal_title: string | null;
  logged_at: string | null;
}

export interface VaultNutritionGoals {
  id: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fats_goal: number;
  hydration_goal: number;
  supplement_goals: string[];
}

export interface VaultSupplementTracking {
  id: string;
  user_id: string;
  entry_date: string;
  supplements_taken: string[];
}

export interface VaultSavedDrill {
  id: string;
  drill_name: string;
  drill_description: string | null;
  module_origin: string;
  sport: string;
  saved_at: string;
}

export interface VaultSavedTip {
  id: string;
  tip_text: string;
  tip_category: string | null;
  module_origin: string;
  saved_at: string;
}

export interface VaultPerformanceTest {
  id: string;
  test_type: string;
  sport: string;
  module: string;
  test_date: string;
  results: Record<string, number>;
  previous_results: Record<string, number> | null;
  next_entry_date?: string | null;
}

export interface VaultProgressPhoto {
  id: string;
  photo_date: string;
  photo_urls: string[];
  weight_lbs: number | null;
  body_fat_percent: number | null;
  arm_measurement: number | null;
  chest_measurement: number | null;
  waist_measurement: number | null;
  leg_measurement: number | null;
  notes: string | null;
  next_entry_date?: string | null;
}

export interface VaultScoutGrade {
  id: string;
  graded_at: string;
  next_prompt_date: string | null;
  grade_type: 'hitting_throwing' | 'pitching';
  // Hitting/Throwing grades
  hitting_grade: number | null;
  power_grade: number | null;
  speed_grade: number | null;
  defense_grade: number | null;
  throwing_grade: number | null;
  leadership_grade: number | null;
  self_efficacy_grade: number | null;
  // Pitching-specific grades
  fastball_grade: number | null;
  offspeed_grade: number | null;
  breaking_ball_grade: number | null;
  control_grade: number | null;
  delivery_grade: number | null;
  rise_ball_grade: number | null; // Softball only
  notes: string | null;
}

export interface VaultRecap {
  id: string;
  recap_period_start: string;
  recap_period_end: string;
  total_weight_lifted: number | null;
  strength_change_percent: number | null;
  recap_data: Record<string, unknown>;
  generated_at: string;
}

export interface VaultFavoriteMeal {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  hydration_oz: number | null;
  meal_type: string | null;
  supplements: string[];
  usage_count: number;
  created_at: string;
  last_used_at: string | null;
}

export function useVault() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<VaultStreak | null>(null);
  const [todaysQuizzes, setTodaysQuizzes] = useState<VaultFocusQuiz[]>([]);
  const [todaysNotes, setTodaysNotes] = useState<VaultFreeNote[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState<VaultWorkoutNote[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<VaultNutritionLog[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<VaultNutritionGoals | null>(null);
  const [supplementTracking, setSupplementTracking] = useState<VaultSupplementTracking | null>(null);
  const [savedDrills, setSavedDrills] = useState<VaultSavedDrill[]>([]);
  const [savedTips, setSavedTips] = useState<VaultSavedTip[]>([]);
  const [performanceTests, setPerformanceTests] = useState<VaultPerformanceTest[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<VaultProgressPhoto[]>([]);
  const [scoutGrades, setScoutGrades] = useState<VaultScoutGrade[]>([]);
  const [pitchingGrades, setPitchingGrades] = useState<VaultScoutGrade[]>([]);
  const [recaps, setRecaps] = useState<VaultRecap[]>([]);
  const [entriesWithData, setEntriesWithData] = useState<string[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<VaultFavoriteMeal[]>([]);

  const today = new Date().toISOString().split('T')[0];

  // Fetch vault streak data
  const fetchStreak = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

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

  // Fetch today's free notes (now returns array for unlimited notes)
  const fetchTodaysNotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_free_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      setTodaysNotes((data || []) as VaultFreeNote[]);
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
        .maybeSingle();

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
      hours_slept?: number;
      sleep_quality?: number;
      // Elite morning check-in fields
      daily_motivation?: string;
      daily_intentions?: string;
      discipline_level?: number;
      mood_level?: number;
      stress_level?: number;
      // Sleep tracking fields
      bedtime_actual?: string;
      wake_time_actual?: string;
      bedtime_goal?: string;
      wake_time_goal?: string;
      // NEW: Morning check-in additions
      weight_lbs?: number;
      perceived_recovery?: number;
      // NEW: Pre-workout CNS fields
      reaction_time_ms?: number;
      reaction_time_score?: number;
      balance_left_seconds?: number;
      balance_right_seconds?: number;
      // NEW: Pre-workout pain fields
      pain_location?: string[];
      pain_scale?: number;
      pain_scales?: Record<string, number>; // Per-area pain levels
      pain_increases_with_movement?: boolean;
      // NEW: Pre-workout intent fields
      training_intent?: string[];
      mental_energy?: number;
    }
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Calculate sleep/wake times based on quiz type (legacy behavior for backward compatibility)
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
          mental_readiness: data.mental_readiness,
          emotional_state: data.emotional_state,
          physical_readiness: data.physical_readiness,
          reflection_did_well: data.reflection_did_well,
          reflection_improve: data.reflection_improve,
          reflection_learned: data.reflection_learned,
          reflection_motivation: data.reflection_motivation,
          hours_slept: data.hours_slept,
          sleep_quality: data.sleep_quality,
          sleep_time: sleepTime,
          wake_time: wakeTime,
          // Elite morning check-in fields
          daily_motivation: data.daily_motivation,
          daily_intentions: data.daily_intentions,
          discipline_level: data.discipline_level,
          mood_level: data.mood_level,
          stress_level: data.stress_level,
          // Sleep goal fields (Night quiz)
          bedtime_goal: data.bedtime_goal,
          wake_time_goal: data.wake_time_goal,
          // NEW: Morning check-in additions
          weight_lbs: data.weight_lbs,
          perceived_recovery: data.perceived_recovery,
          // NEW: Pre-workout CNS fields
          reaction_time_ms: data.reaction_time_ms,
          reaction_time_score: data.reaction_time_score,
          balance_left_seconds: data.balance_left_seconds,
          balance_right_seconds: data.balance_right_seconds,
          // NEW: Pre-workout pain fields
          pain_location: data.pain_location,
          pain_scale: data.pain_scale,
          pain_scales: data.pain_scales,
          pain_increases_with_movement: data.pain_increases_with_movement,
          // NEW: Pre-workout intent fields
          training_intent: data.training_intent,
          mental_energy: data.mental_energy,
        }, {
          onConflict: 'user_id,entry_date,quiz_type',
        });

      if (error) {
        console.error('Error saving quiz:', error);
        return { success: false, error: error.message };
      }

      // Sync weight to weight_entries table if provided (for any quiz type)
      if (data.weight_lbs && data.weight_lbs > 0) {
        const noteSource = quizType === 'morning' ? 'Morning Check-in' 
                         : quizType === 'pre_lift' ? 'Pre-Workout Check-in' 
                         : 'Night Check-in';
        
        try {
          await supabase
            .from('weight_entries')
            .upsert({
              user_id: user.id,
              entry_date: today,
              weight_lbs: data.weight_lbs,
              notes: `Logged via ${noteSource}`,
            }, { 
              onConflict: 'user_id,entry_date' 
            });
        } catch (weightErr) {
          console.error('Error syncing weight to weight_entries:', weightErr);
          // Don't fail the quiz save if weight sync fails
        }
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

  // Save free note (insert new entry - unlimited notes per day)
  const saveFreeNote = useCallback(async (noteText: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('vault_free_notes')
        .insert({
          user_id: user.id,
          entry_date: today,
          note_text: noteText,
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
        .maybeSingle();

      if (error || !data) return false;

      const modules = data.subscribed_modules || [];
      return modules.length > 0;
    } catch {
      return false;
    }
  }, [user]);

  // Fetch nutrition logs (multiple entries per day)
  const fetchNutritionLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .order('logged_at', { ascending: false });
    setNutritionLogs((data || []).map(d => ({ 
      ...d, 
      supplements: (d.supplements as string[]) || [],
      meal_type: d.meal_type || null,
      logged_at: d.logged_at || null,
    })));
  }, [user, today]);

  // Save nutrition log (insert new entry each time)
  const saveNutritionLog = useCallback(async (logData: Omit<VaultNutritionLog, 'id' | 'logged_at'>) => {
    if (!user) return { success: false };
    const { error } = await supabase.from('vault_nutrition_logs').insert({
      user_id: user.id, 
      entry_date: today, 
      logged_at: new Date().toISOString(),
      ...logData,
    });
    if (!error) { await updateStreak(); await fetchNutritionLogs(); }
    return { success: !error };
  }, [user, today, updateStreak, fetchNutritionLogs]);

  // Delete nutrition log entry
  const deleteNutritionLog = useCallback(async (id: string) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('vault_nutrition_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchNutritionLogs();
    return { success: !error };
  }, [user, fetchNutritionLogs]);

  // Fetch nutrition goals
  const fetchNutritionGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setNutritionGoals({
        ...data,
        supplement_goals: (data.supplement_goals as string[]) || [],
      } as VaultNutritionGoals);
    }
  }, [user]);

  // Save nutrition goals
  const saveNutritionGoals = useCallback(async (goals: Omit<VaultNutritionGoals, 'id'>) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('vault_nutrition_goals')
      .upsert({
        user_id: user.id,
        ...goals,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (!error) await fetchNutritionGoals();
    return { success: !error };
  }, [user, fetchNutritionGoals]);

  // Fetch supplement tracking for today
  const fetchSupplementTracking = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_supplement_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .maybeSingle();
    if (data) {
      setSupplementTracking({
        ...data,
        supplements_taken: (data.supplements_taken as string[]) || [],
      } as VaultSupplementTracking);
    } else {
      setSupplementTracking(null);
    }
  }, [user, today]);

  // Toggle supplement taken status
  const toggleSupplementTaken = useCallback(async (supplementName: string) => {
    if (!user) return { success: false };
    
    const currentTaken = supplementTracking?.supplements_taken || [];
    const isCurrentlyTaken = currentTaken.includes(supplementName);
    const newTaken = isCurrentlyTaken 
      ? currentTaken.filter(s => s !== supplementName)
      : [...currentTaken, supplementName];
    
    const { error } = await supabase
      .from('vault_supplement_tracking')
      .upsert({
        user_id: user.id,
        entry_date: today,
        supplements_taken: newTaken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,entry_date' });
    
    if (!error) await fetchSupplementTracking();
    return { success: !error };
  }, [user, today, supplementTracking, fetchSupplementTracking]);

  // Fetch favorite meals
  const fetchFavoriteMeals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_favorite_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false });
    setFavoriteMeals((data || []).map(m => ({
      ...m,
      supplements: (m.supplements as string[]) || [],
    })) as VaultFavoriteMeal[]);
  }, [user]);

  // Save meal to favorites
  const saveFavoriteMeal = useCallback(async (meal: Omit<VaultFavoriteMeal, 'id' | 'usage_count' | 'created_at' | 'last_used_at'>) => {
    if (!user) return { success: false };
    const { error } = await supabase.from('vault_favorite_meals').insert({
      user_id: user.id,
      ...meal,
    });
    if (!error) await fetchFavoriteMeals();
    return { success: !error };
  }, [user, fetchFavoriteMeals]);

  // Delete favorite meal
  const deleteFavoriteMeal = useCallback(async (id: string) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('vault_favorite_meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchFavoriteMeals();
    return { success: !error };
  }, [user, fetchFavoriteMeals]);

  // Use favorite meal (increment usage and log)
  const useFavoriteMeal = useCallback(async (favorite: VaultFavoriteMeal) => {
    if (!user) return { success: false };
    
    // Update usage count and last_used_at
    await supabase
      .from('vault_favorite_meals')
      .update({
        usage_count: (favorite.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', favorite.id)
      .eq('user_id', user.id);
    
    // Log the meal
    const result = await saveNutritionLog({
      calories: favorite.calories,
      protein_g: favorite.protein_g,
      carbs_g: favorite.carbs_g,
      fats_g: favorite.fats_g,
      hydration_oz: favorite.hydration_oz,
      energy_level: null,
      digestion_notes: null,
      supplements: favorite.supplements,
      meal_type: favorite.meal_type,
      meal_title: favorite.meal_name,
    });
    
    await fetchFavoriteMeals();
    return result;
  }, [user, saveNutritionLog, fetchFavoriteMeals]);

  // Fetch saved items
  const fetchSavedItems = useCallback(async () => {
    if (!user) return;
    const [{ data: drills }, { data: tips }] = await Promise.all([
      supabase.from('vault_saved_drills').select('*').eq('user_id', user.id).order('saved_at', { ascending: false }),
      supabase.from('vault_saved_tips').select('*').eq('user_id', user.id).order('saved_at', { ascending: false }),
    ]);
    setSavedDrills((drills || []) as VaultSavedDrill[]);
    setSavedTips((tips || []) as VaultSavedTip[]);
  }, [user]);

  const deleteSavedDrill = useCallback(async (id: string) => {
    await supabase.from('vault_saved_drills').delete().eq('id', id);
    await fetchSavedItems();
  }, [fetchSavedItems]);

  const deleteSavedTip = useCallback(async (id: string) => {
    await supabase.from('vault_saved_tips').delete().eq('id', id);
    await fetchSavedItems();
  }, [fetchSavedItems]);

  // Save drill to vault (from analysis)
  const saveDrill = useCallback(async (drill: {
    drill_name: string;
    drill_description: string | null;
    module_origin: string;
    sport: string;
  }) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if already saved (prevent duplicates)
    const existing = savedDrills.find(d => 
      d.drill_name === drill.drill_name && 
      d.module_origin === drill.module_origin &&
      d.sport === drill.sport
    );
    if (existing) return { success: false, error: 'already_saved' };

    const { error } = await supabase.from('vault_saved_drills').insert({
      user_id: user.id,
      ...drill,
    });

    if (error) {
      console.error('Error saving drill:', error);
      return { success: false, error: error.message };
    }

    await fetchSavedItems();
    return { success: true };
  }, [user, savedDrills, fetchSavedItems]);

  // Save tip to vault (from nutrition)
  const saveTip = useCallback(async (tip: {
    tip_text: string;
    tip_category: string | null;
    module_origin: string;
  }) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if already saved (prevent duplicates)
    const existing = savedTips.find(t => 
      t.tip_text === tip.tip_text && 
      t.module_origin === tip.module_origin
    );
    if (existing) return { success: false, error: 'already_saved' };

    const { error } = await supabase.from('vault_saved_tips').insert({
      user_id: user.id,
      ...tip,
    });

    if (error) {
      console.error('Error saving tip:', error);
      return { success: false, error: error.message };
    }

    await fetchSavedItems();
    return { success: true };
  }, [user, savedTips, fetchSavedItems]);

  // Fetch performance tests
  const fetchPerformanceTests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_performance_tests').select('*').eq('user_id', user.id).order('test_date', { ascending: false }).limit(20);
    setPerformanceTests((data || []).map(t => ({ ...t, results: t.results as Record<string, number>, previous_results: t.previous_results as Record<string, number> | null })));
  }, [user]);

  const savePerformanceTest = useCallback(async (
    testType: string, 
    results: Record<string, number>,
    handedness?: { throwing?: string; batting?: string }
  ) => {
    if (!user) return { success: false };
    const lastTest = performanceTests.find(t => t.test_type === testType);
    // Calculate next entry date (6 weeks from now)
    const nextEntryDate = new Date();
    nextEntryDate.setDate(nextEntryDate.getDate() + 42); // 6 weeks = 42 days
    
    // Include handedness metadata in results if provided
    const enhancedResults = {
      ...results,
      ...(handedness?.throwing ? { _throwing_hand: handedness.throwing } : {}),
      ...(handedness?.batting ? { _batting_side: handedness.batting } : {}),
    };
    
    const { error } = await supabase.from('vault_performance_tests').insert({
      user_id: user.id, test_type: testType, sport: 'baseball', module: testType, 
      results: enhancedResults, previous_results: lastTest?.results || null,
      next_entry_date: nextEntryDate.toISOString().split('T')[0],
    });
    if (!error) await fetchPerformanceTests();
    return { success: !error };
  }, [user, performanceTests, fetchPerformanceTests]);

  // Fetch progress photos
  const fetchProgressPhotos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_progress_photos').select('*').eq('user_id', user.id).order('photo_date', { ascending: false }).limit(20);
    setProgressPhotos((data || []).map(p => ({ ...p, photo_urls: (p.photo_urls as string[]) || [] })));
  }, [user]);

  const saveProgressPhoto = useCallback(async (photoData: { photos: File[]; weight_lbs: number | null; body_fat_percent: number | null; arm_measurement: number | null; chest_measurement: number | null; waist_measurement: number | null; leg_measurement: number | null; notes: string | null; }) => {
    if (!user) return { success: false };
    const photoUrls: string[] = [];
    for (const file of photoData.photos) {
      const path = `${user.id}/progress/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('vault-photos').upload(path, file);
      if (!error) photoUrls.push(path);
    }
    // Calculate next entry date (6 weeks from now)
    const nextEntryDate = new Date();
    nextEntryDate.setDate(nextEntryDate.getDate() + 42); // 6 weeks = 42 days
    
    const { error } = await supabase.from('vault_progress_photos').insert({
      user_id: user.id, photo_urls: photoUrls, weight_lbs: photoData.weight_lbs, body_fat_percent: photoData.body_fat_percent,
      arm_measurement: photoData.arm_measurement, chest_measurement: photoData.chest_measurement, waist_measurement: photoData.waist_measurement,
      leg_measurement: photoData.leg_measurement, notes: photoData.notes,
      next_entry_date: nextEntryDate.toISOString().split('T')[0],
    });
    if (!error) await fetchProgressPhotos();
    return { success: !error };
  }, [user, fetchProgressPhotos]);

  // Fetch scout grades (hitting/throwing)
  const fetchScoutGrades = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_scout_grades')
      .select('*')
      .eq('user_id', user.id)
      .eq('grade_type', 'hitting_throwing')
      .order('graded_at', { ascending: false })
      .limit(10);
    setScoutGrades((data || []).map(g => ({ ...g, grade_type: g.grade_type || 'hitting_throwing' })) as VaultScoutGrade[]);
  }, [user]);

  // Fetch pitching grades
  const fetchPitchingGrades = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_scout_grades')
      .select('*')
      .eq('user_id', user.id)
      .eq('grade_type', 'pitching')
      .order('graded_at', { ascending: false })
      .limit(10);
    setPitchingGrades((data || []).map(g => ({ ...g, grade_type: 'pitching' as const })) as VaultScoutGrade[]);
  }, [user]);

  const saveScoutGrade = useCallback(async (gradeData: {
    grade_type: 'hitting_throwing' | 'pitching';
    hitting_grade?: number | null;
    power_grade?: number | null;
    speed_grade?: number | null;
    defense_grade?: number | null;
    throwing_grade?: number | null;
    leadership_grade?: number | null;
    self_efficacy_grade?: number | null;
    fastball_grade?: number | null;
    offspeed_grade?: number | null;
    breaking_ball_grade?: number | null;
    control_grade?: number | null;
    delivery_grade?: number | null;
    rise_ball_grade?: number | null;
    notes: string | null;
  }) => {
    if (!user) return { success: false };
    // Calculate next entry date (12 weeks from now)
    const nextPrompt = new Date();
    nextPrompt.setDate(nextPrompt.getDate() + 84); // 12 weeks = 84 days

    const { error } = await supabase.from('vault_scout_grades').insert({
      user_id: user.id,
      ...gradeData,
      next_prompt_date: nextPrompt.toISOString(),
    });
    
    if (!error) {
      if (gradeData.grade_type === 'pitching') {
        await fetchPitchingGrades();
      } else {
        await fetchScoutGrades();
      }
    }
    return { success: !error };
  }, [user, fetchScoutGrades, fetchPitchingGrades]);

  // Fetch recaps
  const fetchRecaps = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_recaps').select('*').eq('user_id', user.id).order('generated_at', { ascending: false }).limit(10);
    setRecaps((data || []).map(r => ({ ...r, recap_data: r.recap_data as Record<string, unknown> })));
  }, [user]);

  const generateRecap = useCallback(async (periodEnd?: Date) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const body = periodEnd ? { periodEnd: periodEnd.toISOString() } : undefined;
      const { data, error } = await supabase.functions.invoke('generate-vault-recap', {
        body,
      });
      
      if (error) {
        console.error('Error generating recap:', error);
        return { success: false, error: error.message };
      }
      
      // After successful recap generation, set unlocked_progress_reports_at to unlock 6-week tracking cards
      if (data?.recap?.id) {
        await supabase
          .from('vault_recaps')
          .update({ unlocked_progress_reports_at: new Date().toISOString() })
          .eq('id', data.recap.id)
          .eq('user_id', user.id);
      }
      
      await fetchRecaps();
      return { success: true, data };
    } catch (err) {
      console.error('Error calling recap function:', err);
      return { success: false, error: 'Failed to generate recap' };
    }
  }, [user, fetchRecaps]);

  // Save recap to library
  const saveRecapToLibrary = useCallback(async (recapId: string) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('vault_recaps')
      .update({ saved_to_library: true })
      .eq('id', recapId)
      .eq('user_id', user.id);
    if (!error) await fetchRecaps();
    return { success: !error };
  }, [user, fetchRecaps]);

  // Delete recap
  const deleteRecap = useCallback(async (recapId: string) => {
    if (!user) return { success: false };
    const { error } = await supabase
      .from('vault_recaps')
      .delete()
      .eq('id', recapId)
      .eq('user_id', user.id);
    if (!error) await fetchRecaps();
    return { success: !error };
  }, [user, fetchRecaps]);


  // Fetch history for date - includes all vault data types and custom activities
  const fetchHistoryForDate = useCallback(async (date: string) => {
    if (!user) return { 
      date, quizzes: [], notes: [], workouts: [], nutritionLogged: false,
      performanceTests: [], progressPhotos: [], scoutGrades: [], nutritionLog: null,
      customActivities: []
    };
    
    const [
      { data: quizzes }, 
      { data: notes }, 
      { data: workouts }, 
      { data: nutrition },
      { data: perfTests },
      { data: photos },
      { data: grades },
      { data: customActivities }
    ] = await Promise.all([
      supabase.from('vault_focus_quizzes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_free_notes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_workout_notes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_nutrition_logs').select('*').eq('user_id', user.id).eq('entry_date', date).maybeSingle(),
      supabase.from('vault_performance_tests').select('*').eq('user_id', user.id).eq('test_date', date),
      supabase.from('vault_progress_photos').select('*').eq('user_id', user.id).eq('photo_date', date),
      supabase.from('vault_scout_grades').select('*').eq('user_id', user.id).gte('graded_at', `${date}T00:00:00`).lt('graded_at', `${date}T23:59:59`),
      supabase.from('custom_activity_logs').select(`
        *, 
        template:custom_activity_templates (
          id, title, activity_type, icon, color, description,
          exercises, meals, custom_fields, duration_minutes, intensity,
          intervals, distance_value, distance_unit, pace_value
        )
      `).eq('user_id', user.id).eq('entry_date', date).eq('completed', true),
    ]);
    
    return {
      date,
      quizzes: (quizzes || []) as VaultFocusQuiz[],
      notes: (notes || []) as VaultFreeNote[],
      workouts: (workouts || []).map(w => ({ ...w, weight_increases: (w.weight_increases || []) as unknown as WeightIncrease[] })) as VaultWorkoutNote[],
      nutritionLogged: !!nutrition,
      nutritionLog: nutrition ? { ...nutrition, supplements: (nutrition.supplements as string[]) || [] } as VaultNutritionLog : null,
      performanceTests: (perfTests || []).map(t => ({ ...t, results: t.results as Record<string, number>, previous_results: t.previous_results as Record<string, number> | null })) as VaultPerformanceTest[],
      progressPhotos: (photos || []).map(p => ({ ...p, photo_urls: (p.photo_urls as string[]) || [] })) as VaultProgressPhoto[],
      scoutGrades: (grades || []) as VaultScoutGrade[],
      customActivities: (customActivities || []) as any[],
    };
  }, [user]);

  // Populate entriesWithData for calendar highlighting
  const fetchEntriesWithData = useCallback(async () => {
    if (!user) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const [
      { data: quizDates },
      { data: noteDates },
      { data: workoutDates },
      { data: nutritionDates },
      { data: perfDates },
      { data: photoDates },
      { data: gradeDates }
    ] = await Promise.all([
      supabase.from('vault_focus_quizzes').select('entry_date').eq('user_id', user.id).gte('entry_date', startDate),
      supabase.from('vault_free_notes').select('entry_date').eq('user_id', user.id).gte('entry_date', startDate),
      supabase.from('vault_workout_notes').select('entry_date').eq('user_id', user.id).gte('entry_date', startDate),
      supabase.from('vault_nutrition_logs').select('entry_date').eq('user_id', user.id).gte('entry_date', startDate),
      supabase.from('vault_performance_tests').select('test_date').eq('user_id', user.id).gte('test_date', startDate),
      supabase.from('vault_progress_photos').select('photo_date').eq('user_id', user.id).gte('photo_date', startDate),
      supabase.from('vault_scout_grades').select('graded_at').eq('user_id', user.id).gte('graded_at', startDate),
    ]);
    
    const allDates = new Set<string>();
    quizDates?.forEach(q => allDates.add(q.entry_date));
    noteDates?.forEach(n => allDates.add(n.entry_date));
    workoutDates?.forEach(w => allDates.add(w.entry_date));
    nutritionDates?.forEach(n => allDates.add(n.entry_date));
    perfDates?.forEach(p => allDates.add(p.test_date));
    photoDates?.forEach(p => allDates.add(p.photo_date));
    gradeDates?.forEach(g => allDates.add(g.graded_at?.split('T')[0] || ''));
    
    setEntriesWithData(Array.from(allDates).filter(d => d));
  }, [user]);

  // Delete functions for history entries
  const deleteQuiz = useCallback(async (id: string) => {
    await supabase.from('vault_focus_quizzes').delete().eq('id', id);
    await fetchTodaysQuizzes();
    await fetchEntriesWithData();
  }, [fetchTodaysQuizzes, fetchEntriesWithData]);

  const deleteFreeNote = useCallback(async (id: string) => {
    await supabase.from('vault_free_notes').delete().eq('id', id);
    await fetchTodaysNotes();
    await fetchEntriesWithData();
  }, [fetchTodaysNotes, fetchEntriesWithData]);

  const deleteWorkoutNote = useCallback(async (id: string) => {
    await supabase.from('vault_workout_notes').delete().eq('id', id);
    await fetchWorkoutNotes();
    await fetchEntriesWithData();
  }, [fetchWorkoutNotes, fetchEntriesWithData]);

  // deleteNutritionLog is already defined above

  const deletePerformanceTest = useCallback(async (id: string) => {
    await supabase.from('vault_performance_tests').delete().eq('id', id);
    await fetchPerformanceTests();
    await fetchEntriesWithData();
  }, [fetchPerformanceTests, fetchEntriesWithData]);

  const deleteProgressPhoto = useCallback(async (id: string) => {
    await supabase.from('vault_progress_photos').delete().eq('id', id);
    await fetchProgressPhotos();
    await fetchEntriesWithData();
  }, [fetchProgressPhotos, fetchEntriesWithData]);

  const deleteScoutGrade = useCallback(async (id: string) => {
    await supabase.from('vault_scout_grades').delete().eq('id', id);
    await fetchScoutGrades();
    await fetchEntriesWithData();
  }, [fetchScoutGrades, fetchEntriesWithData]);

  // Fetch weekly data for summary
  const fetchWeeklyData = useCallback(async (weekStartStr: string) => {
    if (!user) return {
      weekStart: weekStartStr,
      weekEnd: weekStartStr,
      quizzes: [],
      workouts: [],
      nutrition: [],
      performanceTests: [],
      totalWorkouts: 0,
      totalWeightLifted: 0,
      avgEnergy: 0,
      avgMental: 0,
      avgEmotional: 0,
      avgPhysical: 0,
      dailyData: [],
    };

    const weekStart = new Date(weekStartStr);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [
      { data: quizzes },
      { data: workouts },
      { data: nutrition },
      { data: perfTests }
    ] = await Promise.all([
      supabase.from('vault_focus_quizzes').select('*').eq('user_id', user.id)
        .gte('entry_date', weekStartStr).lte('entry_date', weekEndStr),
      supabase.from('vault_workout_notes').select('*').eq('user_id', user.id)
        .gte('entry_date', weekStartStr).lte('entry_date', weekEndStr),
      supabase.from('vault_nutrition_logs').select('*').eq('user_id', user.id)
        .gte('entry_date', weekStartStr).lte('entry_date', weekEndStr),
      supabase.from('vault_performance_tests').select('*').eq('user_id', user.id)
        .gte('test_date', weekStartStr).lte('test_date', weekEndStr),
    ]);

    const totalWorkouts = workouts?.length || 0;
    const totalWeightLifted = workouts?.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0) || 0;
    
    const energyValues = nutrition?.filter(n => n.energy_level).map(n => n.energy_level!) || [];
    const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 0;
    
    const mentalValues = quizzes?.filter(q => q.mental_readiness).map(q => q.mental_readiness) || [];
    const emotionalValues = quizzes?.filter(q => q.emotional_state).map(q => q.emotional_state) || [];
    const physicalValues = quizzes?.filter(q => q.physical_readiness).map(q => q.physical_readiness) || [];
    
    const avgMental = mentalValues.length > 0 ? mentalValues.reduce((a, b) => a + b, 0) / mentalValues.length : 0;
    const avgEmotional = emotionalValues.length > 0 ? emotionalValues.reduce((a, b) => a + b, 0) / emotionalValues.length : 0;
    const avgPhysical = physicalValues.length > 0 ? physicalValues.reduce((a, b) => a + b, 0) / physicalValues.length : 0;

    // Build daily data with sleep data from morning quizzes
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayQuizzes = quizzes?.filter(q => q.entry_date === dateStr) || [];
      const dayWorkouts = workouts?.filter(w => w.entry_date === dateStr) || [];
      const dayNutrition = nutrition?.filter(n => n.entry_date === dateStr) || [];
      
      // Get morning quiz for sleep data
      const morningQuiz = dayQuizzes.find(q => q.quiz_type === 'morning');
      
      const avgDayMental = dayQuizzes.length > 0 
        ? dayQuizzes.reduce((sum, q) => sum + q.mental_readiness, 0) / dayQuizzes.length 
        : null;
      const avgDayEmotional = dayQuizzes.length > 0 
        ? dayQuizzes.reduce((sum, q) => sum + q.emotional_state, 0) / dayQuizzes.length 
        : null;
      const avgDayPhysical = dayQuizzes.length > 0 
        ? dayQuizzes.reduce((sum, q) => sum + q.physical_readiness, 0) / dayQuizzes.length 
        : null;
      
      const dayWeight = dayWorkouts.reduce((sum, w) => sum + (w.total_weight_lifted || 0), 0);
      const dayEnergy = dayNutrition.length > 0 && dayNutrition[0].energy_level 
        ? dayNutrition[0].energy_level 
        : null;
      
      return {
        day: dateStr,
        dayShort: format(day, 'EEE'),
        mental: avgDayMental,
        emotional: avgDayEmotional,
        physical: avgDayPhysical,
        weight: dayWeight,
        energy: dayEnergy,
        hasEntry: dayQuizzes.length > 0 || dayWorkouts.length > 0 || dayNutrition.length > 0,
        hoursSlept: morningQuiz?.hours_slept || null,
        sleepQuality: morningQuiz?.sleep_quality || null,
      };
    });

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      quizzes: quizzes || [],
      workouts: workouts || [],
      nutrition: nutrition || [],
      performanceTests: perfTests || [],
      totalWorkouts,
      totalWeightLifted,
      avgEnergy,
      avgMental,
      avgEmotional,
      avgPhysical,
      dailyData,
    };
  }, [user]);

  // Fetch weekly nutrition data for summary
  const fetchWeeklyNutrition = useCallback(async (weekStartStr: string) => {
    const defaultData = {
      weekStart: weekStartStr,
      weekEnd: weekStartStr,
      dailyData: [],
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFats: 0,
      avgHydration: 0,
      daysLogged: 0,
      totalMeals: 0,
    };

    if (!user) return defaultData;

    const weekStart = new Date(weekStartStr);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const { data: logs } = await supabase
      .from('vault_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', weekStartStr)
      .lte('entry_date', weekEndStr)
      .order('entry_date');

    if (!logs || logs.length === 0) return defaultData;

    // Build daily data
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.entry_date === dateStr);
      
      const totalCalories = dayLogs.reduce((sum, l) => sum + (l.calories || 0), 0);
      const totalProtein = dayLogs.reduce((sum, l) => sum + (Number(l.protein_g) || 0), 0);
      const totalCarbs = dayLogs.reduce((sum, l) => sum + (Number(l.carbs_g) || 0), 0);
      const totalFats = dayLogs.reduce((sum, l) => sum + (Number(l.fats_g) || 0), 0);
      const totalHydration = dayLogs.reduce((sum, l) => sum + (Number(l.hydration_oz) || 0), 0);
      
      return {
        day: dateStr,
        dayShort: format(day, 'EEE'),
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        hydration: totalHydration,
        hasMeals: dayLogs.length > 0,
        mealCount: dayLogs.length,
      };
    });

    // Calculate averages (only from days with data)
    const daysWithData = dailyData.filter(d => d.hasMeals);
    const daysLogged = daysWithData.length;
    const totalMeals = logs.length;

    const avgCalories = daysLogged > 0 ? daysWithData.reduce((sum, d) => sum + d.calories, 0) / daysLogged : 0;
    const avgProtein = daysLogged > 0 ? daysWithData.reduce((sum, d) => sum + d.protein, 0) / daysLogged : 0;
    const avgCarbs = daysLogged > 0 ? daysWithData.reduce((sum, d) => sum + d.carbs, 0) / daysLogged : 0;
    const avgFats = daysLogged > 0 ? daysWithData.reduce((sum, d) => sum + d.fats, 0) / daysLogged : 0;
    const avgHydration = daysLogged > 0 ? daysWithData.reduce((sum, d) => sum + d.hydration, 0) / daysLogged : 0;

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      dailyData,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      avgHydration,
      daysLogged,
      totalMeals,
    };
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      await Promise.all([
        fetchStreak(), fetchTodaysQuizzes(), fetchTodaysNotes(), fetchWorkoutNotes(),
        fetchNutritionLogs(), fetchNutritionGoals(), fetchSupplementTracking(), fetchSavedItems(), fetchPerformanceTests(), fetchProgressPhotos(), fetchScoutGrades(), fetchPitchingGrades(), fetchRecaps(),
        fetchEntriesWithData(), fetchFavoriteMeals(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [user, fetchStreak, fetchTodaysQuizzes, fetchTodaysNotes, fetchWorkoutNotes, fetchNutritionLogs, fetchNutritionGoals, fetchSupplementTracking, fetchSavedItems, fetchPerformanceTests, fetchProgressPhotos, fetchScoutGrades, fetchPitchingGrades, fetchRecaps, fetchEntriesWithData, fetchFavoriteMeals]);

  return {
    loading, streak, todaysQuizzes, todaysNotes, workoutNotes, nutritionLogs, nutritionGoals, supplementTracking, savedDrills, savedTips, performanceTests, progressPhotos, scoutGrades, pitchingGrades, recaps, entriesWithData, favoriteMeals,
    saveFocusQuiz, saveFreeNote, saveWorkoutNote, updateStreak, checkVaultAccess, fetchWorkoutNotes,
    saveNutritionLog, saveNutritionGoals, toggleSupplementTaken, deleteSavedDrill, deleteSavedTip, saveDrill, saveTip, savePerformanceTest, saveProgressPhoto, saveScoutGrade, generateRecap, fetchHistoryForDate,
    deleteQuiz, deleteFreeNote, deleteWorkoutNote, deleteNutritionLog, deletePerformanceTest, deleteProgressPhoto, deleteScoutGrade,
    fetchWeeklyData, fetchWeeklyNutrition, fetchEntriesWithData, fetchSavedItems,
    saveFavoriteMeal, deleteFavoriteMeal, useFavoriteMeal,
    saveRecapToLibrary, deleteRecap,
  };
}
