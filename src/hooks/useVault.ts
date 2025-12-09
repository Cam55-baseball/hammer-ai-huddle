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
}

export interface VaultScoutGrade {
  id: string;
  graded_at: string;
  next_prompt_date: string | null;
  hitting_grade: number | null;
  power_grade: number | null;
  speed_grade: number | null;
  defense_grade: number | null;
  throwing_grade: number | null;
  leadership_grade: number | null;
  self_efficacy_grade: number | null;
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

export function useVault() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<VaultStreak | null>(null);
  const [todaysQuizzes, setTodaysQuizzes] = useState<VaultFocusQuiz[]>([]);
  const [todaysNotes, setTodaysNotes] = useState<VaultFreeNote | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState<VaultWorkoutNote[]>([]);
  const [nutritionLog, setNutritionLog] = useState<VaultNutritionLog | null>(null);
  const [savedDrills, setSavedDrills] = useState<VaultSavedDrill[]>([]);
  const [savedTips, setSavedTips] = useState<VaultSavedTip[]>([]);
  const [performanceTests, setPerformanceTests] = useState<VaultPerformanceTest[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<VaultProgressPhoto[]>([]);
  const [scoutGrades, setScoutGrades] = useState<VaultScoutGrade[]>([]);
  const [recaps, setRecaps] = useState<VaultRecap[]>([]);
  const [entriesWithData, setEntriesWithData] = useState<string[]>([]);

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

  // Fetch today's free notes
  const fetchTodaysNotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vault_free_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

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
        .maybeSingle();

      if (error || !data) return false;

      const modules = data.subscribed_modules || [];
      return modules.length > 0;
    } catch {
      return false;
    }
  }, [user]);

  // Fetch nutrition log
  const fetchNutritionLog = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vault_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .maybeSingle();
    if (data) setNutritionLog({ ...data, supplements: (data.supplements as string[]) || [] });
  }, [user, today]);

  // Save nutrition log
  const saveNutritionLog = useCallback(async (logData: Omit<VaultNutritionLog, 'id'>) => {
    if (!user) return { success: false };
    const { error } = await supabase.from('vault_nutrition_logs').upsert({
      user_id: user.id, entry_date: today, ...logData,
    }, { onConflict: 'user_id,entry_date' });
    if (!error) { await updateStreak(); await fetchNutritionLog(); }
    return { success: !error };
  }, [user, today, updateStreak, fetchNutritionLog]);

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

  // Fetch performance tests
  const fetchPerformanceTests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_performance_tests').select('*').eq('user_id', user.id).order('test_date', { ascending: false }).limit(20);
    setPerformanceTests((data || []).map(t => ({ ...t, results: t.results as Record<string, number>, previous_results: t.previous_results as Record<string, number> | null })));
  }, [user]);

  const savePerformanceTest = useCallback(async (testType: string, results: Record<string, number>) => {
    if (!user) return { success: false };
    const lastTest = performanceTests.find(t => t.test_type === testType);
    const { error } = await supabase.from('vault_performance_tests').insert({
      user_id: user.id, test_type: testType, sport: 'baseball', module: testType, results, previous_results: lastTest?.results || null,
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
    const { error } = await supabase.from('vault_progress_photos').insert({
      user_id: user.id, photo_urls: photoUrls, weight_lbs: photoData.weight_lbs, body_fat_percent: photoData.body_fat_percent,
      arm_measurement: photoData.arm_measurement, chest_measurement: photoData.chest_measurement, waist_measurement: photoData.waist_measurement,
      leg_measurement: photoData.leg_measurement, notes: photoData.notes,
    });
    if (!error) await fetchProgressPhotos();
    return { success: !error };
  }, [user, fetchProgressPhotos]);

  // Fetch scout grades
  const fetchScoutGrades = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_scout_grades').select('*').eq('user_id', user.id).order('graded_at', { ascending: false }).limit(10);
    setScoutGrades((data || []) as VaultScoutGrade[]);
  }, [user]);

  const saveScoutGrade = useCallback(async (gradeData: { hitting_grade: number | null; power_grade: number | null; speed_grade: number | null; defense_grade: number | null; throwing_grade: number | null; leadership_grade: number | null; self_efficacy_grade: number | null; notes: string | null; }) => {
    if (!user) return { success: false };
    const nextPrompt = new Date(); nextPrompt.setDate(nextPrompt.getDate() + 14);
    const { error } = await supabase.from('vault_scout_grades').insert({
      user_id: user.id, ...gradeData, next_prompt_date: nextPrompt.toISOString(),
    });
    if (!error) await fetchScoutGrades();
    return { success: !error };
  }, [user, fetchScoutGrades]);

  // Fetch recaps
  const fetchRecaps = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_recaps').select('*').eq('user_id', user.id).order('generated_at', { ascending: false }).limit(10);
    setRecaps((data || []).map(r => ({ ...r, recap_data: r.recap_data as Record<string, unknown> })));
  }, [user]);

  const generateRecap = useCallback(async () => {
    if (!user) return { success: false };
    const endDate = new Date(); const startDate = new Date(); startDate.setDate(startDate.getDate() - 42);
    const { error } = await supabase.from('vault_recaps').insert({
      user_id: user.id, recap_period_start: startDate.toISOString().split('T')[0], recap_period_end: endDate.toISOString().split('T')[0],
      recap_data: { summary: 'Your 6-week training recap', highlights: ['Consistent training'], focus_areas: ['Continue progressing'] },
    });
    if (!error) await fetchRecaps();
    return { success: !error };
  }, [user, fetchRecaps]);

  // Fetch history for date
  const fetchHistoryForDate = useCallback(async (date: string) => {
    if (!user) return { date, quizzes: [], notes: [], workouts: [], nutritionLogged: false };
    const [{ data: quizzes }, { data: notes }, { data: workouts }, { data: nutrition }] = await Promise.all([
      supabase.from('vault_focus_quizzes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_free_notes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_workout_notes').select('*').eq('user_id', user.id).eq('entry_date', date),
      supabase.from('vault_nutrition_logs').select('id').eq('user_id', user.id).eq('entry_date', date).maybeSingle(),
    ]);
    return {
      date,
      quizzes: (quizzes || []) as VaultFocusQuiz[],
      notes: (notes || []) as VaultFreeNote[],
      workouts: (workouts || []).map(w => ({ ...w, weight_increases: (w.weight_increases || []) as unknown as WeightIncrease[] })) as VaultWorkoutNote[],
      nutritionLogged: !!nutrition,
    };
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      await Promise.all([
        fetchStreak(), fetchTodaysQuizzes(), fetchTodaysNotes(), fetchWorkoutNotes(),
        fetchNutritionLog(), fetchSavedItems(), fetchPerformanceTests(), fetchProgressPhotos(), fetchScoutGrades(), fetchRecaps(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [user, fetchStreak, fetchTodaysQuizzes, fetchTodaysNotes, fetchWorkoutNotes, fetchNutritionLog, fetchSavedItems, fetchPerformanceTests, fetchProgressPhotos, fetchScoutGrades, fetchRecaps]);

  return {
    loading, streak, todaysQuizzes, todaysNotes, workoutNotes, nutritionLog, savedDrills, savedTips, performanceTests, progressPhotos, scoutGrades, recaps, entriesWithData,
    saveFocusQuiz, saveFreeNote, saveWorkoutNote, updateStreak, checkVaultAccess, fetchWorkoutNotes,
    saveNutritionLog, deleteSavedDrill, deleteSavedTip, savePerformanceTest, saveProgressPhoto, saveScoutGrade, generateRecap, fetchHistoryForDate,
  };
}
