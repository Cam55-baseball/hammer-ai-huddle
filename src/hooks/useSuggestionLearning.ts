import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type InteractionAction = 'accepted' | 'ignored' | 'dismissed';

interface SuggestionInteraction {
  food_name: string;
  action: InteractionAction;
  count: number;
}

export function useSuggestionLearning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all interactions for the user
  const { data: interactions = [] } = useQuery({
    queryKey: ['suggestionInteractions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('nutrition_suggestion_interactions')
        .select('nutrient_key, food_name, action')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Array<{ nutrient_key: string; food_name: string; action: string }>;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const trackInteraction = useCallback(async (
    nutrientKey: string,
    foodName: string,
    action: InteractionAction,
  ) => {
    if (!user) return;
    await (supabase as any)
      .from('nutrition_suggestion_interactions')
      .insert({
        user_id: user.id,
        nutrient_key: nutrientKey,
        food_name: foodName,
        action,
      });
    queryClient.invalidateQueries({ queryKey: ['suggestionInteractions'] });
  }, [user, queryClient]);

  const trackEffectiveness = useCallback(async (
    nutrientKey: string,
    foodName: string,
    scoreDelta: number,
  ) => {
    if (!user) return;
    // Update the most recent accepted interaction with effectiveness
    const { data: recent } = await supabase
      .from('nutrition_suggestion_interactions' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('nutrient_key', nutrientKey)
      .eq('food_name', foodName)
      .eq('action', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      await supabase
        .from('nutrition_suggestion_interactions' as any)
        .update({ effectiveness_delta: scoreDelta } as any)
        .eq('id', (recent[0] as any).id);
    }
  }, [user]);

  // Re-rank foods for a nutrient based on interaction history
  const getPersonalizedRanking = useCallback((
    nutrientKey: string,
    foods: Array<{ name: string; [k: string]: any }>,
  ) => {
    const relevant = interactions.filter(i => i.nutrient_key === nutrientKey);

    // Build per-food scores
    const foodScores = new Map<string, number>();
    for (const i of relevant) {
      const current = foodScores.get(i.food_name) || 0;
      if (i.action === 'accepted') foodScores.set(i.food_name, current + 2);
      else if (i.action === 'dismissed') foodScores.set(i.food_name, current - 3);
      else if (i.action === 'ignored') foodScores.set(i.food_name, current - 1);
    }

    // Suppress foods with 3+ dismissals
    const dismissCounts = new Map<string, number>();
    for (const i of relevant) {
      if (i.action === 'dismissed') {
        dismissCounts.set(i.food_name, (dismissCounts.get(i.food_name) || 0) + 1);
      }
    }

    return foods
      .filter(f => (dismissCounts.get(f.name) || 0) < 3)
      .sort((a, b) => {
        const scoreA = foodScores.get(a.name) || 0;
        const scoreB = foodScores.get(b.name) || 0;
        return scoreB - scoreA;
      });
  }, [interactions]);

  return {
    trackInteraction,
    trackEffectiveness,
    getPersonalizedRanking,
    interactions,
  };
}
