import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Lightweight favorites hook.
 *
 * `useVault()` also exposes favorites, but it loads the entire vault. Meal
 * logging surfaces need only this table, so they read it directly here.
 */
export interface FavoriteMeal {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  hydration_oz: number | null;
  meal_type: string | null;
  usage_count: number | null;
}

export type NewFavoriteMeal = Omit<FavoriteMeal, 'id' | 'usage_count'>;

const CHANGED_EVENT = 'favorite-meals:changed';

export function useFavoriteMeals() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('vault_favorite_meals')
      .select('id, meal_name, calories, protein_g, carbs_g, fats_g, hydration_oz, meal_type, usage_count')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false })
      .limit(24);
    if (error) {
      console.error('[useFavoriteMeals] load failed', error);
      setFavorites([]);
    } else {
      setFavorites((data || []) as FavoriteMeal[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, [refresh]);

  const saveFavorite = useCallback(
    async (meal: NewFavoriteMeal): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: 'You need to be signed in.' };
      const { error } = await supabase.from('vault_favorite_meals').insert({
        user_id: user.id,
        ...meal,
      });
      if (error) {
        console.error('[useFavoriteMeals] save failed', error);
        return { success: false, error: error.message };
      }
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
      return { success: true };
    },
    [user],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      if (!user) return { success: false };
      const { error } = await supabase
        .from('vault_favorite_meals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('[useFavoriteMeals] delete failed', error);
        return { success: false };
      }
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
      return { success: true };
    },
    [user],
  );

  const markUsed = useCallback(
    async (fav: FavoriteMeal) => {
      if (!user) return;
      await supabase
        .from('vault_favorite_meals')
        .update({
          usage_count: (fav.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', fav.id)
        .eq('user_id', user.id);
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
    },
    [user],
  );

  return { favorites, loading, refresh, saveFavorite, removeFavorite, markUsed };
}
