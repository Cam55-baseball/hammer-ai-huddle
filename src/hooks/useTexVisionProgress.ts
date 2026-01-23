import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TexVisionTier = 'beginner' | 'advanced' | 'chaos';

export interface TexVisionProgressData {
  id: string;
  user_id: string;
  sport: string;
  current_tier: TexVisionTier;
  total_sessions_completed: number;
  streak_current: number;
  streak_longest: number;
  last_session_date: string | null;
}

export interface TexVisionDailyChecklist {
  id: string;
  user_id: string;
  entry_date: string;
  checklist_items: Record<string, boolean>;
  all_complete: boolean;
  completed_at: string | null;
}

export interface TexVisionMetrics {
  id: string;
  user_id: string;
  sport: string;
  neuro_reaction_index: number | null;
  visual_processing_speed: number | null;
  anticipation_quotient: number | null;
  coordination_efficiency: number | null;
  stress_resilience_score: number | null;
  left_right_bias: number | null;
  early_late_bias: number | null;
}

export const useTexVisionProgress = (sport: string = 'baseball') => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<TexVisionProgressData | null>(null);
  const [dailyChecklist, setDailyChecklist] = useState<TexVisionDailyChecklist | null>(null);
  const [metrics, setMetrics] = useState<TexVisionMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch progress, checklist, and metrics in parallel
      const [progressResult, checklistResult, metricsResult] = await Promise.all([
        supabase
          .from('tex_vision_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .maybeSingle(),
        supabase
          .from('tex_vision_daily_checklist')
          .select('*')
          .eq('user_id', user.id)
          .eq('entry_date', today)
          .maybeSingle(),
        supabase
          .from('tex_vision_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .maybeSingle(),
      ]);

      if (progressResult.data) {
        setProgress(progressResult.data as TexVisionProgressData);
      }

      if (checklistResult.data) {
        setDailyChecklist(checklistResult.data as TexVisionDailyChecklist);
      }

      if (metricsResult.data) {
        setMetrics(metricsResult.data as TexVisionMetrics);
      }
    } catch (error) {
      console.error('Error fetching Tex Vision progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const initializeProgress = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tex_vision_progress')
        .insert({
          user_id: user.id,
          sport,
          current_tier: 'beginner',
          total_sessions_completed: 0,
          streak_current: 0,
          streak_longest: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setProgress(data as TexVisionProgressData);
      return data;
    } catch (error) {
      console.error('Error initializing Tex Vision progress:', error);
      return null;
    }
  }, [user, sport]);

  const updateChecklist = useCallback(async (drillId: string, completed: boolean) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const currentItems = dailyChecklist?.checklist_items || {};
    const updatedItems = { ...currentItems, [drillId]: completed };
    
    // Check if all items are complete (need at least 2 drills)
    const completedCount = Object.values(updatedItems).filter(Boolean).length;
    const allComplete = completedCount >= 2;

    try {
      const { data, error } = await supabase
        .from('tex_vision_daily_checklist')
        .upsert({
          user_id: user.id,
          entry_date: today,
          checklist_items: updatedItems,
          all_complete: allComplete,
          completed_at: allComplete ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,entry_date',
        })
        .select()
        .single();

      if (error) throw error;
      setDailyChecklist(data as TexVisionDailyChecklist);
      return data;
    } catch (error) {
      console.error('Error updating Tex Vision checklist:', error);
      return null;
    }
  }, [user, dailyChecklist]);

  const updateStreak = useCallback(async () => {
    if (!user || !progress) return;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = progress.last_session_date;
    
    let newStreak = 1;
    if (lastDate) {
      const lastSessionDate = new Date(lastDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = progress.streak_current + 1;
      } else if (diffDays === 0) {
        newStreak = progress.streak_current;
      }
    }

    const newLongest = Math.max(newStreak, progress.streak_longest);

    try {
      const { data, error } = await supabase
        .from('tex_vision_progress')
        .update({
          streak_current: newStreak,
          streak_longest: newLongest,
          last_session_date: today,
          total_sessions_completed: progress.total_sessions_completed + 1,
        })
        .eq('id', progress.id)
        .select()
        .single();

      if (error) throw error;
      setProgress(data as TexVisionProgressData);
      return data;
    } catch (error) {
      console.error('Error updating Tex Vision streak:', error);
      return null;
    }
  }, [user, progress]);

  // Check and update tier progression based on drill performance
  const checkAndUpdateTierProgression = useCallback(async (): Promise<TexVisionTier | null> => {
    if (!user) return null;

    // Safeguard: fetch progress if not loaded to prevent race conditions
    let currentProgress = progress;
    if (!currentProgress) {
      const { data } = await supabase
        .from('tex_vision_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .maybeSingle();
      currentProgress = data as TexVisionProgressData | null;
      if (!currentProgress) return null;
    }

    try {
      // Fetch all drill results for the user
      const { data: results, error } = await supabase
        .from('tex_vision_drill_results')
        .select('tier, accuracy_percent')
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate stats per tier
      const tierStats: Record<string, { count: number; totalAccuracy: number }> = {
        beginner: { count: 0, totalAccuracy: 0 },
        advanced: { count: 0, totalAccuracy: 0 },
        chaos: { count: 0, totalAccuracy: 0 },
      };

      results?.forEach((r) => {
        if (r.tier in tierStats && r.accuracy_percent !== null) {
          tierStats[r.tier].count++;
          tierStats[r.tier].totalAccuracy += r.accuracy_percent;
        }
      });

      // Check progression based on current tier
      let newTier: TexVisionTier = currentProgress.current_tier;

      if (currentProgress.current_tier === 'beginner') {
        const beginner = tierStats.beginner;
        const avgAccuracy = beginner.count > 0 ? beginner.totalAccuracy / beginner.count : 0;
        // Unlock Advanced: 10+ beginner drills at 70%+ average accuracy
        if (beginner.count >= 10 && avgAccuracy >= 70) {
          newTier = 'advanced';
        }
      } else if (currentProgress.current_tier === 'advanced') {
        const advanced = tierStats.advanced;
        const avgAccuracy = advanced.count > 0 ? advanced.totalAccuracy / advanced.count : 0;
        // Unlock Chaos: 10+ advanced drills at 80%+ average accuracy
        if (advanced.count >= 10 && avgAccuracy >= 80) {
          newTier = 'chaos';
        }
      }

      // Update if tier changed
      if (newTier !== currentProgress.current_tier) {
        const { data, error: updateError } = await supabase
          .from('tex_vision_progress')
          .update({ current_tier: newTier })
          .eq('id', currentProgress.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setProgress(data as TexVisionProgressData);
        return newTier;
      }

      return null;
    } catch (error) {
      console.error('Error checking tier progression:', error);
      return null;
    }
  }, [user, progress, sport]);

  // Get tier progression stats for UI display
  const getTierProgressionStats = useCallback(async () => {
    if (!user || !progress) return null;

    try {
      const { data: results, error } = await supabase
        .from('tex_vision_drill_results')
        .select('tier, accuracy_percent')
        .eq('user_id', user.id);

      if (error) throw error;

      const tierStats: Record<string, { count: number; avgAccuracy: number }> = {
        beginner: { count: 0, avgAccuracy: 0 },
        advanced: { count: 0, avgAccuracy: 0 },
        chaos: { count: 0, avgAccuracy: 0 },
      };

      const tempTotals: Record<string, number> = { beginner: 0, advanced: 0, chaos: 0 };

      results?.forEach((r) => {
        if (r.tier in tierStats && r.accuracy_percent !== null) {
          tierStats[r.tier].count++;
          tempTotals[r.tier] += r.accuracy_percent;
        }
      });

      // Calculate averages
      Object.keys(tierStats).forEach((tier) => {
        if (tierStats[tier].count > 0) {
          tierStats[tier].avgAccuracy = tempTotals[tier] / tierStats[tier].count;
        }
      });

      return tierStats;
    } catch (error) {
      console.error('Error fetching tier progression stats:', error);
      return null;
    }
  }, [user, progress]);

  return {
    progress,
    dailyChecklist,
    metrics,
    loading,
    refetch: fetchProgress,
    initializeProgress,
    updateChecklist,
    updateStreak,
    checkAndUpdateTierProgression,
    getTierProgressionStats,
  };
};
