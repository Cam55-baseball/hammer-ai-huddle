import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodSearchResult } from './useFoodSearch';

interface UseRecentFoodsReturn {
  recentFoods: FoodSearchResult[];
  favoriteFoods: FoodSearchResult[];
  loading: boolean;
  trackFoodUsage: (foodId: string) => Promise<void>;
  toggleFavorite: (foodId: string) => Promise<void>;
  isFavorite: (foodId: string) => boolean;
  refresh: () => Promise<void>;
}

export function useRecentFoods(): UseRecentFoodsReturn {
  const [recentFoods, setRecentFoods] = useState<FoodSearchResult[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodSearchResult[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFoods = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch favorites (up to 5)
      const { data: favoritesData } = await supabase
        .from('user_food_history')
        .select(`
          food_id,
          is_favorite,
          nutrition_food_database (
            id, name, brand, serving_size, serving_size_grams,
            calories_per_serving, protein_g, carbs_g, fats_g,
            fiber_g, sugar_g, sodium_mg
          )
        `)
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('use_count', { ascending: false })
        .limit(5);

      // Fetch recent (up to 5, excluding favorites)
      const { data: recentData } = await supabase
        .from('user_food_history')
        .select(`
          food_id,
          is_favorite,
          nutrition_food_database (
            id, name, brand, serving_size, serving_size_grams,
            calories_per_serving, protein_g, carbs_g, fats_g,
            fiber_g, sugar_g, sodium_mg
          )
        `)
        .eq('user_id', user.id)
        .eq('is_favorite', false)
        .order('last_used_at', { ascending: false })
        .limit(5);

      const mapToFoodResult = (item: any): FoodSearchResult | null => {
        const food = item.nutrition_food_database;
        if (!food) return null;
        return {
          id: food.id,
          name: food.name,
          brand: food.brand,
          servingSize: food.serving_size,
          servingSizeGrams: food.serving_size_grams,
          caloriesPerServing: food.calories_per_serving,
          protein: food.protein_g,
          carbs: food.carbs_g,
          fats: food.fats_g,
          fiber: food.fiber_g,
          sugar: food.sugar_g,
          sodium: food.sodium_mg,
        };
      };

      const favorites = (favoritesData || [])
        .map(mapToFoodResult)
        .filter((f): f is FoodSearchResult => f !== null);
      
      const recent = (recentData || [])
        .map(mapToFoodResult)
        .filter((f): f is FoodSearchResult => f !== null);

      setFavoriteFoods(favorites);
      setRecentFoods(recent);
      setFavoriteIds(new Set(favorites.map(f => f.id)));
    } catch (err) {
      console.error('Error fetching food history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const trackFoodUsage = useCallback(async (foodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert: if exists, increment count and update timestamp; otherwise insert
      const { data: existing } = await supabase
        .from('user_food_history')
        .select('id, use_count')
        .eq('user_id', user.id)
        .eq('food_id', foodId)
        .single();

      if (existing) {
        await supabase
          .from('user_food_history')
          .update({
            use_count: (existing.use_count || 1) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_food_history')
          .insert({
            user_id: user.id,
            food_id: foodId,
            use_count: 1,
            last_used_at: new Date().toISOString(),
          });
      }

      // Refresh the lists
      await fetchFoods();
    } catch (err) {
      console.error('Error tracking food usage:', err);
    }
  }, [fetchFoods]);

  const toggleFavorite = useCallback(async (foodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('user_food_history')
        .select('id, is_favorite')
        .eq('user_id', user.id)
        .eq('food_id', foodId)
        .single();

      if (existing) {
        await supabase
          .from('user_food_history')
          .update({ is_favorite: !existing.is_favorite })
          .eq('id', existing.id);
      } else {
        // Create new entry as favorite
        await supabase
          .from('user_food_history')
          .insert({
            user_id: user.id,
            food_id: foodId,
            is_favorite: true,
            use_count: 0,
          });
      }

      // Refresh the lists
      await fetchFoods();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }, [fetchFoods]);

  const isFavorite = useCallback((foodId: string) => {
    return favoriteIds.has(foodId);
  }, [favoriteIds]);

  return {
    recentFoods,
    favoriteFoods,
    loading,
    trackFoodUsage,
    toggleFavorite,
    isFavorite,
    refresh: fetchFoods,
  };
}
