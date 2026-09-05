import { useCallback, useMemo } from 'react';
import { useFavoriteMeals, type FavoriteMeal, type NewFavoriteMeal } from '@/hooks/useFavoriteMeals';
import { useRecentFoods } from '@/hooks/useRecentFoods';

/**
 * ONE favorites list for the whole app.
 *
 * Before this hook there were two starred lists sitting next to each other:
 *  - "Favorite meals" read `vault_favorite_meals` (a whole logged meal, and it
 *    can also carry drinks through `hydration_oz`).
 *  - "Favorite foods" read `user_food_history.is_favorite` joined to
 *    `nutrition_food_database` (a single starred food item).
 *
 * Nothing is migrated — both sources are still read, and both are shown in one
 * list so an athlete sees a single "Favorites" everywhere. New favorites saved
 * from a logging surface go to `vault_favorite_meals`, which is the only table
 * that can hold a food + fluid combination.
 */
export interface UnifiedFavorite {
  key: string;
  source: 'meal' | 'food';
  id: string;
  name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  hydration_oz: number | null;
  meal_type: string | null;
  servingSize?: string | null;
  /** The original favorite-meal row, when this came from vault_favorite_meals. */
  meal?: FavoriteMeal;
}

export function useUnifiedFavorites() {
  const { favorites, loading: mealsLoading, saveFavorite, removeFavorite, markUsed } = useFavoriteMeals();
  const {
    favoriteFoods,
    loading: foodsLoading,
    toggleFavorite,
    trackFoodUsage,
  } = useRecentFoods();

  const items = useMemo<UnifiedFavorite[]>(() => {
    const meals: UnifiedFavorite[] = favorites.map((f) => ({
      key: `meal:${f.id}`,
      source: 'meal',
      id: f.id,
      name: f.meal_name,
      calories: f.calories,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fats_g: f.fats_g,
      hydration_oz: f.hydration_oz,
      meal_type: f.meal_type,
      meal: f,
    }));

    const foods: UnifiedFavorite[] = favoriteFoods.map((f) => ({
      key: `food:${f.id}`,
      source: 'food',
      id: f.id,
      name: f.brand ? `${f.name} (${f.brand})` : f.name,
      calories: f.caloriesPerServing ?? null,
      protein_g: f.protein ?? null,
      carbs_g: f.carbs ?? null,
      fats_g: f.fats ?? null,
      hydration_oz: null,
      meal_type: null,
      servingSize: f.servingSize ?? null,
    }));

    return [...meals, ...foods];
  }, [favorites, favoriteFoods]);

  /** Record the pick against whichever source it came from. */
  const markPicked = useCallback(
    async (fav: UnifiedFavorite) => {
      if (fav.source === 'meal' && fav.meal) await markUsed(fav.meal);
      if (fav.source === 'food') await trackFoodUsage(fav.id);
    },
    [markUsed, trackFoodUsage],
  );

  const remove = useCallback(
    async (fav: UnifiedFavorite) => {
      if (fav.source === 'meal') return removeFavorite(fav.id);
      await toggleFavorite(fav.id);
      return { success: true };
    },
    [removeFavorite, toggleFavorite],
  );

  return {
    favorites: items,
    loading: mealsLoading || foodsLoading,
    /** New favorites always land in vault_favorite_meals (food + fluid capable). */
    saveFavorite: saveFavorite as (meal: NewFavoriteMeal) => Promise<{ success: boolean; error?: string }>,
    markPicked,
    remove,
  };
}
