import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdaptiveDifficultyData {
  id: string;
  user_id: string;
  sport: string;
  drill_type: string;
  current_difficulty: number;
  accuracy_history: number[];
  speed_history: number[];
  recommended_adjustment: 'increase' | 'decrease' | 'stable' | null;
  updated_at: string | null;
}

export interface TierUnlockStatus {
  advanced_unlocked: boolean;
  chaos_unlocked: boolean;
  advanced_unlocked_at: string | null;
  chaos_unlocked_at: string | null;
  sessions_until_advanced: number;
  sessions_until_chaos: number;
}

const DRILL_TYPES = [
  'soft_focus',
  'pattern_search',
  'peripheral_vision',
  'convergence_divergence',
  'near_far_sight',
  'follow_target',
  'whack_a_mole',
  'meter_timing',
  'brock_string',
];

// Unlock requirements
const ADVANCED_TIER_REQUIREMENTS = {
  sessions: 10,
  min_accuracy: 75,
};

const CHAOS_TIER_REQUIREMENTS = {
  advanced_sessions: 20,
  min_accuracy: 80,
};

export const useAdaptiveDifficulty = (sport: string = 'baseball') => {
  const { user } = useAuth();
  const [difficulties, setDifficulties] = useState<Record<string, AdaptiveDifficultyData>>({});
  const [tierStatus, setTierStatus] = useState<TierUnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all difficulty settings for user
  const fetchDifficulties = useCallback(async () => {
    if (!user) return {};

    try {
      const { data, error } = await supabase
        .from('tex_vision_adaptive_difficulty')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport);

      if (error) throw error;

      const difficultyMap: Record<string, AdaptiveDifficultyData> = {};
      (data || []).forEach(d => {
        difficultyMap[d.drill_type] = {
          ...d,
          accuracy_history: (d.accuracy_history as number[]) || [],
          speed_history: (d.speed_history as number[]) || [],
          recommended_adjustment: d.recommended_adjustment as 'increase' | 'decrease' | 'stable' | null,
        };
      });

      setDifficulties(difficultyMap);
      return difficultyMap;
    } catch (error) {
      console.error('Error fetching difficulty settings:', error);
      return {};
    }
  }, [user, sport]);

  // Get current difficulty for a drill (1-10 scale)
  const getCurrentDifficulty = useCallback((drillType: string): number => {
    return difficulties[drillType]?.current_difficulty ?? 1;
  }, [difficulties]);

  // Update difficulty after a session
  const updateDifficulty = useCallback(async (
    drillType: string,
    accuracy: number,
    reactionTime?: number
  ) => {
    if (!user) return null;

    try {
      const current = difficulties[drillType];
      const currentDifficulty = current?.current_difficulty ?? 1;
      const accuracyHistory = [...(current?.accuracy_history || []), accuracy].slice(-10);
      const speedHistory = reactionTime 
        ? [...(current?.speed_history || []), reactionTime].slice(-10)
        : (current?.speed_history || []);

      // Calculate recommended adjustment
      let recommendedAdjustment: 'increase' | 'decrease' | 'stable' = 'stable';
      
      if (accuracyHistory.length >= 3) {
        const recentAvg = accuracyHistory.slice(-3).reduce((a, b) => a + b, 0) / 3;
        
        if (recentAvg > 85 && currentDifficulty < 10) {
          recommendedAdjustment = 'increase';
        } else if (recentAvg < 60 && currentDifficulty > 1) {
          recommendedAdjustment = 'decrease';
        }
      }

      // Calculate new difficulty
      let newDifficulty = currentDifficulty;
      if (recommendedAdjustment === 'increase') {
        newDifficulty = Math.min(10, currentDifficulty + 1);
      } else if (recommendedAdjustment === 'decrease') {
        newDifficulty = Math.max(1, currentDifficulty - 1);
      }

      const { data, error } = await supabase
        .from('tex_vision_adaptive_difficulty')
        .upsert({
          user_id: user.id,
          sport,
          drill_type: drillType,
          current_difficulty: newDifficulty,
          accuracy_history: accuracyHistory,
          speed_history: speedHistory,
          recommended_adjustment: recommendedAdjustment,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,sport,drill_type',
        })
        .select()
        .single();

      if (error) throw error;

      const updatedData = {
        ...data,
        accuracy_history: (data.accuracy_history as number[]) || [],
        speed_history: (data.speed_history as number[]) || [],
        recommended_adjustment: data.recommended_adjustment as 'increase' | 'decrease' | 'stable' | null,
      } as AdaptiveDifficultyData;

      setDifficulties(prev => ({
        ...prev,
        [drillType]: updatedData,
      }));

      return updatedData;
    } catch (error) {
      console.error('Error updating difficulty:', error);
      return null;
    }
  }, [user, sport, difficulties]);

  // Get recommended adjustment for a drill
  const getRecommendedAdjustment = useCallback((drillType: string): 'increase' | 'decrease' | 'stable' => {
    return difficulties[drillType]?.recommended_adjustment ?? 'stable';
  }, [difficulties]);

  // Check tier unlock status
  const checkTierUnlock = useCallback(async () => {
    if (!user) return null;

    try {
      // Get existing unlocks
      const { data: unlocks, error: unlocksError } = await supabase
        .from('tex_vision_unlocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport);

      if (unlocksError) throw unlocksError;

      const advancedUnlock = unlocks?.find(u => u.unlock_type === 'advanced_tier');
      const chaosUnlock = unlocks?.find(u => u.unlock_type === 'chaos_tier');

      // Get session stats for unlock calculation
      const { data: progress, error: progressError } = await supabase
        .from('tex_vision_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .maybeSingle();

      if (progressError) throw progressError;

      const totalSessions = progress?.total_sessions_completed ?? 0;

      // Get average accuracy from recent sessions
      const { data: results, error: resultsError } = await supabase
        .from('tex_vision_drill_results')
        .select('accuracy_percent, tier')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (resultsError) throw resultsError;

      const beginnerResults = (results || []).filter(r => r.tier === 'beginner');
      const advancedResults = (results || []).filter(r => r.tier === 'advanced');

      const beginnerAvgAccuracy = beginnerResults.length > 0
        ? beginnerResults
            .filter(r => r.accuracy_percent !== null)
            .reduce((sum, r) => sum + (r.accuracy_percent || 0), 0) / beginnerResults.length
        : 0;

      const advancedAvgAccuracy = advancedResults.length > 0
        ? advancedResults
            .filter(r => r.accuracy_percent !== null)
            .reduce((sum, r) => sum + (r.accuracy_percent || 0), 0) / advancedResults.length
        : 0;

      // Calculate sessions until unlock
      const meetsAdvancedSessions = totalSessions >= ADVANCED_TIER_REQUIREMENTS.sessions;
      const meetsAdvancedAccuracy = beginnerAvgAccuracy >= ADVANCED_TIER_REQUIREMENTS.min_accuracy;
      const sessionsUntilAdvanced = meetsAdvancedSessions ? 0 : ADVANCED_TIER_REQUIREMENTS.sessions - totalSessions;

      const advancedSessionCount = advancedResults.length;
      const meetsChaosSession = advancedSessionCount >= CHAOS_TIER_REQUIREMENTS.advanced_sessions;
      const meetsChaosAccuracy = advancedAvgAccuracy >= CHAOS_TIER_REQUIREMENTS.min_accuracy;
      const sessionsUntilChaos = meetsChaosSession ? 0 : CHAOS_TIER_REQUIREMENTS.advanced_sessions - advancedSessionCount;

      const status: TierUnlockStatus = {
        advanced_unlocked: !!advancedUnlock,
        chaos_unlocked: !!chaosUnlock,
        advanced_unlocked_at: advancedUnlock?.unlocked_at ?? null,
        chaos_unlocked_at: chaosUnlock?.unlocked_at ?? null,
        sessions_until_advanced: advancedUnlock ? 0 : sessionsUntilAdvanced,
        sessions_until_chaos: chaosUnlock ? 0 : sessionsUntilChaos,
      };

      // Auto-unlock if requirements met
      if (!advancedUnlock && meetsAdvancedSessions && meetsAdvancedAccuracy) {
        await unlockTier('advanced');
        status.advanced_unlocked = true;
        status.advanced_unlocked_at = new Date().toISOString();
        status.sessions_until_advanced = 0;
      }

      if (!chaosUnlock && advancedUnlock && meetsChaosSession && meetsChaosAccuracy) {
        await unlockTier('chaos');
        status.chaos_unlocked = true;
        status.chaos_unlocked_at = new Date().toISOString();
        status.sessions_until_chaos = 0;
      }

      setTierStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking tier unlock:', error);
      return null;
    }
  }, [user, sport]);

  // Unlock a tier
  const unlockTier = useCallback(async (tier: 'advanced' | 'chaos') => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tex_vision_unlocks')
        .insert({
          user_id: user.id,
          sport,
          unlock_type: `${tier}_tier`,
          unlocked_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unlocking tier:', error);
      return false;
    }
  }, [user, sport]);

  // Get difficulty settings summary
  const getDifficultySummary = useCallback(() => {
    const summary: { drill_type: string; difficulty: number; trend: string }[] = [];

    DRILL_TYPES.forEach(drillType => {
      const data = difficulties[drillType];
      const trend = data?.recommended_adjustment === 'increase' ? '↑' 
        : data?.recommended_adjustment === 'decrease' ? '↓' 
        : '→';
      
      summary.push({
        drill_type: drillType,
        difficulty: data?.current_difficulty ?? 1,
        trend,
      });
    });

    return summary;
  }, [difficulties]);

  // Initial fetch
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchDifficulties(),
        checkTierUnlock(),
      ]);
      setLoading(false);
    };

    initialize();
  }, [user, fetchDifficulties, checkTierUnlock]);

  return {
    difficulties,
    tierStatus,
    loading,
    getCurrentDifficulty,
    updateDifficulty,
    getRecommendedAdjustment,
    checkTierUnlock,
    unlockTier,
    getDifficultySummary,
    refetch: async () => {
      await Promise.all([
        fetchDifficulties(),
        checkTierUnlock(),
      ]);
    },
  };
};
