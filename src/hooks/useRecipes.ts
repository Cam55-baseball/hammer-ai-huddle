import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface RecipeIngredient {
  food_id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  ingredients: RecipeIngredient[];
  total_calories?: number;
  total_protein_g?: number;
  total_carbs_g?: number;
  total_fats_g?: number;
  total_fiber_g?: number;
  is_favorite: boolean;
  use_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  ingredients: RecipeIngredient[];
}

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateTotals = (ingredients: RecipeIngredient[]) => {
    return ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + (ing.calories || 0),
        protein: acc.protein + (ing.protein_g || 0),
        carbs: acc.carbs + (ing.carbs_g || 0),
        fats: acc.fats + (ing.fats_g || 0),
        fiber: acc.fiber + (ing.fiber_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );
  };

  const fetchRecipes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('nutrition_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const typedRecipes: Recipe[] = (data || []).map((r) => ({
        ...r,
        ingredients: Array.isArray(r.ingredients) ? (r.ingredients as unknown as RecipeIngredient[]) : [],
        is_favorite: r.is_favorite ?? false,
        use_count: r.use_count ?? 0,
      }));

      setRecipes(typedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const createRecipe = async (input: CreateRecipeInput): Promise<Recipe | null> => {
    if (!user) return null;

    const totals = calculateTotals(input.ingredients);

    try {
      const { data, error } = await supabase
        .from('nutrition_recipes')
        .insert([{
          user_id: user.id,
          name: input.name,
          description: input.description,
          servings: input.servings,
          prep_time_minutes: input.prep_time_minutes,
          cook_time_minutes: input.cook_time_minutes,
          ingredients: input.ingredients as unknown as Json,
          total_calories: Math.round(totals.calories),
          total_protein_g: Math.round(totals.protein * 10) / 10,
          total_carbs_g: Math.round(totals.carbs * 10) / 10,
          total_fats_g: Math.round(totals.fats * 10) / 10,
          total_fiber_g: Math.round(totals.fiber * 10) / 10,
        }])
        .select()
        .single();

      if (error) throw error;

      const newRecipe: Recipe = {
        ...data,
        ingredients: Array.isArray(data.ingredients) ? (data.ingredients as unknown as RecipeIngredient[]) : [],
        is_favorite: data.is_favorite ?? false,
        use_count: data.use_count ?? 0,
      };

      setRecipes((prev) => [newRecipe, ...prev]);
      toast.success('Recipe saved!');
      return newRecipe;
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast.error('Failed to save recipe');
      return null;
    }
  };

  const updateRecipe = async (id: string, input: Partial<CreateRecipeInput>): Promise<boolean> => {
    if (!user) return false;

    const updates: Record<string, unknown> = { 
      name: input.name,
      description: input.description,
      servings: input.servings,
      prep_time_minutes: input.prep_time_minutes,
      cook_time_minutes: input.cook_time_minutes,
    };
    
    if (input.ingredients) {
      const totals = calculateTotals(input.ingredients);
      updates.ingredients = input.ingredients as unknown as Json;
      updates.total_calories = Math.round(totals.calories);
      updates.total_protein_g = Math.round(totals.protein * 10) / 10;
      updates.total_carbs_g = Math.round(totals.carbs * 10) / 10;
      updates.total_fats_g = Math.round(totals.fats * 10) / 10;
      updates.total_fiber_g = Math.round(totals.fiber * 10) / 10;
    }

    try {
      const { error } = await supabase
        .from('nutrition_recipes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchRecipes();
      toast.success('Recipe updated!');
      return true;
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast.error('Failed to update recipe');
      return false;
    }
  };

  const deleteRecipe = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('nutrition_recipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast.success('Recipe deleted');
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Failed to delete recipe');
      return false;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return false;

    try {
      const { error } = await supabase
        .from('nutrition_recipes')
        .update({ is_favorite: !recipe.is_favorite })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: !r.is_favorite } : r))
      );
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  };

  const useRecipe = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return false;

      const { error } = await supabase
        .from('nutrition_recipes')
        .update({
          use_count: (recipe.use_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRecipes((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, use_count: r.use_count + 1, last_used_at: new Date().toISOString() }
            : r
        )
      );
      return true;
    } catch (error) {
      console.error('Error tracking recipe use:', error);
      return false;
    }
  };

  const scaleRecipe = (recipe: Recipe, newServings: number): RecipeIngredient[] => {
    const scaleFactor = newServings / recipe.servings;
    return recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: Math.round(ing.quantity * scaleFactor * 100) / 100,
      calories: Math.round(ing.calories * scaleFactor),
      protein_g: Math.round(ing.protein_g * scaleFactor * 10) / 10,
      carbs_g: Math.round(ing.carbs_g * scaleFactor * 10) / 10,
      fats_g: Math.round(ing.fats_g * scaleFactor * 10) / 10,
      fiber_g: ing.fiber_g ? Math.round(ing.fiber_g * scaleFactor * 10) / 10 : undefined,
    }));
  };

  return {
    recipes,
    loading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    useRecipe,
    scaleRecipe,
    refetch: fetchRecipes,
  };
}
