import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, addDays } from 'date-fns';

export interface PlannedMeal {
  id: string;
  planned_date: string;
  meal_type: string;
  time_slot: string;
  meal_name: string;
  food_items: any[];
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fats_g: number;
  is_completed: boolean;
  notes?: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  meals: PlannedMeal[];
  is_favorite: boolean;
  created_at: string;
}

export interface DayPlan {
  date: string;
  meals: {
    breakfast: PlannedMeal[];
    lunch: PlannedMeal[];
    dinner: PlannedMeal[];
    snack: PlannedMeal[];
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export function useMealPlanning() {
  const [userId, setUserId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);
  const [loading, setLoading] = useState(true);

  const fetchWeekPlan = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      
      const { data: rawData, error } = await supabase
        .from('vault_meal_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('planned_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('planned_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('planned_date', { ascending: true });

      if (error) throw error;

      const data = (rawData || []).map(m => ({
        ...m,
        food_items: Array.isArray(m.food_items) ? m.food_items : [],
      })) as PlannedMeal[];

      // Organize meals by day and time slot
      const days: DayPlan[] = [];
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
        const dayMeals = data.filter(m => m.planned_date === date);
        
        const meals = {
          breakfast: dayMeals.filter(m => m.time_slot === 'breakfast' || m.meal_type === 'breakfast'),
          lunch: dayMeals.filter(m => m.time_slot === 'lunch' || m.meal_type === 'lunch'),
          dinner: dayMeals.filter(m => m.time_slot === 'dinner' || m.meal_type === 'dinner'),
          snack: dayMeals.filter(m => m.time_slot === 'snack' || m.meal_type === 'snack'),
        };

        const totals = dayMeals.reduce((acc, m) => ({
          calories: acc.calories + (m.estimated_calories || 0),
          protein: acc.protein + (m.estimated_protein_g || 0),
          carbs: acc.carbs + (m.estimated_carbs_g || 0),
          fats: acc.fats + (m.estimated_fats_g || 0),
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        days.push({ date, meals, totals });
      }

      setWeekPlan(days);
    } catch (error) {
      console.error('Error fetching week plan:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart]);

  const fetchTemplates = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates((data || []).map(t => ({
        ...t,
        meals: Array.isArray(t.meals) ? t.meals as PlannedMeal[] : []
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeekPlan();
    fetchTemplates();
  }, [fetchWeekPlan, fetchTemplates]);

  const addMeal = async (meal: Omit<PlannedMeal, 'id'>) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('vault_meal_plans')
        .insert({
          user_id: userId,
          planned_date: meal.planned_date,
          meal_type: meal.meal_type,
          time_slot: meal.time_slot,
          meal_name: meal.meal_name,
          food_items: meal.food_items,
          estimated_calories: meal.estimated_calories,
          estimated_protein_g: meal.estimated_protein_g,
          estimated_carbs_g: meal.estimated_carbs_g,
          estimated_fats_g: meal.estimated_fats_g,
          notes: meal.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWeekPlan();
      toast.success('Meal added to plan');
      return data;
    } catch (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to add meal');
      return null;
    }
  };

  const updateMeal = async (mealId: string, updates: Partial<PlannedMeal>) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('vault_meal_plans')
        .update(updates)
        .eq('id', mealId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchWeekPlan();
      return true;
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Failed to update meal');
      return false;
    }
  };

  const moveMeal = async (mealId: string, newDate: string, newTimeSlot: string) => {
    return updateMeal(mealId, { 
      planned_date: newDate, 
      time_slot: newTimeSlot,
      meal_type: newTimeSlot 
    });
  };

  const deleteMeal = async (mealId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('vault_meal_plans')
        .delete()
        .eq('id', mealId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchWeekPlan();
      toast.success('Meal removed');
      return true;
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to remove meal');
      return false;
    }
  };

  const saveAsTemplate = async (name: string) => {
    if (!userId) return null;

    try {
      // Get all meals for the current week
      const allMeals = weekPlan.flatMap(day => [
        ...day.meals.breakfast,
        ...day.meals.lunch,
        ...day.meals.dinner,
        ...day.meals.snack,
      ]);

      const { data, error } = await supabase
        .from('meal_templates')
        .insert({
          user_id: userId,
          name,
          meals: allMeals,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTemplates();
      toast.success('Template saved');
      return data;
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
      return null;
    }
  };

  const applyTemplate = async (template: MealTemplate) => {
    if (!userId || !template.meals?.length) return false;

    try {
      // Clear current week meals first
      const weekEnd = addDays(weekStart, 6);
      await supabase
        .from('vault_meal_plans')
        .delete()
        .eq('user_id', userId)
        .gte('planned_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('planned_date', format(weekEnd, 'yyyy-MM-dd'));

      // Apply template meals with adjusted dates
      const newMeals = template.meals.map((meal, index) => {
        const dayIndex = index % 7;
        const newDate = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
        return {
          user_id: userId,
          planned_date: newDate,
          meal_type: meal.meal_type,
          time_slot: meal.time_slot,
          meal_name: meal.meal_name,
          food_items: meal.food_items,
          estimated_calories: meal.estimated_calories,
          estimated_protein_g: meal.estimated_protein_g,
          estimated_carbs_g: meal.estimated_carbs_g,
          estimated_fats_g: meal.estimated_fats_g,
        };
      });

      const { error } = await supabase
        .from('vault_meal_plans')
        .insert(newMeals);

      if (error) throw error;

      await fetchWeekPlan();
      toast.success('Template applied');
      return true;
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
      return false;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchTemplates();
      toast.success('Template deleted');
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
      return false;
    }
  };

  const toggleTemplateFavorite = async (templateId: string, isFavorite: boolean) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('meal_templates')
        .update({ is_favorite: isFavorite })
        .eq('id', templateId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  };

  const goToPreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return {
    weekStart,
    weekPlan,
    templates,
    loading,
    addMeal,
    updateMeal,
    moveMeal,
    deleteMeal,
    saveAsTemplate,
    applyTemplate,
    deleteTemplate,
    toggleTemplateFavorite,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh: fetchWeekPlan,
  };
}
