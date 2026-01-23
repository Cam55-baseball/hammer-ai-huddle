import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PersonalBest {
  drill_type: string;
  tier: string;
  best_accuracy_percent: number | null;
  best_reaction_time_ms: number | null;
  best_streak: number | null;
  achieved_at: string;
}

export interface PersonalBestResult {
  isNewAccuracyRecord: boolean;
  isNewReactionRecord: boolean;
  isNewStreakRecord: boolean;
  previousBest: PersonalBest | null;
}

export function usePersonalBests() {
  const { user } = useAuth();
  const [personalBests, setPersonalBests] = useState<Record<string, PersonalBest>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all personal bests for the user
  const fetchAllPersonalBests = useCallback(async () => {
    if (!user?.id) {
      setPersonalBests({});
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tex_vision_personal_bests')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const bests: Record<string, PersonalBest> = {};
      data?.forEach((pb) => {
        const key = `${pb.drill_type}_${pb.tier}`;
        bests[key] = {
          drill_type: pb.drill_type,
          tier: pb.tier,
          best_accuracy_percent: pb.best_accuracy_percent,
          best_reaction_time_ms: pb.best_reaction_time_ms,
          best_streak: pb.best_streak,
          achieved_at: pb.achieved_at,
        };
      });
      setPersonalBests(bests);
    } catch (error) {
      console.error('Error fetching personal bests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAllPersonalBests();
  }, [fetchAllPersonalBests]);

  // Get personal best for a specific drill
  const getPersonalBest = useCallback(
    (drillType: string, tier: string): PersonalBest | null => {
      const key = `${drillType}_${tier}`;
      return personalBests[key] || null;
    },
    [personalBests]
  );

  // Check and update personal best after drill completion
  const checkAndUpdatePersonalBest = useCallback(
    async (
      drillType: string,
      tier: string,
      result: {
        accuracyPercent?: number;
        reactionTimeMs?: number;
        streak?: number;
      }
    ): Promise<PersonalBestResult> => {
      if (!user?.id) {
        return {
          isNewAccuracyRecord: false,
          isNewReactionRecord: false,
          isNewStreakRecord: false,
          previousBest: null,
        };
      }

      const key = `${drillType}_${tier}`;
      const currentPB = personalBests[key];

      let isNewAccuracyRecord = false;
      let isNewReactionRecord = false;
      let isNewStreakRecord = false;

      // Check accuracy record
      if (
        result.accuracyPercent !== undefined &&
        (!currentPB?.best_accuracy_percent ||
          result.accuracyPercent > currentPB.best_accuracy_percent)
      ) {
        isNewAccuracyRecord = true;
      }

      // Check reaction time record (lower is better)
      if (
        result.reactionTimeMs !== undefined &&
        result.reactionTimeMs > 0 &&
        (!currentPB?.best_reaction_time_ms ||
          result.reactionTimeMs < currentPB.best_reaction_time_ms)
      ) {
        isNewReactionRecord = true;
      }

      // Check streak record
      if (
        result.streak !== undefined &&
        (!currentPB?.best_streak || result.streak > currentPB.best_streak)
      ) {
        isNewStreakRecord = true;
      }

      // If any new record, upsert to database
      if (isNewAccuracyRecord || isNewReactionRecord || isNewStreakRecord) {
        try {
          const updateData: Record<string, unknown> = {
            user_id: user.id,
            drill_type: drillType,
            tier,
            achieved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (isNewAccuracyRecord && result.accuracyPercent !== undefined) {
            updateData.best_accuracy_percent = result.accuracyPercent;
          } else if (currentPB?.best_accuracy_percent) {
            updateData.best_accuracy_percent = currentPB.best_accuracy_percent;
          }

          if (isNewReactionRecord && result.reactionTimeMs !== undefined) {
            updateData.best_reaction_time_ms = result.reactionTimeMs;
          } else if (currentPB?.best_reaction_time_ms) {
            updateData.best_reaction_time_ms = currentPB.best_reaction_time_ms;
          }

          if (isNewStreakRecord && result.streak !== undefined) {
            updateData.best_streak = result.streak;
          } else if (currentPB?.best_streak) {
            updateData.best_streak = currentPB.best_streak;
          }

          // First try to update existing record
          const { data: existingData } = await supabase
            .from('tex_vision_personal_bests')
            .select('id')
            .eq('user_id', user.id)
            .eq('drill_type', drillType)
            .eq('tier', tier)
            .maybeSingle();

          let error;
          if (existingData?.id) {
            // Update existing
            const result = await supabase
              .from('tex_vision_personal_bests')
              .update({
                best_accuracy_percent: updateData.best_accuracy_percent as number | undefined,
                best_reaction_time_ms: updateData.best_reaction_time_ms as number | undefined,
                best_streak: updateData.best_streak as number | undefined,
                achieved_at: updateData.achieved_at as string,
                updated_at: updateData.updated_at as string,
              })
              .eq('id', existingData.id);
            error = result.error;
          } else {
            // Insert new
            const result = await supabase
              .from('tex_vision_personal_bests')
              .insert({
                user_id: user.id,
                drill_type: drillType,
                tier,
                best_accuracy_percent: updateData.best_accuracy_percent as number | undefined,
                best_reaction_time_ms: updateData.best_reaction_time_ms as number | undefined,
                best_streak: updateData.best_streak as number | undefined,
                achieved_at: updateData.achieved_at as string,
                updated_at: updateData.updated_at as string,
              });
            error = result.error;
          }

          if (error) throw error;

          // Update local state
          setPersonalBests((prev) => ({
            ...prev,
            [key]: {
              drill_type: drillType,
              tier,
              best_accuracy_percent: updateData.best_accuracy_percent as number | null,
              best_reaction_time_ms: updateData.best_reaction_time_ms as number | null,
              best_streak: updateData.best_streak as number | null,
              achieved_at: updateData.achieved_at as string,
            },
          }));
        } catch (error) {
          console.error('Error updating personal best:', error);
        }
      }

      return {
        isNewAccuracyRecord,
        isNewReactionRecord,
        isNewStreakRecord,
        previousBest: currentPB || null,
      };
    },
    [user?.id, personalBests]
  );

  return {
    personalBests,
    isLoading,
    getPersonalBest,
    checkAndUpdatePersonalBest,
    refreshPersonalBests: fetchAllPersonalBests,
  };
}
